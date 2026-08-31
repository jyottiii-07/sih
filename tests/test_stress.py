"""
Comprehensive Failure, Stress, and Edge-Case Test Suite.
Problem Statement ID: 26064

Tests the actual public interfaces and ML pipeline across:
1. Empty dataset
2. Single valid sensor record
3. Very short batch: 2-3 records
4. Missing required field
5. NaN input
6. Inf input
7. Duplicate timestamps
8. Non-monotonic timestamps
9. Irregular sampling intervals
10. Sensor flatline/dropout
11. Extreme magnetic spike
12. Extreme/impossible coordinate jump
13. Very high sensor noise
14. Very weak anomaly
15. Very strong anomaly
16. Large synthetic dataset
17. Threshold = 0.0
18. Threshold = 1.0
19. Invalid threshold (<0 or >1) rejected
20. Malformed JSON / invalid input structure
21. Large-data stress test
22. End-to-end stress test through actual pipeline with raw data preservation
23. Malformed-input structure rejection
24. Numerical-stability test (zero variance, extreme floats)

NOTE: All tests benchmark synthetic and software robustness; they do NOT represent physical sea trials.
"""

import json
import os
import tempfile
import pytest
import numpy as np
import pandas as pd

from src.config import load_config
from src.data_generator import SyntheticDataGenerator
from src.data_preservation import compute_file_sha256, verify_raw_data_unmodified
from src.data_quality import audit_sensor_data
from src.features import FeatureExtractor
from src.pipeline import SeafloorAnomalyPipeline
from src.prediction import apply_threshold, format_prediction_records
from src.preprocessing import ValidationError, preprocess_pipeline, validate_sensor_dataframe, validate_single_record


@pytest.fixture
def trained_pipeline():
    """Returns a ready, trained SeafloorAnomalyPipeline instance."""
    cfg = load_config()
    pipeline = SeafloorAnomalyPipeline(cfg)
    pipeline.load()
    return pipeline


# ------------------------------------------------------------------------------
# 1. Empty Dataset
# ------------------------------------------------------------------------------
def test_stress_empty_dataset(trained_pipeline):
    """Scenario 1: Verify empty dataset is rejected or safely audited."""
    # Pipeline predict on empty list must raise ValidationError
    with pytest.raises(ValidationError, match="empty"):
        trained_pipeline.predict([])

    # Preprocess on empty dataframe must raise ValidationError
    with pytest.raises(ValidationError, match="empty"):
        preprocess_pipeline(pd.DataFrame())

    # Data quality audit on empty list returns clean audit without crashing
    _, summary = audit_sensor_data([])
    assert summary["total_samples"] == 0
    assert summary["valid_count"] == 0


# ------------------------------------------------------------------------------
# 2. Single Valid Sensor Record
# ------------------------------------------------------------------------------
def test_stress_single_valid_record(trained_pipeline):
    """Scenario 2: Verify single record produces valid bounded prediction."""
    single_record = {
        "sensor_id": "SFS-001",
        "timestamp": "2026-08-28T10:00:00",
        "x": 5.0,
        "y": 5.1,
        "bx": 0.1845,
        "by": 0.1725,
        "bz": 0.3488,
    }
    preds = trained_pipeline.predict(single_record, threshold=0.65)
    assert len(preds) == 1
    p = preds[0]
    assert p["sensor_id"] == "SFS-001"
    assert np.isfinite(p["anomaly_score"])
    assert 0.0 <= p["anomaly_score"] <= 1.0
    assert p["classification"] in {"low_anomaly", "high_anomaly"}


# ------------------------------------------------------------------------------
# 3. Very Short Batch: 2-3 Records
# ------------------------------------------------------------------------------
def test_stress_very_short_batch_2_to_3_records(trained_pipeline):
    """Scenario 3: Verify short batches (2-3 samples) handle rolling window gracefully."""
    for n in [2, 3]:
        short_batch = [
            {
                "sensor_id": "SFS-001",
                "timestamp": f"2026-08-28T10:00:0{i}",
                "x": float(i),
                "y": 0.0,
                "bx": 0.18 + i * 0.01,
                "by": 0.17 + i * 0.01,
                "bz": 0.35 + i * 0.01,
            }
            for i in range(n)
        ]
        preds = trained_pipeline.predict(short_batch, threshold=0.65)
        assert len(preds) == n
        for p in preds:
            assert np.isfinite(p["anomaly_score"])
            assert 0.0 <= p["anomaly_score"] <= 1.0
            assert p["classification"] in {"low_anomaly", "high_anomaly"}


