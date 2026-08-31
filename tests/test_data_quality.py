"""
Tests for Real-Data Quality Checking Engine.
Problem Statement ID: 26064
"""

import pytest
import numpy as np
import pandas as pd

from src.data_quality import DataQualityAudit, audit_sensor_data


def test_quality_audit_valid_dataset():
    """Verify clean telemetry receives 100% VALID quality state."""
    df_clean = pd.DataFrame({
        "sensor_id": ["SFS-001"] * 10,
        "timestamp": [f"2026-08-27T10:00:0{i}" for i in range(10)],
        "x": [float(i) for i in range(10)],
        "y": [float(i) * 0.5 for i in range(10)],
        "bx": [0.18 + i * 0.001 for i in range(10)],
        "by": [0.17 + i * 0.001 for i in range(10)],
        "bz": [0.35 + i * 0.001 for i in range(10)],
    })
    audited_df, summary = audit_sensor_data(df_clean)

    assert summary["total_samples"] == 10
    assert summary["valid_count"] == 10
    assert summary["warning_count"] == 0
    assert summary["invalid_count"] == 0
    assert (audited_df["quality_state"] == "VALID").all()


def test_quality_audit_non_finite_nan_inf():
    """Verify NaN and Inf are detected and classified as INVALID without dropping rows."""
    df_bad = pd.DataFrame({
        "sensor_id": ["SFS-001", "SFS-001"],
        "timestamp": ["2026-08-27T10:00:00", "2026-08-27T10:00:01"],
        "x": [5.0, 6.0],
        "y": [5.0, 5.0],
        "bx": [0.18, float("nan")],
        "by": [0.17, 0.17],
        "bz": [float("inf"), 0.35],
    })
    audited_df, summary = audit_sensor_data(df_bad)

    assert len(audited_df) == 2  # rows preserved!
    assert summary["invalid_count"] == 2
    assert summary["non_finite_values"] == 2
    assert audited_df["quality_state"].iloc[0] == "INVALID"
    assert audited_df["quality_state"].iloc[1] == "INVALID"


def test_quality_audit_duplicate_and_irregular_timestamps():
    """Verify duplicate and irregular timestamps trigger WARNING state."""
    df_ts = pd.DataFrame({
        "sensor_id": ["SFS-001"] * 4,
        "timestamp": [
            "2026-08-27T10:00:00",
            "2026-08-27T10:00:00",  # duplicate!
            "2026-08-27T10:00:01",
            "2026-08-27T10:00:15",  # 14s gap -> irregular!
        ],
        "x": [1.0, 1.1, 2.0, 3.0],
        "y": [1.0, 1.0, 1.0, 1.0],
        "bx": [0.18, 0.18, 0.18, 0.18],
        "by": [0.17, 0.17, 0.17, 0.17],
        "bz": [0.35, 0.35, 0.35, 0.35],
    })
    audited_df, summary = audit_sensor_data(df_ts)

    assert summary["duplicate_timestamps"] >= 1
    assert summary["irregular_sampling_intervals"] >= 1
    # Check that duplicates and gap get tagged
    flags_row0 = audited_df["quality_flags"].iloc[0]
    flags_row1 = audited_df["quality_flags"].iloc[1]
    flags_row3 = audited_df["quality_flags"].iloc[3]
    assert "DUPLICATE_TIMESTAMP" in flags_row0 or "DUPLICATE_TIMESTAMP" in flags_row1
    assert any("IRREGULAR_SAMPLING_INTERVAL" in f for f in flags_row3)


def test_quality_audit_sensor_flatline():
    """Verify consecutive identical sensor values trigger flatline WARNING."""
    df_flat = pd.DataFrame({
        "sensor_id": ["SFS-001"] * 8,
        "timestamp": [f"2026-08-27T10:00:0{i}" for i in range(8)],
        "x": [float(i) for i in range(8)],
        "y": [0.0] * 8,
        "bx": [0.1845] * 8,  # flatlined!
        "by": [0.1725] * 8,
        "bz": [0.3488] * 8,
    })
    audited_df, summary = audit_sensor_data(df_flat)
    assert summary["sensor_dropouts_flatlines"] > 0
    assert any("SENSOR_FLATLINE_DROPOUT" in f for flags in audited_df["quality_flags"] for f in flags)


def test_quality_audit_magnetic_spike():
    """Verify isolated massive magnetic jump triggers spike WARNING."""
    df_spike = pd.DataFrame({
        "sensor_id": ["SFS-001"] * 10,
        "timestamp": [f"2026-08-27T10:00:{i:02d}" for i in range(10)],
        "x": [float(i) for i in range(10)],
        "y": [0.0] * 10,
        "bx": [0.18] * 4 + [8.50] + [0.18] * 5,  # isolated spike at index 4
        "by": [0.17] * 4 + [9.20] + [0.17] * 5,
        "bz": [0.35] * 4 + [12.4] + [0.35] * 5,
    })
    audited_df, summary = audit_sensor_data(df_spike)
    assert summary["magnetic_spikes"] >= 1
    assert "MAGNETIC_FIELD_SPIKE" in audited_df["quality_flags"].iloc[4]


def test_quality_audit_coordinate_discontinuity():
    """Verify velocity jump exceeding max_plausible_velocity triggers WARNING."""
    df_coord = pd.DataFrame({
        "sensor_id": ["SFS-001"] * 3,
        "timestamp": ["2026-08-27T10:00:00", "2026-08-27T10:00:01", "2026-08-27T10:00:02"],
        "x": [0.0, 100.0, 101.0],  # 100m in 1s -> 100 m/s >> 5 m/s threshold
        "y": [0.0, 0.0, 0.0],
        "bx": [0.18, 0.18, 0.18],
        "by": [0.17, 0.17, 0.17],
        "bz": [0.35, 0.35, 0.35],
    })
    audited_df, summary = audit_sensor_data(df_coord)
    assert summary["coordinate_discontinuities"] >= 1
    assert any("COORDINATE_DISCONTINUITY" in f for f in audited_df["quality_flags"].iloc[1])
