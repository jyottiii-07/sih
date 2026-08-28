"""
Tests for Hard-Iron and Soft-Iron Calibration Module.
Problem Statement ID: 26064
"""

import os
import tempfile
import pytest
import numpy as np
import pandas as pd

from calibration.corrector import MagnetometerCalibrator, apply_calibration
from calibration.synthetic_calibration_test import run_synthetic_calibration_test


def test_hard_iron_correction_single_and_batch():
    """Verify hard-iron offset vector subtraction."""
    b_hard = np.array([0.05, -0.05, 0.10])
    calibrator = MagnetometerCalibrator(hard_iron_offset=b_hard)

    # Test single vector
    raw_vec = np.array([0.55, 0.45, 0.60])
    expected_vec = np.array([0.50, 0.50, 0.50])
    corrected_vec = calibrator.apply(raw_vec)
    np.testing.assert_allclose(corrected_vec, expected_vec, atol=1e-6)

    # Test batch matrix
    raw_batch = np.array([
        [0.55, 0.45, 0.60],
        [0.05, -0.05, 0.10],
    ])
    expected_batch = np.array([
        [0.50, 0.50, 0.50],
        [0.00, 0.00, 0.00],
    ])
    corrected_batch = calibrator.apply(raw_batch)
    np.testing.assert_allclose(corrected_batch, expected_batch, atol=1e-6)


def test_soft_iron_matrix_correction():
    """Verify soft-iron scale matrix transformation."""
    M_soft = np.array([
        [2.0, 0.0, 0.0],
        [0.0, 0.5, 0.0],
        [0.0, 0.0, 1.0],
    ])
    calibrator = MagnetometerCalibrator(soft_iron_matrix=M_soft)

    raw_vec = np.array([1.0, 2.0, 3.0])
    expected_vec = np.array([2.0, 1.0, 3.0])
    corrected_vec = calibrator.apply(raw_vec)
    np.testing.assert_allclose(corrected_vec, expected_vec, atol=1e-6)


def test_calibration_save_and_load():
    """Verify calibration parameter persistence to and from JSON."""
    b_hard = np.array([0.12, -0.08, 0.04])
    M_soft = np.array([
        [1.05, 0.02, -0.01],
        [0.02, 0.98, 0.01],
        [-0.01, 0.01, 1.02],
    ])
    calibrator = MagnetometerCalibrator(hard_iron_offset=b_hard, soft_iron_matrix=M_soft)

    with tempfile.TemporaryDirectory() as tmp_dir:
        save_path = os.path.join(tmp_dir, "test_cal.json")
        calibrator.save(save_path)
        assert os.path.exists(save_path)

        loaded = MagnetometerCalibrator.load(save_path)
        assert loaded.is_calibrated
        np.testing.assert_allclose(loaded.b_hard, b_hard, atol=1e-6)
        np.testing.assert_allclose(loaded.M_soft, M_soft, atol=1e-6)


def test_apply_calibration_dataframe():
    """Verify apply_to_dataframe correctly updates DataFrame columns."""
    b_hard = np.array([0.10, 0.10, 0.10])
    calibrator = MagnetometerCalibrator(hard_iron_offset=b_hard)

    df = pd.DataFrame({
        "bx": [0.6, 1.1],
        "by": [0.5, 0.9],
        "bz": [0.7, 0.8],
    })
    calibrated_df = calibrator.apply_to_dataframe(df)
    np.testing.assert_allclose(calibrated_df["bx"].values, [0.5, 1.0], atol=1e-6)
    np.testing.assert_allclose(calibrated_df["by"].values, [0.4, 0.8], atol=1e-6)
    np.testing.assert_allclose(calibrated_df["bz"].values, [0.6, 0.7], atol=1e-6)


def test_synthetic_calibration_test_execution():
    """Verify synthetic calibration run achieves magnitude recovery > 95%."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        report_path = os.path.join(tmp_dir, "cal_report.json")
        res = run_synthetic_calibration_test(
            num_points=300,
            expected_field=0.45,
            seed=42,
            output_report_path=report_path,
        )
        assert res["test_type"] == "SYNTHETIC CALIBRATION TEST"
        metrics = res["performance_metrics"]
        assert metrics["magnitude_recovery_percentage"] >= 95.0
        assert metrics["relative_field_norm_error_after"] < 0.05
