"""
Tests for Data Preprocessing and Validation.
Problem Statement ID: 26064
"""

import pytest
import numpy as np
import pandas as pd
from src.preprocessing import (
    ValidationError,
    calculate_magnetic_signal,
    estimate_baseline,
    preprocess_pipeline,
    validate_sensor_dataframe,
    validate_single_record,
)


def test_validate_single_record_valid():
    """Verify single record validation with correct data."""
    valid_rec = {
        "sensor_id": "SFS-001",
        "timestamp": "2026-08-26T10:32:15",
        "x": 42.0,
        "y": 18.0,
        "bx": 0.31,
        "by": 0.47,
        "bz": 0.66,
    }
    validated = validate_single_record(valid_rec)
    assert validated["sensor_id"] == "SFS-001"
    assert validated["bx"] == 0.31
    assert isinstance(validated["bx"], float)


def test_validate_single_record_missing_field():
    """Verify error raised on missing field."""
    invalid_rec = {
        "sensor_id": "SFS-001",
        "timestamp": "2026-08-26T10:32:15",
        "x": 42.0,
        "y": 18.0,
        "bx": 0.31,
        # missing by and bz
    }
    with pytest.raises(ValidationError, match="Missing required fields"):
        validate_single_record(invalid_rec)


def test_validate_single_record_nan_inf():
    """Verify rejection of NaN and Inf values."""
    rec_nan = {
        "sensor_id": "SFS-001",
        "timestamp": "2026-08-26T10:32:15",
        "x": 42.0,
        "y": 18.0,
        "bx": float("nan"),
        "by": 0.47,
        "bz": 0.66,
    }
    with pytest.raises(ValidationError, match="non-finite value"):
        validate_single_record(rec_nan)

    rec_inf = {
        "sensor_id": "SFS-001",
        "timestamp": "2026-08-26T10:32:15",
        "x": 42.0,
        "y": 18.0,
        "bx": float("inf"),
        "by": 0.47,
        "bz": 0.66,
    }
    with pytest.raises(ValidationError, match="non-finite value"):
        validate_single_record(rec_inf)


def test_validate_single_record_invalid_timestamp():
    """Verify rejection of malformed timestamp."""
    rec_bad_ts = {
        "sensor_id": "SFS-001",
        "timestamp": "not-a-timestamp",
        "x": 42.0,
        "y": 18.0,
        "bx": 0.31,
        "by": 0.47,
        "bz": 0.66,
    }
    with pytest.raises(ValidationError, match="Invalid timestamp format"):
        validate_single_record(rec_bad_ts)


def test_validate_dataframe_empty():
    """Verify rejection of empty dataframe."""
    df_empty = pd.DataFrame()
    with pytest.raises(ValidationError, match="empty"):
        validate_sensor_dataframe(df_empty)


def test_calculate_magnetic_signal():
    """Verify B = sqrt(bx^2 + by^2 + bz^2) on known vector values."""
    # Vector: (0.3, 0.4, 0.0) -> norm = 0.5
    # Vector: (0.0, 0.0, 1.0) -> norm = 1.0
    # Vector: (1.0, 2.0, 2.0) -> norm = 3.0
    df = pd.DataFrame({
        "sensor_id": ["S1", "S2", "S3"],
        "timestamp": ["2026-08-26T10:00:00", "2026-08-26T10:00:01", "2026-08-26T10:00:02"],
        "x": [0, 1, 2],
        "y": [0, 1, 2],
        "bx": [0.3, 0.0, 1.0],
        "by": [0.4, 0.0, 2.0],
        "bz": [0.0, 1.0, 2.0],
    })
    res_df = calculate_magnetic_signal(df)
    assert "magnetic_signal" in res_df.columns
    np.testing.assert_allclose(res_df["magnetic_signal"].values, [0.5, 1.0, 3.0], rtol=1e-5)


def test_estimate_baseline_and_residuals():
    """Verify rolling median baseline estimation and residual calculation."""
    df = pd.DataFrame({
        "sensor_id": ["S1"] * 10,
        "timestamp": [f"2026-08-26T10:00:0{i}" for i in range(10)],
        "x": list(range(10)),
        "y": list(range(10)),
        "bx": [0.3] * 10,
        "by": [0.4] * 10,
        "bz": [0.0] * 10,
    })
    # Normal B = 0.5; inject spike at index 5
    df.loc[5, "bx"] = 0.6  # B ~ sqrt(0.6^2 + 0.4^2) = sqrt(0.52) ~ 0.7211
    
    preprocessed = estimate_baseline(df, window_size=5, min_periods=1)
    assert "baseline_B" in preprocessed.columns
    assert "residual" in preprocessed.columns
    assert not preprocessed.isnull().any().any()
    
    # Baseline should remain ~0.5 despite localized spike (median filter robustness)
    assert abs(preprocessed.loc[5, "baseline_B"] - 0.5) < 0.05
    assert preprocessed.loc[5, "residual"] > 0.15
