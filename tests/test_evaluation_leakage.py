"""
Tests for Data Leakage Prevention and Held-Out Benchmark Separation.
Problem Statement ID: 26064
"""

import pytest
import numpy as np
import pandas as pd
from unittest.mock import MagicMock, patch

from src.config import load_config
from src.data_generator import SyntheticDataGenerator
from src.pipeline import SeafloorAnomalyPipeline


def test_train_test_indices_are_disjoint():
    """Verify that training and held-out evaluation datasets share zero common samples."""
    cfg = load_config()
    cfg["synthetic_generator"]["num_samples"] = 500
    gen = SyntheticDataGenerator(cfg)
    df_full = gen.generate(return_ground_truth=True)

    train_ratio = 0.70
    split_idx = int(len(df_full) * train_ratio)

    df_train = df_full.iloc[:split_idx]
    df_test = df_full.iloc[split_idx:]

    train_indices = set(df_train.index)
    test_indices = set(df_test.index)

    assert len(train_indices) == split_idx
    assert len(test_indices) == len(df_full) - split_idx
    assert train_indices.isdisjoint(test_indices)
    assert len(train_indices.intersection(test_indices)) == 0


def test_ground_truth_label_absent_from_features():
    """Verify ground_truth_label is never present in preprocessed or extracted ML feature columns."""
    cfg = load_config()
    pipeline = SeafloorAnomalyPipeline(cfg)

    # 1. Feature extractor column list must never contain ground_truth_label
    feature_names = pipeline.feature_extractor.get_feature_names()
    assert "ground_truth_label" not in feature_names

    # 2. Extract features from a dataframe containing ground_truth_label
    gen = SyntheticDataGenerator(cfg)
    df_with_gt = gen.generate(return_ground_truth=True)
    assert "ground_truth_label" in df_with_gt.columns

    # When preprocessed, ground_truth_label must not be used or included in features
    df_clean = df_with_gt.drop(columns=["ground_truth_label"])
    from src.preprocessing import preprocess_pipeline
    df_preprocessed = preprocess_pipeline(df_clean)
    feat_df = pipeline.feature_extractor.extract_features(df_preprocessed)

    assert "ground_truth_label" not in feat_df.columns
    assert len(feat_df.columns) == len(feature_names)


def test_held_out_test_data_never_passed_to_model_fit():
    """Verify that model.fit receives strictly the training subset and never the test subset."""
    cfg = load_config()
    pipeline = SeafloorAnomalyPipeline(cfg)

    num_samples = 400
    train_ratio = 0.70
    expected_train_count = int(num_samples * train_ratio)

    original_detector_fit = pipeline.detector.fit
    fit_samples_record = []

    def mock_fit(feature_df):
        fit_samples_record.append(len(feature_df))
        return original_detector_fit(feature_df)

    pipeline.detector.fit = mock_fit

    report = pipeline.evaluate_held_out_benchmark(
        num_samples=num_samples,
        seed=42,
        train_ratio=train_ratio,
    )

    assert len(fit_samples_record) == 1
    assert fit_samples_record[0] == expected_train_count
    assert fit_samples_record[0] == report["train_sample_count"]
    assert report["test_sample_count"] == num_samples - expected_train_count


def test_score_normalizer_fitted_only_on_training_data():
    """Verify that score normalizer bounds are calibrated strictly from training scores."""
    cfg = load_config()
    pipeline = SeafloorAnomalyPipeline(cfg)

    original_fit = pipeline.normalizer.fit
    fit_calls = []

    def mock_fit(raw_scores):
        fit_calls.append(len(raw_scores))
        return original_fit(raw_scores)

    pipeline.normalizer.fit = mock_fit

    num_samples = 400
    train_ratio = 0.70
    expected_train_count = int(num_samples * train_ratio)

    report = pipeline.evaluate_held_out_benchmark(
        num_samples=num_samples,
        seed=42,
        train_ratio=train_ratio,
    )

    assert len(fit_calls) == 1
    assert fit_calls[0] == expected_train_count
    assert report["data_leakage_checks"]["normalizer_fit_scope"] == "TRAINING_SET_ONLY"


def test_evaluation_metrics_calculated_only_from_held_out_predictions():
    """Verify evaluation metric totals match the held-out test sample count exactly."""
    cfg = load_config()
    pipeline = SeafloorAnomalyPipeline(cfg)

    num_samples = 500
    train_ratio = 0.70
    expected_test_count = num_samples - int(num_samples * train_ratio)

    report = pipeline.evaluate_held_out_benchmark(
        num_samples=num_samples,
        seed=42,
        train_ratio=train_ratio,
    )

    cm = report["confusion_matrix"]
    total_evaluated = cm["true_negative"] + cm["false_positive"] + cm["false_negative"] + cm["true_positive"]

    assert total_evaluated == expected_test_count
    assert total_evaluated == report["test_sample_count"]

    score_dist = report["score_distributions"]
    total_scores = score_dist["background"]["count"] + score_dist["low_anomaly"]["count"] + score_dist["high_anomaly"]["count"]
    assert total_scores == expected_test_count
