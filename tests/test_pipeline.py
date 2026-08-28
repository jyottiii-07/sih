"""
End-to-End Pipeline Integration Tests.
Problem Statement ID: 26064
"""

import os
import tempfile
import pytest
import numpy as np
import pandas as pd
from src.config import load_config
from src.data_generator import SyntheticDataGenerator
from src.pipeline import SeafloorAnomalyPipeline


def test_pipeline_train_save_load_infer():
    """Verify full workflow: synthetic data -> train -> save -> load -> infer -> output JSON."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        model_dir = os.path.join(tmp_dir, "models")
        report_dir = os.path.join(tmp_dir, "reports")
        
        cfg = load_config()
        cfg["pipeline"]["model_dir"] = model_dir
        cfg["pipeline"]["report_dir"] = report_dir
        cfg["synthetic_generator"]["num_samples"] = 300
        
        # 1. Generate synthetic dataset
        gen = SyntheticDataGenerator(cfg)
        df_train = gen.generate()
        
        # 2. Train pipeline
        pipeline = SeafloorAnomalyPipeline(cfg)
        train_meta = pipeline.train(df_train)
        assert train_meta["num_samples"] == 300
        assert pipeline.is_ready
        
        # 3. Save model
        pipeline.save(model_dir)
        assert os.path.exists(os.path.join(model_dir, "isolation_forest.joblib"))
        assert os.path.exists(os.path.join(model_dir, "score_normalizer.joblib"))
        
        # 4. Load in a new pipeline instance
        new_pipeline = SeafloorAnomalyPipeline(cfg)
        new_pipeline.load(model_dir)
        assert new_pipeline.is_ready
        
        # 5. Run inference on raw input batch
        test_readings = [
            {
                "sensor_id": "SFS-001",
                "timestamp": "2026-08-26T12:00:00",
                "x": 10.0,
                "y": 15.0,
                "bx": 0.30,
                "by": 0.45,
                "bz": 0.65,
            },
            {
                "sensor_id": "SFS-001",
                "timestamp": "2026-08-26T12:00:01",
                "x": 10.5,
                "y": 15.2,
                "bx": 0.95,  # strong anomaly spike
                "by": 1.10,
                "bz": 1.45,
            },
        ]
        
        predictions = new_pipeline.predict(test_readings, threshold=0.65)
        assert len(predictions) == 2
        for pred in predictions:
            assert "sensor_id" in pred
            assert "timestamp" in pred
            assert "x" in pred
            assert "y" in pred
            assert "bx" in pred
            assert "by" in pred
            assert "bz" in pred
            assert "magnetic_signal" in pred
            assert "anomaly_score" in pred
            assert "classification" in pred
            assert pred["classification"] in {"low_anomaly", "high_anomaly"}
            assert 0.0 <= pred["anomaly_score"] <= 1.0


def test_pipeline_synthetic_evaluation_benchmark():
    """Verify synthetic evaluation metrics calculation and report generation."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        report_dir = os.path.join(tmp_dir, "reports")
        cfg = load_config()
        cfg["pipeline"]["report_dir"] = report_dir
        
        pipeline = SeafloorAnomalyPipeline(cfg)
        eval_report = pipeline.evaluate_synthetic_benchmark(
            num_samples=400,
            seed=42,
            output_report_dir=report_dir,
        )
        
        assert "SYNTHETIC DEVELOPMENT" in eval_report["evaluation_type"]
        assert eval_report["overlap_check"]["indices_overlap"] == 0
        assert "metrics" in eval_report
        assert "precision" in eval_report["metrics"]
        assert "recall" in eval_report["metrics"]
        assert "f1_score" in eval_report["metrics"]
        assert "confusion_matrix" in eval_report
        assert "score_distributions" in eval_report
        
        # Verify saved artifacts
        assert os.path.exists(os.path.join(report_dir, "synthetic_evaluation_report.json"))
        assert os.path.exists(os.path.join(report_dir, "ml_diagnostic_report.png"))


def test_pipeline_predict_single_record_real_data_schema():
    """Verify Section 7 requirement: pipeline directly consumes single raw sensor JSON payload."""
    cfg = load_config()
    cfg["synthetic_generator"]["num_samples"] = 200
    gen = SyntheticDataGenerator(cfg)
    df_train = gen.generate()
    
    pipeline = SeafloorAnomalyPipeline(cfg)
    pipeline.train(df_train)
    
    # Payload matching Section 7 schema specification
    real_sensor_payload = {
        "sensor_id": "SFS-001",
        "timestamp": "2026-08-26T10:32:15",
        "x": 42,
        "y": 18,
        "bx": 0.31,
        "by": 0.47,
        "bz": 0.66,
    }
    
    # Pass single dict directly to pipeline.predict
    predictions = pipeline.predict(real_sensor_payload, threshold=0.65)
    
    assert len(predictions) == 1
    pred = predictions[0]
    assert pred["sensor_id"] == "SFS-001"
    assert pred["timestamp"] == "2026-08-26T10:32:15"
    assert pred["x"] == 42.0
    assert pred["y"] == 18.0
    assert pred["bx"] == 0.31
    assert pred["by"] == 0.47
    assert pred["bz"] == 0.66
    assert abs(pred["magnetic_signal"] - np.sqrt(0.31**2 + 0.47**2 + 0.66**2)) < 1e-3
    assert 0.0 <= pred["anomaly_score"] <= 1.0
    assert pred["classification"] in {"low_anomaly", "high_anomaly"}


def test_config_deepcopy_isolation():
    """Verify modifying returned config dictionary does not mutate DEFAULT_CONFIG."""
    cfg1 = load_config()
    cfg1["pipeline"]["model_dir"] = "custom_modified_dir"
    
    cfg2 = load_config()
    assert cfg2["pipeline"]["model_dir"] == "models"