# ------------------------------------------------------------------------------
# 4. Missing Required Field
# ------------------------------------------------------------------------------
def test_stress_missing_required_field(trained_pipeline):
    """Scenario 4: Verify missing required columns are rejected and flagged INVALID."""
    # Missing 'bz'
    bad_record = {
        "sensor_id": "SFS-001",
        "timestamp": "2026-08-28T10:00:00",
        "x": 5.0,
        "y": 5.0,
        "bx": 0.18,
        "by": 0.17,
        # 'bz' missing
    }
    with pytest.raises(ValidationError, match="Missing required fields"):
        trained_pipeline.predict(bad_record)

    audited, summary = audit_sensor_data([bad_record])
    assert summary["invalid_count"] == 1
    assert summary["missing_fields"] >= 1
    assert audited.iloc[0]["quality_state"] == "INVALID"


# ------------------------------------------------------------------------------
# 5. NaN Input
# ------------------------------------------------------------------------------
def test_stress_nan_input(trained_pipeline):
    """Scenario 5: Verify NaN inputs are rejected and audited as INVALID."""
    nan_record = {
        "sensor_id": "SFS-001",
        "timestamp": "2026-08-28T10:00:00",
        "x": 5.0,
        "y": 5.0,
        "bx": float("nan"),
        "by": 0.17,
        "bz": 0.35,
    }
    with pytest.raises(ValidationError, match="non-finite"):
        trained_pipeline.predict(nan_record)

    audited, summary = audit_sensor_data([nan_record])
    assert summary["invalid_count"] == 1
    assert summary["non_finite_values"] >= 1
    assert audited.iloc[0]["quality_state"] == "INVALID"


# ------------------------------------------------------------------------------
# 6. Inf Input
# ------------------------------------------------------------------------------
def test_stress_inf_input(trained_pipeline):
    """Scenario 6: Verify Inf inputs are rejected and audited as INVALID."""
    inf_record = {
        "sensor_id": "SFS-001",
        "timestamp": "2026-08-28T10:00:00",
        "x": 5.0,
        "y": 5.0,
        "bx": 0.18,
        "by": float("inf"),
        "bz": 0.35,
    }
    with pytest.raises(ValidationError, match="non-finite"):
        trained_pipeline.predict(inf_record)

    audited, summary = audit_sensor_data([inf_record])
    assert summary["invalid_count"] == 1
    assert summary["non_finite_values"] >= 1
    assert audited.iloc[0]["quality_state"] == "INVALID"


# ------------------------------------------------------------------------------
# 7. Duplicate Timestamps
# ------------------------------------------------------------------------------
def test_stress_duplicate_timestamps(trained_pipeline):
    """Scenario 7: Verify duplicate timestamps are audited as WARNING and processed stably."""
    dup_batch = [
        {"sensor_id": "SFS-001", "timestamp": "2026-08-28T10:00:00", "x": 1.0, "y": 1.0, "bx": 0.18, "by": 0.17, "bz": 0.35},
        {"sensor_id": "SFS-001", "timestamp": "2026-08-28T10:00:00", "x": 2.0, "y": 1.0, "bx": 0.19, "by": 0.18, "bz": 0.36},
        {"sensor_id": "SFS-001", "timestamp": "2026-08-28T10:00:01", "x": 3.0, "y": 1.0, "bx": 0.18, "by": 0.17, "bz": 0.35},
    ]
    audited, summary = audit_sensor_data(dup_batch)
    assert summary["duplicate_timestamps"] >= 2
    assert audited.iloc[0]["quality_state"] == "WARNING"

    preds = trained_pipeline.predict(dup_batch)
    assert len(preds) == 3
    for p in preds:
        assert np.isfinite(p["anomaly_score"])


