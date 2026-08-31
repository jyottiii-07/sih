"""
Tests for Isolation Forest Anomaly Detector.
Problem Statement ID: 26064
"""

import os
import tempfile
import pytest
import numpy as np
import pandas as pd
from src.anomaly_detector import MagneticAnomalyDetector


def test_isolation_forest_fit_and_predict():
    """Verify Isolation Forest training and raw score output."""
    rng = np.random.default_rng(42)
    # Background data
    X_train = rng.normal(0, 1, size=(200, 5))
    
    detector = MagneticAnomalyDetector({
        "model": {"n_estimators": 50, "random_state": 42}
    })
    detector.fit(X_train)
    assert detector.is_fitted
    
    # Test scoring on background vs huge anomaly
    normal_sample = rng.normal(0, 1, size=(5, 5))
    extreme_anomaly = np.full((5, 5), 50.0)
    
    normal_scores = detector.get_raw_scores(normal_sample)
    anomaly_scores = detector.get_raw_scores(extreme_anomaly)
    
    assert len(normal_scores) == 5
    assert len(anomaly_scores) == 5
    # Anomaly raw scores should be noticeably higher than normal background
    assert np.mean(anomaly_scores) > np.mean(normal_scores)


def test_isolation_forest_save_and_load():
    """Verify model serialization and persistence."""
    X_train = np.random.normal(0, 1, size=(100, 4))
    detector = MagneticAnomalyDetector({"model": {"n_estimators": 25, "random_state": 42}})
    detector.fit(X_train)
    
    with tempfile.TemporaryDirectory() as tmp_dir:
        model_path = os.path.join(tmp_dir, "test_model.joblib")
        detector.save_model(model_path)
        assert os.path.exists(model_path)
        
        loaded = MagneticAnomalyDetector.load_model(model_path)
        assert loaded.is_fitted
        assert loaded.n_estimators == 25
        
        # Verify scores match exactly
        scores_orig = detector.get_raw_scores(X_train[:10])
        scores_loaded = loaded.get_raw_scores(X_train[:10])
        np.testing.assert_allclose(scores_orig, scores_loaded)
