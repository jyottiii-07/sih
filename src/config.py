"""
Configuration loader for the Seafloor Magnetic Anomaly Detection ML Module.
Problem Statement ID: 26064
"""

import copy
import os
from typing import Any, Dict, List
import yaml


DEFAULT_CONFIG: Dict[str, Any] = {
    "pipeline": {
        "random_seed": 42,
        "model_dir": "models",
        "output_dir": "outputs/predictions",
        "report_dir": "outputs/reports",
    },
    "synthetic_generator": {
        "random_seed": 42,
        "num_samples": 2000,
        "grid_width": 100.0,
        "grid_height": 100.0,
        "sensor_id": "SFS-001",
        "start_timestamp": "2026-08-26T10:00:00",
        "sample_interval_seconds": 1.0,
        "background_base": 0.45,
        "background_spatial_drift": 0.001,
        "low_frequency_drift_std": 0.005,
        "sensor_noise_std": 0.015,
        "num_low_anomalies": 6,
        "low_anomaly_strength_min": 0.05,
        "low_anomaly_strength_max": 0.15,
        "low_anomaly_radius_min": 2.0,
        "low_anomaly_radius_max": 5.0,
        "num_high_anomalies": 3,
        "high_anomaly_strength_min": 0.40,
        "high_anomaly_strength_max": 1.20,
        "high_anomaly_radius_min": 4.0,
        "high_anomaly_radius_max": 8.0,
    },
    "preprocessing": {
        "baseline_window_size": 31,
        "baseline_min_periods": 5,
        "handle_edge_cases": "reflect",
    },
    "features": {
        "selected_features": [
            "bx",
            "by",
            "bz",
            "magnetic_signal",
            "baseline_B",
            "residual",
            "normalized_deviation",
            "rolling_mean",
            "rolling_std",
            "local_min",
            "local_max",
            "spatial_gradient_mag",
        ]
    },
    "model": {
        "algorithm": "IsolationForest",
        "n_estimators": 150,
        "contamination": 0.05,
        "max_samples": 256,
        "random_state": 42,
    },
    "scoring": {
        "score_threshold": 0.65,
        "normalization_method": "minmax",
    },
    "sensor": {
        "sensor_model": "UNKNOWN — REQUIRES HARDWARE SPECIFICATION",
        "measurement_unit": "arbitrary_magnetic_units",
        "scale_factor": 1.0,
        "sensor_range_min": -100.0,
        "sensor_range_max": 100.0,
        "nominal_sampling_rate_hz": 1.0,
        "resolution_bits": None,
        "nominal_noise_floor_std": 0.015,
        "max_plausible_velocity_mps": 5.0,
        "coordinate_unit": "meters",
    },
    "quality_checks": {
        "max_dt_ratio_warning": 2.0,
        "max_spike_sigma": 5.0,
        "min_flatline_samples": 5,
    },
}


def load_config(config_path: str | None = None) -> Dict[str, Any]:
    """
    Loads YAML configuration file, merging with default configurations.
    
    Args:
        config_path: Optional path to a YAML configuration file.
        
    Returns:
        Dictionary containing merged pipeline configuration.
    """
    config = copy.deepcopy(DEFAULT_CONFIG)
    if config_path and os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            user_cfg = yaml.safe_load(f)
            if user_cfg and isinstance(user_cfg, dict):
                for section, settings in user_cfg.items():
                    if section in config and isinstance(settings, dict):
                        config[section].update(settings)
                    else:
                        config[section] = settings
    return config