# ------------------------------------------------------------------------------
# 8. Non-Monotonic Timestamps
# ------------------------------------------------------------------------------
def test_stress_non_monotonic_timestamps(trained_pipeline):
    """Scenario 8: Verify non-monotonic timestamps are flagged INVALID by audit and sorted by preprocessing."""
    unorder_batch = [
        {"sensor_id": "SFS-001", "timestamp": "2026-08-28T10:00:05", "x": 5.0, "y": 1.0, "bx": 0.18, "by": 0.17, "bz": 0.35},
        {"sensor_id": "SFS-001", "timestamp": "2026-08-28T10:00:02", "x": 2.0, "y": 1.0, "bx": 0.18, "by": 0.17, "bz": 0.35},
        {"sensor_id": "SFS-001", "timestamp": "2026-08-28T10:00:03", "x": 3.0, "y": 1.0, "bx": 0.18, "by": 0.17, "bz": 0.35},
    ]
    audited, summary = audit_sensor_data(unorder_batch)
    assert summary["out_of_order_timestamps"] >= 1
    assert summary["invalid_count"] >= 1

    # Preprocessing automatically re-sorts chronologically
    df_sorted = preprocess_pipeline(unorder_batch)
    assert df_sorted["timestamp"].tolist() == ["2026-08-28T10:00:02", "2026-08-28T10:00:03", "2026-08-28T10:00:05"]


# ------------------------------------------------------------------------------
# 9. Irregular Sampling Intervals
# ------------------------------------------------------------------------------
def test_stress_irregular_sampling_intervals(trained_pipeline):
    """Scenario 9: Verify irregular dt intervals are flagged WARNING and pipeline completes."""
    irreg_batch = [
        {"sensor_id": "SFS-001", "timestamp": "2026-08-28T10:00:00", "x": 1.0, "y": 1.0, "bx": 0.18, "by": 0.17, "bz": 0.35},
        {"sensor_id": "SFS-001", "timestamp": "2026-08-28T10:00:15", "x": 2.0, "y": 1.0, "bx": 0.18, "by": 0.17, "bz": 0.35},  # dt = 15s
        {"sensor_id": "SFS-001", "timestamp": "2026-08-28T10:00:16", "x": 3.0, "y": 1.0, "bx": 0.18, "by": 0.17, "bz": 0.35},
    ]
    audited, summary = audit_sensor_data(irreg_batch)
    assert summary["irregular_sampling_intervals"] >= 1
    assert audited.iloc[1]["quality_state"] == "WARNING"

    preds = trained_pipeline.predict(irreg_batch)
    assert len(preds) == 3


# ------------------------------------------------------------------------------
# 10. Sensor Flatline / Dropout
# ------------------------------------------------------------------------------
def test_stress_sensor_flatline_dropout(trained_pipeline):
    """Scenario 10: Verify identical flatline readings are flagged WARNING and avoid ZeroDivisionError."""
    flat_batch = [
        {
            "sensor_id": "SFS-001",
            "timestamp": f"2026-08-28T10:00:0{i}",
            "x": float(i),
            "y": 0.0,
            "bx": 0.2000,
            "by": 0.2000,
            "bz": 0.4000,
        }
        for i in range(8)
    ]
    audited, summary = audit_sensor_data(flat_batch)
    assert summary["sensor_dropouts_flatlines"] >= 1
    assert summary["warning_count"] >= 1

    preds = trained_pipeline.predict(flat_batch)
    assert len(preds) == 8
    for p in preds:
        assert np.isfinite(p["anomaly_score"])


# ------------------------------------------------------------------------------
# 11. Extreme Magnetic Spike
# ------------------------------------------------------------------------------
def test_stress_extreme_magnetic_spike(trained_pipeline):
    """Scenario 11: Verify extreme spike is flagged WARNING, score <= 1.0, classified high_anomaly."""
    spike_batch = [
        {"sensor_id": "SFS-001", "timestamp": "2026-08-28T10:00:00", "x": 1.0, "y": 1.0, "bx": 0.18, "by": 0.17, "bz": 0.35},
        {"sensor_id": "SFS-001", "timestamp": "2026-08-28T10:00:01", "x": 2.0, "y": 1.0, "bx": 0.18, "by": 0.17, "bz": 0.35},
        {"sensor_id": "SFS-001", "timestamp": "2026-08-28T10:00:02", "x": 3.0, "y": 1.0, "bx": 50.0, "by": 50.0, "bz": 80.0},  # massive spike
        {"sensor_id": "SFS-001", "timestamp": "2026-08-28T10:00:03", "x": 4.0, "y": 1.0, "bx": 0.18, "by": 0.17, "bz": 0.35},
        {"sensor_id": "SFS-001", "timestamp": "2026-08-28T10:00:04", "x": 5.0, "y": 1.0, "bx": 0.18, "by": 0.17, "bz": 0.35},
    ]
    audited, summary = audit_sensor_data(spike_batch)
    assert summary["magnetic_spikes"] >= 1
    assert audited.iloc[2]["quality_state"] == "WARNING"

    preds = trained_pipeline.predict(spike_batch)
    assert preds[2]["classification"] == "high_anomaly"
    assert preds[2]["anomaly_score"] <= 1.0
    assert np.isfinite(preds[2]["anomaly_score"])


