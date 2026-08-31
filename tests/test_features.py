"""
Tests for Feature Extraction.
Problem Statement ID: 26064
"""

import pytest
import numpy as np
import pandas as pd
from src.features import FeatureExtractor, extract_features
from src.preprocessing import preprocess_pipeline


def test_feature_extraction_columns():
    """Verify all planned features are properly extracted without NaNs."""
    df_raw = pd.DataFrame({
        "sensor_id": ["SFS-001"] * 20,
        "timestamp": [f"2026-08-26T10:00:{i:02d}" for i in range(20)],
        "x": np.linspace(0, 10, 20),
        "y": np.linspace(0, 10, 20),
        "bx": np.random.uniform(0.2, 0.4, 20),
        "by": np.random.uniform(0.3, 0.5, 20),
        "bz": np.random.uniform(0.5, 0.7, 20),
    })
    
    df_preprocessed = preprocess_pipeline(df_raw, window_size=5)
    extractor = FeatureExtractor()
    feat_df = extractor.extract_features(df_preprocessed)
    
    expected = [
        "bx", "by", "bz", "magnetic_signal", "baseline_B", "residual",
        "normalized_deviation", "rolling_mean", "rolling_std", "local_min", "local_max", "spatial_gradient_mag"
    ]
    for col in expected:
        assert col in feat_df.columns
        
    assert not feat_df.isnull().any().any()
    assert np.all(np.isfinite(feat_df.values))


def test_feature_extraction_single_record():
    """Verify feature extraction executes on a 1-row DataFrame without errors or NaNs."""
    df_single = pd.DataFrame([{
        "sensor_id": "SFS-001",
        "timestamp": "2026-08-26T10:00:00",
        "x": 10.0,
        "y": 20.0,
        "bx": 0.35,
        "by": 0.45,
        "bz": 0.65,
    }])
    df_pre = preprocess_pipeline(df_single, window_size=5)
    extractor = FeatureExtractor()
    feat_df = extractor.extract_features(df_pre)
    
    assert len(feat_df) == 1
    assert not feat_df.isnull().any().any()
    assert np.all(np.isfinite(feat_df.values))
    assert feat_df["spatial_gradient_mag"].iloc[0] == 0.0

