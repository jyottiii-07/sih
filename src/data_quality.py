"""
Real-Data Quality Checking and Telemetry Audit Engine.
Problem Statement ID: 26064

Audits raw incoming sensor telemetry without silently mutating or deleting records.
Classifies each reading into one of three standardized quality states:
    - VALID: Fully compliant telemetry.
    - WARNING: Potential quality concern (sampling jitter, minor spatial jump, possible spike).
    - INVALID: Critical failure (missing fields, NaN/Inf, out-of-range sensor saturation).

Checks:
    1. Schema completeness and numeric types
    2. Finite value validation (rejection of NaN and Inf)
    3. Monotonic timestamp progression and duplicate timestamp detection
    4. Irregular sampling interval (dt variation against nominal rate)
    5. Physical sensor range bounds
    6. Sensor flatline / dropout detection (consecutive identical flux values)
    7. Coordinate discontinuity / impossible vehicle velocity
    8. Abrupt localized magnetic field spikes
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd

from src.config import load_config


REQUIRED_SENSOR_COLUMNS = ["sensor_id", "timestamp", "x", "y", "bx", "by", "bz"]


class DataQualityAudit:
    """
    Evaluates sensor telemetry data quality, tags records with diagnostic flags,
    and produces an auditable summary report.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or load_config()
        sensor_cfg = self.config.get("sensor", {})
        qc_cfg = self.config.get("quality_checks", {})

        self.nominal_rate_hz = sensor_cfg.get("nominal_sampling_rate_hz", 1.0)
        self.nominal_dt = 1.0 / self.nominal_rate_hz if self.nominal_rate_hz > 0 else 1.0
        self.sensor_range_min = sensor_cfg.get("sensor_range_min", -100.0)
        self.sensor_range_max = sensor_cfg.get("sensor_range_max", 100.0)
        self.max_velocity_mps = sensor_cfg.get("max_plausible_velocity_mps", 5.0)

        self.max_dt_ratio_warning = qc_cfg.get("max_dt_ratio_warning", 2.0)
        self.max_spike_sigma = qc_cfg.get("max_spike_sigma", 5.0)
        self.min_flatline_samples = qc_cfg.get("min_flatline_samples", 5)

    def audit_dataframe(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Performs comprehensive quality assessment on a DataFrame of sensor readings.
        
        Args:
            df: Raw or partially processed DataFrame.
            
        Returns:
            Tuple of:
                - Annotated DataFrame with added columns:
                    'quality_state': 'VALID' | 'WARNING' | 'INVALID'
                    'quality_flags': List of diagnostic issue tags
                - Audit summary dictionary containing error counts and statistics.
        """
        df_out = df.copy()
        n_samples = len(df_out)

        quality_states = ["VALID"] * n_samples
        quality_flags: List[List[str]] = [[] for _ in range(n_samples)]

        issues_summary = {
            "total_samples": n_samples,
            "valid_count": 0,
            "warning_count": 0,
            "invalid_count": 0,
            "missing_fields": 0,
            "non_finite_values": 0,
            "duplicate_timestamps": 0,
            "out_of_order_timestamps": 0,
            "irregular_sampling_intervals": 0,
            "sensor_range_violations": 0,
            "sensor_dropouts_flatlines": 0,
            "coordinate_discontinuities": 0,
            "magnetic_spikes": 0,
        }

        # 1. Missing required columns
        missing_cols = [c for c in REQUIRED_SENSOR_COLUMNS if c not in df_out.columns]
        if missing_cols:
            for i in range(n_samples):
                quality_states[i] = "INVALID"
                quality_flags[i].append(f"MISSING_COLUMNS_{missing_cols}")
            issues_summary["missing_fields"] += n_samples
            df_out["quality_state"] = quality_states
            df_out["quality_flags"] = quality_flags
            issues_summary["invalid_count"] = n_samples
            return df_out, issues_summary

        # 2. Non-finite values (NaN / Inf)
        for col in ["x", "y", "bx", "by", "bz"]:
            vals = pd.to_numeric(df_out[col], errors="coerce").values
            bad_mask = ~np.isfinite(vals)
            for idx in np.where(bad_mask)[0]:
                quality_states[idx] = "INVALID"
                quality_flags[idx].append(f"NON_FINITE_VALUE_{col.upper()}")
                issues_summary["non_finite_values"] += 1

        # 3. Sensor range violations
        for col in ["bx", "by", "bz"]:
            vals = pd.to_numeric(df_out[col], errors="coerce").fillna(0.0).values
            out_of_range = (vals < self.sensor_range_min) | (vals > self.sensor_range_max)
            for idx in np.where(out_of_range)[0]:
                quality_states[idx] = "INVALID"
                quality_flags[idx].append(f"RANGE_VIOLATION_{col.upper()}")
                issues_summary["sensor_range_violations"] += 1

        # 4. Timestamp analysis (parse, duplicate check, monotonicity, dt intervals)
        try:
            parsed_dt = pd.to_datetime(df_out["timestamp"])
            timestamps_sec = (parsed_dt - pd.Timestamp("1970-01-01")).dt.total_seconds().values

            # Duplicate timestamps
            dup_mask = df_out.duplicated(subset=["timestamp"], keep=False).values
            for idx in np.where(dup_mask)[0]:
                if quality_states[idx] != "INVALID":
                    quality_states[idx] = "WARNING"
                quality_flags[idx].append("DUPLICATE_TIMESTAMP")
                issues_summary["duplicate_timestamps"] += 1

            # Monotonicity check
            dt_diffs = np.diff(timestamps_sec, prepend=timestamps_sec[0])
            for i in range(1, n_samples):
                if dt_diffs[i] < 0:
                    quality_states[i] = "INVALID"
                    quality_flags[i].append("TIMESTAMP_OUT_OF_ORDER")
                    issues_summary["out_of_order_timestamps"] += 1
                elif dt_diffs[i] == 0:
                    pass  # already flagged duplicate
                elif dt_diffs[i] > (self.nominal_dt * self.max_dt_ratio_warning) or dt_diffs[i] < (self.nominal_dt / self.max_dt_ratio_warning):
                    if quality_states[i] == "VALID":
                        quality_states[i] = "WARNING"
                    quality_flags[i].append(f"IRREGULAR_SAMPLING_INTERVAL_DT_{dt_diffs[i]:.2f}s")
                    issues_summary["irregular_sampling_intervals"] += 1

        except Exception as e:
            for i in range(n_samples):
                quality_states[i] = "INVALID"
                quality_flags[i].append(f"TIMESTAMP_PARSE_ERROR_{e}")
            issues_summary["invalid_count"] = n_samples
            df_out["quality_state"] = quality_states
            df_out["quality_flags"] = quality_flags
            return df_out, issues_summary

        # 5. Flatline / Sensor Dropout detection
        # Check consecutive identical readings
        bx_vals = df_out["bx"].values
        by_vals = df_out["by"].values
        bz_vals = df_out["bz"].values
        repeat_count = 1
        for i in range(1, n_samples):
            if bx_vals[i] == bx_vals[i - 1] and by_vals[i] == by_vals[i - 1] and bz_vals[i] == bz_vals[i - 1]:
                repeat_count += 1
                if repeat_count >= self.min_flatline_samples:
                    if quality_states[i] != "INVALID":
                        quality_states[i] = "WARNING"
                    quality_flags[i].append(f"SENSOR_FLATLINE_DROPOUT_RUN_{repeat_count}")
                    issues_summary["sensor_dropouts_flatlines"] += 1
            else:
                repeat_count = 1

        # 6. Coordinate discontinuity (impossible vehicle velocity)
        x_vals = df_out["x"].values
        y_vals = df_out["y"].values
        for i in range(1, n_samples):
            dt_step = dt_diffs[i]
            if dt_step > 0:
                dist_step = np.sqrt((x_vals[i] - x_vals[i - 1]) ** 2 + (y_vals[i] - y_vals[i - 1]) ** 2)
                apparent_velocity = dist_step / dt_step
                if apparent_velocity > self.max_velocity_mps:
                    if quality_states[i] != "INVALID":
                        quality_states[i] = "WARNING"
                    quality_flags[i].append(f"COORDINATE_DISCONTINUITY_{apparent_velocity:.1f}mps")
                    issues_summary["coordinate_discontinuities"] += 1

        # 7. Magnetic field spike detection (abrupt multi-sigma jump relative to local median)
        mag_sig = np.sqrt(bx_vals**2 + by_vals**2 + bz_vals**2)
        if n_samples >= 5:
            rolling_med = pd.Series(mag_sig).rolling(window=7, center=True, min_periods=3).median().bfill().ffill()
            diff_from_med = np.abs(mag_sig - rolling_med)
            local_mad = pd.Series(diff_from_med).rolling(window=15, center=True, min_periods=3).median().bfill().ffill()
            spike_threshold = np.maximum(local_mad * self.max_spike_sigma * 1.4826, 0.05)

            spike_mask = diff_from_med > spike_threshold
            for idx in np.where(spike_mask)[0]:
                if quality_states[idx] != "INVALID":
                    quality_states[idx] = "WARNING"
                quality_flags[idx].append("MAGNETIC_FIELD_SPIKE")
                issues_summary["magnetic_spikes"] += 1

        # Tabulate counts
        issues_summary["valid_count"] = sum(1 for s in quality_states if s == "VALID")
        issues_summary["warning_count"] = sum(1 for s in quality_states if s == "WARNING")
        issues_summary["invalid_count"] = sum(1 for s in quality_states if s == "INVALID")

        df_out["quality_state"] = quality_states
        df_out["quality_flags"] = quality_flags
        return df_out, issues_summary


def audit_sensor_data(
    data: Union[pd.DataFrame, List[Dict[str, Any]], Dict[str, Any], str],
    config: Optional[Dict[str, Any]] = None,
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Functional convenience wrapper for DataQualityAudit."""
    from src.preprocessing import unpack_sensor_payload
    unpacked = unpack_sensor_payload(data)
    if isinstance(unpacked, dict):
        df = pd.DataFrame([unpacked])
    elif isinstance(unpacked, list):
        df = pd.DataFrame(unpacked)
    elif isinstance(unpacked, pd.DataFrame):
        df = unpacked
    else:
        df = pd.DataFrame(data)
    auditor = DataQualityAudit(config)
    return auditor.audit_dataframe(df)