# ------------------------------------------------------------------------------
# 12. Extreme / Impossible Coordinate Jump
# ------------------------------------------------------------------------------
def test_stress_extreme_coordinate_jump(trained_pipeline):
    """Scenario 12: Verify impossible spatial jumps are audited as WARNING and gradient handled safely."""
    jump_batch = [
        {"sensor_id": "SFS-001", "timestamp": "2026-08-28T10:00:00", "x": 1.0, "y": 1.0, "bx": 0.18, "by": 0.17, "bz": 0.35},
        {"sensor_id": "SFS-001", "timestamp": "2026-08-28T10:00:01", "x": 1000.0, "y": 500.0, "bx": 0.18, "by": 0.17, "bz": 0.35},  # velocity > 1000 m/s
        {"sensor_id": "SFS-001", "timestamp": "2026-08-28T10:00:02", "x": 1001.0, "y": 500.0, "bx": 0.18, "by": 0.17, "bz": 0.35},
    ]
    audited, summary = audit_sensor_data(jump_batch)
    assert summary["coordinate_discontinuities"] >= 1
    assert audited.iloc[1]["quality_state"] == "WARNING"

    preds = trained_pipeline.predict(jump_batch)
    assert len(preds) == 3
    for p in preds:
        assert np.isfinite(p["anomaly_score"])


# ------------------------------------------------------------------------------
# 13. Very High Sensor Noise
# ------------------------------------------------------------------------------
def test_stress_very_high_sensor_noise(trained_pipeline):
    """Scenario 13: Verify pipeline remains stable under severe noise (sigma=0.50)."""
    rng = np.random.default_rng(123)
    n = 100
    noisy_batch = [
        {
            "sensor_id": "SFS-001",
            "timestamp": f"2026-08-28T10:{i // 60:02d}:{i % 60:02d}",
            "x": float(i),
            "y": float(i) * 0.2,
            "bx": 0.18 + rng.normal(0, 0.50),
            "by": 0.17 + rng.normal(0, 0.50),
            "bz": 0.35 + rng.normal(0, 0.50),
        }
        for i in range(n)
    ]
    preds = trained_pipeline.predict(noisy_batch)
    assert len(preds) == n
    for p in preds:
        assert np.isfinite(p["anomaly_score"])
        assert 0.0 <= p["anomaly_score"] <= 1.0


# ------------------------------------------------------------------------------
# 14. Very Weak Anomaly
# ------------------------------------------------------------------------------
def test_stress_very_weak_anomaly(trained_pipeline):
    """Scenario 14: Verify subtle weak anomaly (+0.015) produces valid finite score."""
    weak_batch = [
        {"sensor_id": "SFS-001", "timestamp": f"2026-08-28T10:00:0{i}", "x": float(i), "y": 0.0, "bx": 0.18, "by": 0.17, "bz": 0.35}
        for i in range(5)
    ]
    weak_batch[2]["bz"] = 0.365  # +0.015 micro-anomaly

    preds = trained_pipeline.predict(weak_batch)
    assert len(preds) == 5
    for p in preds:
        assert np.isfinite(p["anomaly_score"])
        assert 0.0 <= p["anomaly_score"] <= 1.0


# ------------------------------------------------------------------------------
# 15. Very Strong Anomaly
# ------------------------------------------------------------------------------
def test_stress_very_strong_anomaly(trained_pipeline):
    """Scenario 15: Verify massive anomaly (+20.0) caps score at 1.0 without overflow."""
    strong_batch = [
        {"sensor_id": "SFS-001", "timestamp": f"2026-08-28T10:00:0{i}", "x": float(i), "y": 0.0, "bx": 0.18, "by": 0.17, "bz": 0.35}
        for i in range(5)
    ]
    strong_batch[2]["bz"] = 25.0  # massive anomaly

    preds = trained_pipeline.predict(strong_batch)
    assert preds[2]["anomaly_score"] == 1.0
    assert preds[2]["classification"] == "high_anomaly"


