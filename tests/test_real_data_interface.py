"""
Tests for Real-Data Hardware-Agnostic Interface and Schema Fixtures.
Problem Statement ID: 26064
"""

import json
import os
import pytest
import numpy as np
import pandas as pd

from src.config import load_config
from src.pipeline import SeafloorAnomalyPipeline
from src.preprocessing import validate_sensor_dataframe, validate_single_record


def test_real_data_schema_single_fixture_ingestion():
    """Verify single-sample fixture loads, validates, and runs through inference."""
    fixture_path = "data/fixtures/real_data_schema_single.json"
    assert os.path.exists(fixture_path), f"Fixture not found: {fixture_path}"

    with open(fixture_path, "r", encoding="utf-8") as f:
        fixture_payload = json.load(f)

    assert fixture_payload.get("fixture_type") == "REAL-DATA SCHEMA FIXTURE"
    rec = fixture_payload["record"]

    # Validate single record
    validated = validate_single_record(rec)
    assert validated["sensor_id"] == "SFS-001"
    assert validated["x"] == 5.0
    assert validated["y"] == 5.1
    assert abs(validated["bx"] - 0.1845) < 1e-6
    assert abs(validated["by"] - 0.1725) < 1e-6
    assert abs(validated["bz"] - 0.3488) < 1e-6


def test_real_data_schema_batch_fixture_pipeline_inference():
    """Verify batch fixture passes through end-to-end pipeline."""
    fixture_path = "data/fixtures/real_data_schema_batch.json"
    assert os.path.exists(fixture_path), f"Fixture not found: {fixture_path}"

    with open(fixture_path, "r", encoding="utf-8") as f:
        records = json.load(f)

    # Filter out metadata dict if present
    sensor_records = [r for r in records if "sensor_id" in r]
    assert len(sensor_records) >= 5

    cfg = load_config()
    pipeline = SeafloorAnomalyPipeline(cfg)

    # Train a baseline on synthetic background to establish detector weights
    from src.data_generator import SyntheticDataGenerator
    gen = SyntheticDataGenerator(cfg)
    df_bg = gen.generate()
    pipeline.train(df_bg)

    # Run inference on real data fixture batch
    predictions = pipeline.predict(sensor_records, threshold=0.65)
    assert len(predictions) == len(sensor_records)

    for p in predictions:
        assert "sensor_id" in p
        assert "timestamp" in p
        assert "x" in p
        assert "y" in p
        assert "bx" in p
        assert "by" in p
        assert "bz" in p
        assert "magnetic_signal" in p
        assert "anomaly_score" in p
        assert "classification" in p
        assert p["classification"] in {"low_anomaly", "high_anomaly"}
        assert 0.0 <= p["anomaly_score"] <= 1.0


def test_sensor_unit_configuration_explicit():
    """Verify sensor configuration allows specifying physical measurement units without silent alteration."""
    cfg = load_config()
    assert "sensor" in cfg
    sensor_cfg = cfg["sensor"]

    # Verify configurable fields exist
    assert "measurement_unit" in sensor_cfg
    assert "scale_factor" in sensor_cfg
    assert "sensor_range_min" in sensor_cfg
    assert "sensor_range_max" in sensor_cfg
    assert "nominal_sampling_rate_hz" in sensor_cfg

    # Ensure arbitrary placeholder is documented and scale factor is identity by default
    assert sensor_cfg["measurement_unit"] == "arbitrary_magnetic_units"
    assert sensor_cfg["scale_factor"] == 1.0


