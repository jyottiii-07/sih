"""
Synthetic Calibration Test Harness.
Problem Statement ID: 26064

Demonstrates and verifies the mathematical correction pipeline:
    Known Synthetic Field
            ↓
    Known Injected Distortion (Hard-Iron Bias + Soft-Iron Skew)
            ↓
    Calibration Estimation
            ↓
    Corrected Field
            ↓
    Quantified Recovery Error

DISCLAIMER:
SYNTHETIC CALIBRATION TEST ONLY.
This confirms software matrix math correctness. Real sensor calibration requires
physical rotation experiments with the actual magnetometer hardware.
"""

import json
import os
import sys
from typing import Any, Dict, Tuple
import numpy as np

# Ensure root can be imported
sys.path.insert(0, os.path.abspath("."))
from calibration.corrector import MagnetometerCalibrator


def run_synthetic_calibration_test(
    num_points: int = 500,
    expected_field: float = 0.45,
    seed: int = 42,
    output_report_path: str = "outputs/reports/synthetic_calibration_report.json",
) -> Dict[str, Any]:
    """
    Executes an end-to-end synthetic calibration validation run.
    """
    rng = np.random.default_rng(seed)

    # 1. Generate known ground-truth sphere of magnetic field vectors (|B| = 0.45)
    # Uniform sphere sampling via normal distribution
    pts_raw = rng.normal(size=(num_points, 3))
    pts_unit = pts_raw / np.linalg.norm(pts_raw, axis=1, keepdims=True)
    B_true = pts_unit * expected_field

    # 2. Define known synthetic distortion parameters
    # Hard-iron offset: constant magnetic bias [bx, by, bz]
    b_hard_true = np.array([0.08, -0.05, 0.12])

    # Soft-iron distortion matrix (scale factor distortion + cross-axis coupling)
    A_soft_true = np.array([
        [1.25, 0.08, 0.04],
        [0.08, 0.85, -0.06],
        [0.04, -0.06, 1.10],
    ])

    # Distort: B_raw = B_true @ A_soft_true.T + b_hard_true + sensor noise
    sensor_noise = rng.normal(0, 0.002, size=B_true.shape)
    B_distorted = B_true @ A_soft_true.T + b_hard_true + sensor_noise

    # Error before calibration
    err_before = np.linalg.norm(B_distorted - B_true, axis=1)
    l2_before = float(np.mean(err_before))
    rel_err_before = float(l2_before / expected_field)
    norm_variance_before = float(np.std(np.linalg.norm(B_distorted, axis=1)))

    # 3. Fit calibrator from distorted rotation points
    calibrator = MagnetometerCalibrator()
    calibrator.fit_from_rotations(B_distorted, expected_field_magnitude=expected_field)

    # 4. Apply calibration to recover corrected field
    B_corrected = calibrator.apply(B_distorted)

    # Error after calibration
    # Compare norms (field magnitude recovery) and vectors
    norms_corrected = np.linalg.norm(B_corrected, axis=1)
    norm_err = np.abs(norms_corrected - expected_field)
    l2_norm_after = float(np.mean(norm_err))
    rel_norm_err_after = float(l2_norm_after / expected_field)
    norm_variance_after = float(np.std(norms_corrected))

    # Vector recovery error
    vec_err = np.linalg.norm(B_corrected - B_true, axis=1)
    l2_vec_after = float(np.mean(vec_err))

    # Estimated vs injected hard-iron
    hard_iron_residual = float(np.linalg.norm(calibrator.b_hard - b_hard_true))

    report = {
        "test_type": "SYNTHETIC CALIBRATION TEST",
        "disclaimer": "Software verification only. Real hardware calibration requires physical vehicle measurements.",
        "parameters": {
            "num_test_points": num_points,
            "expected_field_norm": expected_field,
            "injected_hard_iron_offset": b_hard_true.tolist(),
            "injected_soft_iron_matrix": A_soft_true.tolist(),
        },
        "estimated_parameters": {
            "estimated_hard_iron_offset": [round(x, 4) for x in calibrator.b_hard.tolist()],
            "estimated_soft_iron_matrix": [[round(x, 4) for x in row] for row in calibrator.M_soft.tolist()],
            "hard_iron_estimation_error": round(hard_iron_residual, 4),
        },
        "performance_metrics": {
            "mean_l2_error_before": round(l2_before, 4),
            "relative_error_before": round(rel_err_before, 4),
            "field_norm_std_before": round(norm_variance_before, 4),
            "mean_field_norm_error_after": round(l2_norm_after, 4),
            "relative_field_norm_error_after": round(rel_norm_err_after, 4),
            "field_norm_std_after": round(norm_variance_after, 4),
            "vector_l2_error_after": round(l2_vec_after, 4),
            "magnitude_recovery_percentage": round(100.0 * (1.0 - rel_norm_err_after), 2),
        },
    }

    os.makedirs(os.path.dirname(os.path.abspath(output_report_path)), exist_ok=True)
    with open(output_report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("=== SYNTHETIC CALIBRATION TEST REPORT ===")
    print(f"Mean L2 Error Before: {l2_before:.4f} (Rel: {rel_err_before * 100:.1f}%)")
    print(f"Norm Std Before:      {norm_variance_before:.4f}")
    print(f"Mean L2 Norm Error After:  {l2_norm_after:.4f} (Rel: {rel_norm_err_after * 100:.2f}%)")
    print(f"Norm Std After:       {norm_variance_after:.4f}")
    print(f"Magnitude Recovery:   {report['performance_metrics']['magnitude_recovery_percentage']}%")
    print(f"Saved to: {output_report_path}")

    return report


if __name__ == "__main__":
    run_synthetic_calibration_test()