# ------------------------------------------------------------------------------
# 16. Large Synthetic Dataset
# ------------------------------------------------------------------------------
def test_stress_large_synthetic_dataset(trained_pipeline):
    """Scenario 16: Verify processing 5000 records completes cleanly without memory leaks."""
    cfg = load_config()
    cfg["synthetic_generator"]["num_samples"] = 5000
    cfg["synthetic_generator"]["random_seed"] = 99
    gen = SyntheticDataGenerator(cfg)
    df_large = gen.generate(return_ground_truth=False)

    preds = trained_pipeline.predict(df_large)
    assert len(preds) == 5000
    scores = np.array([p["anomaly_score"] for p in preds])
    assert np.all(np.isfinite(scores))
    assert np.all((scores >= 0.0) & (scores <= 1.0))


# ------------------------------------------------------------------------------
# 17. Threshold = 0.0
# ------------------------------------------------------------------------------
def test_stress_threshold_zero(trained_pipeline):
    """Scenario 17: Verify threshold=0.0 classifies 100% of records as high_anomaly."""
    test_batch = [
        {"sensor_id": "SFS-001", "timestamp": f"2026-08-28T10:00:0{i}", "x": float(i), "y": 0.0, "bx": 0.18, "by": 0.17, "bz": 0.35}
        for i in range(10)
    ]
    preds = trained_pipeline.predict(test_batch, threshold=0.0)
    for p in preds:
        assert p["classification"] == "high_anomaly"


# ------------------------------------------------------------------------------
# 18. Threshold = 1.0
# ------------------------------------------------------------------------------
def test_stress_threshold_one(trained_pipeline):
    """Scenario 18: Verify threshold=1.0 only classifies maximum clipped anomalies as high_anomaly."""
    test_batch = [
        {"sensor_id": "SFS-001", "timestamp": f"2026-08-28T10:00:0{i}", "x": float(i), "y": 0.0, "bx": 0.18, "by": 0.17, "bz": 0.35}
        for i in range(10)
    ]
    preds = trained_pipeline.predict(test_batch, threshold=1.0)
    for p in preds:
        if p["anomaly_score"] < 1.0:
            assert p["classification"] == "low_anomaly"


# ------------------------------------------------------------------------------
# 19. Invalid Threshold (<0 or >1) Rejected
# ------------------------------------------------------------------------------
def test_stress_invalid_threshold_rejected(trained_pipeline):
    """Scenario 19: Verify threshold < 0.0 or > 1.0 is strictly rejected with ValueError."""
    test_batch = [
        {"sensor_id": "SFS-001", "timestamp": "2026-08-28T10:00:00", "x": 1.0, "y": 1.0, "bx": 0.18, "by": 0.17, "bz": 0.35}
    ]
    with pytest.raises(ValueError, match="Threshold must be between 0.0 and 1.0"):
        trained_pipeline.predict(test_batch, threshold=-0.1)

    with pytest.raises(ValueError, match="Threshold must be between 0.0 and 1.0"):
        trained_pipeline.predict(test_batch, threshold=1.05)

    with pytest.raises(ValueError, match="Threshold must be between 0.0 and 1.0"):
        apply_threshold([0.5], threshold=-0.5)

    with pytest.raises(ValueError, match="Threshold must be between 0.0 and 1.0"):
        apply_threshold([0.5], threshold=1.5)


# ------------------------------------------------------------------------------
# 20. Malformed JSON / Invalid Input Structure
# ------------------------------------------------------------------------------
def test_stress_malformed_input_structure(trained_pipeline):
    """Scenario 20: Verify non-dict, non-list, or corrupted structures are rejected."""
    # Integer input
    with pytest.raises(ValidationError):
        trained_pipeline.predict(12345)

    # Boolean input
    with pytest.raises(ValidationError):
        trained_pipeline.predict(True)

    # Corrupted string (not valid JSON and not existing file)
    with pytest.raises(ValidationError):
        trained_pipeline.predict("{corrupted json string: !!!")

    # List of invalid types (e.g. list of ints)
    with pytest.raises(ValidationError):
        trained_pipeline.predict([1, 2, 3])