def test_pipeline_predict_fixture_wrapper_directly():
    """Verify pipeline.predict accepts the full fixture dict without manual unpacking."""
    fixture_path = "data/fixtures/real_data_schema_single.json"
    with open(fixture_path, "r", encoding="utf-8") as f:
        fixture_data = json.load(f)

    cfg = load_config()
    pipeline = SeafloorAnomalyPipeline(cfg)
    pipeline.load()  # load trained baseline

    predictions = pipeline.predict(fixture_data, threshold=0.65)
    assert len(predictions) == 1
    p = predictions[0]
    assert p["sensor_id"] == "SFS-001"
    assert p["x"] == 5.0
    assert p["y"] == 5.1
    assert abs(p["bx"] - 0.1845) < 1e-6
    assert abs(p["by"] - 0.1725) < 1e-6
    assert abs(p["bz"] - 0.3488) < 1e-6
    assert "magnetic_signal" in p
    assert "anomaly_score" in p
    assert p["classification"] in {"low_anomaly", "high_anomaly"}


def test_pipeline_predict_flat_record_directly():
    """Verify pipeline.predict preserves direct physical flat sensor record compatibility."""
    flat_record = {
        "sensor_id": "SFS-PHYSICAL-01",
        "timestamp": "2026-08-27T12:00:00",
        "x": 15.0,
        "y": 25.0,
        "bx": 0.2100,
        "by": 0.1950,
        "bz": 0.3850,
    }
    cfg = load_config()
    pipeline = SeafloorAnomalyPipeline(cfg)
    pipeline.load()

    predictions = pipeline.predict(flat_record, threshold=0.65)
    assert len(predictions) == 1
    p = predictions[0]
    assert p["sensor_id"] == "SFS-PHYSICAL-01"
    assert p["bx"] == 0.21
    assert p["classification"] in {"low_anomaly", "high_anomaly"}


def test_pipeline_predict_filepath_string():
    """Verify pipeline.predict directly accepts a file path string to a fixture."""
    fixture_path = "data/fixtures/real_data_schema_single.json"
    cfg = load_config()
    pipeline = SeafloorAnomalyPipeline(cfg)
    pipeline.load()

    predictions = pipeline.predict(fixture_path, threshold=0.65)
    assert len(predictions) == 1
    assert predictions[0]["sensor_id"] == "SFS-001"


def test_cli_infer_single_fixture_execution(tmp_path):
    """Verify the exact CLI path: python -m src.pipeline --infer --input ... --output ..."""
    import subprocess
    import sys

    fixture_path = "data/fixtures/real_data_schema_single.json"
    out_file = tmp_path / "cli_single_out.json"

    cmd = [
        sys.executable,
        "-m",
        "src.pipeline",
        "--infer",
        "--input",
        fixture_path,
        "--output",
        str(out_file),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    assert proc.returncode == 0, f"CLI failed with error: {proc.stderr}"
    assert os.path.exists(out_file)

    with open(out_file, "r", encoding="utf-8") as f:
        preds = json.load(f)
    assert len(preds) == 1
    assert preds[0]["sensor_id"] == "SFS-001"
    assert preds[0]["classification"] in {"low_anomaly", "high_anomaly"}


def test_fixture_validation_not_weakened():
    """Verify that malformed data inside a fixture envelope is still strictly rejected."""
    from src.preprocessing import ValidationError, preprocess_pipeline

    # Missing fields inside record
    bad_fixture_missing = {
        "fixture_type": "REAL-DATA SCHEMA FIXTURE",
        "record": {
            "sensor_id": "SFS-001",
            "timestamp": "2026-08-27T10:00:00",
            # missing x, y, bx, by, bz
        },
    }
    with pytest.raises(ValidationError, match="Missing required fields"):
        preprocess_pipeline(bad_fixture_missing)

    # Non-finite values inside record
    bad_fixture_nan = {
        "fixture_type": "REAL-DATA SCHEMA FIXTURE",
        "record": {
            "sensor_id": "SFS-001",
            "timestamp": "2026-08-27T10:00:00",
            "x": 5.0,
            "y": 5.0,
            "bx": float("nan"),
            "by": 0.17,
            "bz": 0.35,
        },
    }
    with pytest.raises(ValidationError, match="non-finite value"):
        preprocess_pipeline(bad_fixture_nan)

