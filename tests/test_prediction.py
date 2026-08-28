"""
Tests for Prediction Output Formatting and Thresholding.
Problem Statement ID: 26064
"""

import pytest
import numpy as np
import pandas as pd
from src.prediction import apply_threshold, format_prediction_records


def test_thresholding_logic():
    """Verify low_anomaly vs high_anomaly assignment based on threshold."""
    scores = np.array([0.1, 0.4, 0.6499, 0.65, 0.85, 0.99])
    threshold = 0.65
    
    labels = apply_threshold(scores, threshold=threshold)
    expected = [
        "low_anomaly",
        "low_anomaly",
        "low_anomaly",
        "high_anomaly",
        "high_anomaly",
        "high_anomaly",
    ]
    assert labels == expected


def test_format_prediction_records_contract_schema():
    """Verify formatted output matches exact required JSON data contract."""
    df = pd.DataFrame({
        "sensor_id": ["SFS-001", "SFS-002"],
        "timestamp": ["2026-08-26T10:32:15", "2026-08-26T10:32:16"],
        "x": [42.0, 43.5],
        "y": [18.0, 19.2],
        "bx": [0.31, 0.35],
        "by": [0.47, 0.50],
        "bz": [0.66, 0.70],
        "magnetic_signal": [0.8675, 0.9287],
    })
    scores = np.array([0.91, 0.45])
    threshold = 0.65
    
    records = format_prediction_records(df, scores, threshold=threshold)
    
    assert len(records) == 2
    rec1 = records[0]
    rec2 = records[1]
    
    # Check fields
    required_keys = {
        "sensor_id", "timestamp", "x", "y", "bx", "by", "bz", "magnetic_signal", "anomaly_score", "classification"
    }
    assert set(rec1.keys()) == required_keys
    
    # Check values and types
    assert rec1["sensor_id"] == "SFS-001"
    assert rec1["classification"] == "high_anomaly"
    assert rec1["anomaly_score"] == 0.91
    
    assert rec2["sensor_id"] == "SFS-002"
    assert rec2["classification"] == "low_anomaly"
    assert rec2["anomaly_score"] == 0.45
