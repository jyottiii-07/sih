"""
Tests for Synthetic Data Generator.
Problem Statement ID: 26064
"""

import pytest
import numpy as np
import pandas as pd
from src.data_generator import SyntheticDataGenerator


def test_synthetic_data_generator_schema():
    """Verify generated synthetic dataset contains exact required columns."""
    gen = SyntheticDataGenerator({"synthetic_generator": {"num_samples": 100, "random_seed": 42}})
    df = gen.generate(return_ground_truth=False)
    
    expected_cols = ["sensor_id", "timestamp", "x", "y", "bx", "by", "bz"]
    assert list(df.columns) == expected_cols
    assert len(df) == 100
    assert not df.isnull().any().any()


def test_synthetic_data_generator_reproducibility():
    """Verify reproducible output when using fixed random seed."""
    cfg = {"synthetic_generator": {"num_samples": 50, "random_seed": 123}}
    gen1 = SyntheticDataGenerator(cfg)
    gen2 = SyntheticDataGenerator(cfg)
    
    df1 = gen1.generate()
    df2 = gen2.generate()
    
    pd.testing.assert_frame_equal(df1, df2)


def test_synthetic_data_generator_with_ground_truth():
    """Verify ground truth anomaly annotations for benchmark evaluation."""
    gen = SyntheticDataGenerator({
        "synthetic_generator": {
            "num_samples": 300,
            "random_seed": 42,
            "num_high_anomalies": 2,
            "num_low_anomalies": 3,
        }
    })
    df = gen.generate(return_ground_truth=True)
    
    assert "ground_truth_label" in df.columns
    unique_labels = set(df["ground_truth_label"].unique())
    assert "background" in unique_labels
    assert "high_anomaly" in unique_labels