# ------------------------------------------------------------------------------
# 21. Dedicated Large-Data Stress Test
# ------------------------------------------------------------------------------
def test_stress_large_data_scale():
    """Verify training and predicting on 6,000 samples completes with zero degradation."""
    cfg = load_config()
    cfg["synthetic_generator"]["num_samples"] = 6000
    cfg["synthetic_generator"]["random_seed"] = 42

    gen = SyntheticDataGenerator(cfg)
    df_data = gen.generate(return_ground_truth=True)

    pipeline = SeafloorAnomalyPipeline(cfg)
    pipeline.train(df_data.iloc[:4000].drop(columns=["ground_truth_label"]))

    preds = pipeline.predict(df_data.iloc[4000:].drop(columns=["ground_truth_label"]))
    assert len(preds) == 2000

    scores = np.array([p["anomaly_score"] for p in preds])
    assert np.all(np.isfinite(scores))
    assert np.all((scores >= 0.0) & (scores <= 1.0))


# ------------------------------------------------------------------------------
# 22. End-to-End Pipeline Stress Test with Raw Data Preservation
# ------------------------------------------------------------------------------
def test_stress_end_to_end_pipeline_with_data_preservation():
    """Verify full workflow: raw file creation -> audit -> calibration -> inference -> preservation check."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        raw_path = os.path.join(tmp_dir, "raw_sensor_log.json")
        pred_path = os.path.join(tmp_dir, "predictions.json")

        records = [
            {
                "sensor_id": "SFS-STRESS-01",
                "timestamp": f"2026-08-28T12:00:0{i}",
                "x": float(i) * 2.0,
                "y": float(i) * 1.5,
                "bx": 0.18 + i * 0.005,
                "by": 0.17 + i * 0.005,
                "bz": 0.35 + i * 0.005,
            }
            for i in range(10)
        ]
        with open(raw_path, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2)

        # 1. Compute initial hash
        initial_hash = compute_file_sha256(raw_path)

        # 2. Audit
        audited, summary = audit_sensor_data(raw_path)
        assert summary["total_samples"] == 10
        assert summary["valid_count"] == 10

        # 3. Pipeline inference
        cfg = load_config()
        pipeline = SeafloorAnomalyPipeline(cfg)
        pipeline.load()
        preds = pipeline.predict(raw_path, threshold=0.65)
        assert len(preds) == 10

        # 4. Save predictions (separate directory)
        from src.prediction import export_predictions_to_json
        export_predictions_to_json(preds, pred_path)
        assert os.path.exists(pred_path)

        # 5. Verify raw file was never mutated
        assert verify_raw_data_unmodified(raw_path, initial_hash)


# ------------------------------------------------------------------------------
# 23. Numerical Stability Test: Zero Variance, Extremes, and Epsilon Protection
# ------------------------------------------------------------------------------
def test_stress_numerical_stability_zero_variance_and_extremes(trained_pipeline):
    """Verify feature extractor and normalizer handle zero variance and extreme numbers without crash."""
    # Exactly identical readings (zero variance in local window)
    identical_batch = [
        {"sensor_id": "SFS-001", "timestamp": f"2026-08-28T10:00:{i:02d}", "x": float(i), "y": 0.0, "bx": 0.30, "by": 0.40, "bz": 0.50}
        for i in range(15)
    ]
    df_prep = preprocess_pipeline(identical_batch)
    extractor = FeatureExtractor()
    feat_df = extractor.extract_features(df_prep)

    # Check rolling_std is 0.0 and normalized_deviation handles division by (0 + eps) safely
    assert np.all(feat_df["rolling_std"] == 0.0)
    assert np.all(np.isfinite(feat_df["normalized_deviation"]))
    assert not feat_df.isna().any().any()

    # Extreme small numbers (1e-12)
    tiny_batch = [
        {"sensor_id": "SFS-001", "timestamp": f"2026-08-28T10:00:0{i}", "x": float(i), "y": 0.0, "bx": 1e-12, "by": 1e-12, "bz": 1e-12}
        for i in range(5)
    ]
    preds = trained_pipeline.predict(tiny_batch)
    for p in preds:
        assert np.isfinite(p["anomaly_score"])
        assert 0.0 <= p["anomaly_score"] <= 1.0
