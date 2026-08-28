"""
Tests for Weak-Anomaly Signal Processing and Consistency Filter Modules.
Problem Statement ID: 26064
"""

import pytest
import numpy as np

from src.consistency_filter import SpatialTemporalConsistencyFilter


def test_consistency_filter_isolated_spike_downgrade():
    """Verify single isolated spike is downgraded when downgrade_isolated=True."""
    # 5 samples: sample 2 is an isolated high anomaly, all others low
    predictions = [
        {"x": 1.0, "y": 1.0, "classification": "low_anomaly", "anomaly_score": 0.2},
        {"x": 2.0, "y": 1.0, "classification": "low_anomaly", "anomaly_score": 0.3},
        {"x": 10.0, "y": 10.0, "classification": "high_anomaly", "anomaly_score": 0.85},  # isolated spike far away
        {"x": 20.0, "y": 20.0, "classification": "low_anomaly", "anomaly_score": 0.25},
        {"x": 21.0, "y": 20.0, "classification": "low_anomaly", "anomaly_score": 0.22},
    ]

    cfilter = SpatialTemporalConsistencyFilter(
        min_cluster_size=2,
        spatial_radius=3.0,
        temporal_window=1,
        downgrade_isolated=True,
    )
    filtered_preds, summary = cfilter.filter_predictions(predictions)

    assert summary["raw_high_anomalies"] == 1
    assert summary["isolated_spikes_downgraded"] == 1
    assert summary["filtered_high_anomalies"] == 0

    # The isolated spike should be reclassified as low_anomaly
    assert filtered_preds[2]["classification"] == "low_anomaly"
    assert filtered_preds[2]["consistency_status"] == "ISOLATED_SPIKE"


def test_consistency_filter_clustered_anomaly_preserved():
    """Verify spatially clustered high anomalies are preserved with high confidence."""
    predictions = [
        {"x": 1.0, "y": 1.0, "classification": "low_anomaly", "anomaly_score": 0.2},
        # Cluster of 3 high anomalies within 2 meters of each other
        {"x": 10.0, "y": 10.0, "classification": "high_anomaly", "anomaly_score": 0.88},
        {"x": 11.0, "y": 10.5, "classification": "high_anomaly", "anomaly_score": 0.92},
        {"x": 10.5, "y": 11.0, "classification": "high_anomaly", "anomaly_score": 0.85},
        {"x": 25.0, "y": 25.0, "classification": "low_anomaly", "anomaly_score": 0.15},
    ]

    cfilter = SpatialTemporalConsistencyFilter(
        min_cluster_size=2,
        spatial_radius=3.0,
        temporal_window=2,
        downgrade_isolated=True,
    )
    filtered_preds, summary = cfilter.filter_predictions(predictions)

    assert summary["raw_high_anomalies"] == 3
    assert summary["confirmed_clustered_anomalies"] == 3
    assert summary["isolated_spikes_downgraded"] == 0

    for i in [1, 2, 3]:
        assert filtered_preds[i]["classification"] == "high_anomaly"
        assert filtered_preds[i]["consistency_status"] == "CLUSTERED_ANOMALY"
        assert filtered_preds[i]["neighbor_count"] >= 2
