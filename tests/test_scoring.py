"""
Tests for Anomaly Scoring and Calibration.
Problem Statement ID: 26064
"""

import pytest
import numpy as np
from src.scoring import AnomalyScoreNormalizer


def test_scoring_normalization_bounds():
    """Verify calibrated anomaly scores are strictly bounded in [0.0, 1.0]."""
    raw_scores = np.linspace(-0.5, 0.8, 100)
    normalizer = AnomalyScoreNormalizer()
    normalizer.fit(raw_scores)
    
    assert normalizer.is_calibrated
    
    # Test normalization on in-range and extreme out-of-range scores
    test_raw = np.array([-10.0, -0.2, 0.0, 0.3, 0.8, 50.0])
    normalized = normalizer.normalize(test_raw)
    
    assert len(normalized) == len(test_raw)
    assert np.all(normalized >= 0.0)
    assert np.all(normalized <= 1.0)
    assert normalized[0] == 0.0  # clipped at min
    assert normalized[-1] == 1.0  # clipped at max


def test_scoring_calibration_roundtrip():
    """Verify serialization of calibration parameters."""
    raw_scores = np.array([-0.1, 0.0, 0.1, 0.2, 0.5])
    normalizer = AnomalyScoreNormalizer()
    normalizer.fit(raw_scores)
    
    params = normalizer.get_calibration_params()
    assert "min_score" in params
    assert "max_score" in params
    
    new_norm = AnomalyScoreNormalizer()
    new_norm.set_calibration_params(params)
    assert new_norm.is_calibrated
    assert new_norm.min_score == params["min_score"]
    assert new_norm.max_score == params["max_score"]
