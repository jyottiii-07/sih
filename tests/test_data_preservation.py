"""
Tests for Raw Data Immutability and Preservation Architecture.
Problem Statement ID: 26064
"""

import json
import os
import tempfile
import pytest
import pandas as pd

from src.config import load_config
from src.data_preservation import compute_file_sha256, verify_raw_data_unmodified
from src.features import FeatureExtractor
from src.pipeline import SeafloorAnomalyPipeline
from src.preprocessing import preprocess_pipeline


def test_raw_data_immutability_through_pipeline():
    """Verify that end-to-end ML pipeline operations never alter raw sensor files."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        raw_dir = os.path.join(tmp_dir, "data", "raw")
        pred_dir = os.path.join(tmp_dir, "data", "predictions")
        os.makedirs(raw_dir, exist_ok=True)
        os.makedirs(pred_dir, exist_ok=True)

        raw_filepath = os.path.join(raw_dir, "sensor_run_raw.json")

        # Create raw sensor file
        raw_records = [
            {
                "sensor_id": "SFS-001",
                "timestamp": f"2026-08-27T10:00:0{i}",
                "x": float(i),
                "y": float(i) * 2.0,
                "bx": 0.18 + i * 0.01,
                "by": 0.17 + i * 0.01,
                "bz": 0.35 + i * 0.01,
            }
            for i in range(10)
        ]
        with open(raw_filepath, "w", encoding="utf-8") as f:
            json.dump(raw_records, f, indent=2)

        # Compute initial hash
        initial_hash = compute_file_sha256(raw_filepath)

        # 1. Execute preprocessing
        with open(raw_filepath, "r", encoding="utf-8") as f:
            loaded_raw = json.load(f)
        df_preprocessed = preprocess_pipeline(loaded_raw)

        # 2. Execute feature extraction
        extractor = FeatureExtractor()
        feat_df = extractor.extract_features(df_preprocessed)

        # 3. Train & Predict
        cfg = load_config()
        pipeline = SeafloorAnomalyPipeline(cfg)
        from src.data_generator import SyntheticDataGenerator
        gen = SyntheticDataGenerator(cfg)
        pipeline.train(gen.generate())

        preds = pipeline.predict(loaded_raw)

        # Save predictions to predictions directory (NOT raw directory!)
        pred_out_path = os.path.join(pred_dir, "predictions.json")
        with open(pred_out_path, "w", encoding="utf-8") as f:
            json.dump(preds, f, indent=2)

        # VERIFY RAW FILE REMAINS COMPLETELY UNCHANGED
        assert verify_raw_data_unmodified(raw_filepath, initial_hash)
        final_hash = compute_file_sha256(raw_filepath)
        assert initial_hash == final_hash


def test_verify_raw_data_detects_mutation():
    """Verify verify_raw_data_unmodified raises ValueError when a raw file is modified."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        test_file = os.path.join(tmp_dir, "test.json")
        with open(test_file, "w") as f:
            f.write('{"data": 123}')

        initial_hash = compute_file_sha256(test_file)

        # Mutate the file
        with open(test_file, "w") as f:
            f.write('{"data": 456}')

        with pytest.raises(ValueError, match="DATA INTEGRITY VIOLATION"):
            verify_raw_data_unmodified(test_file, initial_hash)
