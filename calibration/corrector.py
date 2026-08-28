"""
Hard-Iron and Soft-Iron Magnetometer Calibration Module.
Problem Statement ID: 26064

Provides physics-based magnetic calibration correction:
    B_corrected = M_soft * (B_raw - b_hard)

Where:
- b_hard: Hard-iron constant magnetic bias vector [bx_offset, by_offset, bz_offset]
  arising from permanent magnetic fields attached to the sensor or platform.
- M_soft: Soft-iron 3x3 correction matrix compensating for scale factor asymmetry
  and cross-axis coupling caused by ferromagnetic materials near the sensor.

IMPORTANT SCIENTIFIC NOTE:
This module implements the complete mathematical framework for software readiness.
Calibration coefficients MUST be determined empirically through physical sensor
maneuvers (e.g. 3D turntable or figures-of-8 survey passes at sea).
Do NOT fabricate real calibration coefficients without physical measurements.
"""

import json
import os
from typing import Any, Dict, Optional, Tuple, Union
import numpy as np
import pandas as pd


class MagnetometerCalibrator:
    """
    Applies and fits hard-iron and soft-iron calibration corrections to tri-axial
    magnetometer readings.
    """

    def __init__(
        self,
        hard_iron_offset: Optional[Union[np.ndarray, list]] = None,
        soft_iron_matrix: Optional[Union[np.ndarray, list]] = None,
        config: Optional[Dict[str, Any]] = None,
    ):
        if hard_iron_offset is not None:
            self.b_hard = np.asarray(hard_iron_offset, dtype=float).reshape(3)
        else:
            self.b_hard = np.zeros(3, dtype=float)

        if soft_iron_matrix is not None:
            self.M_soft = np.asarray(soft_iron_matrix, dtype=float).reshape((3, 3))
        else:
            self.M_soft = np.eye(3, dtype=float)

        self.is_calibrated = (hard_iron_offset is not None) or (soft_iron_matrix is not None)
        self.config = config or {}

    def fit_from_rotations(
        self,
        raw_measurements: np.ndarray,
        expected_field_magnitude: float = 0.45,
    ) -> "MagnetometerCalibrator":
        """
        Estimates hard-iron offset and soft-iron distortion matrix from a 3D
        rotational dataset using least-squares ellipsoid fitting.
        
        Args:
            raw_measurements: Array of shape (N, 3) representing [bx, by, bz]
                              under various 3D orientations in a uniform field.
            expected_field_magnitude: Expected geomagnetic field norm |B| (arbitrary units/µT).
            
        Returns:
            Self with updated b_hard and M_soft.
        """
        pts = np.asarray(raw_measurements, dtype=float)
        if len(pts) < 9:
            raise ValueError(f"Need at least 9 distinct 3D points for ellipsoid calibration fit, got {len(pts)}")

        # Center data as initial hard-iron estimate
        center_est = np.mean(pts, axis=0)
        centered = pts - center_est

        # For points distributed over an ellipsoid/sphere of radius R,
        # Var(X_i) = R_i^2 / 3, so axis radius R_i = sqrt(3 * lambda_i)
        cov = np.cov(centered, rowvar=False)
        eigenvals, eigenvecs = np.linalg.eigh(cov)

        radii = np.sqrt(3.0 * np.maximum(eigenvals, 1e-10))
        scale_diag = expected_field_magnitude / radii
        M_est = eigenvecs @ np.diag(scale_diag) @ eigenvecs.T

        self.b_hard = center_est
        self.M_soft = M_est
        self.is_calibrated = True
        return self

    def apply(self, B: np.ndarray) -> np.ndarray:
        """
        Applies hard-iron subtraction and soft-iron matrix multiplication:
            B_corrected = (B_raw - b_hard) @ M_soft.T
            
        Args:
            B: Array of shape (3,) or (N, 3) containing [bx, by, bz].
            
        Returns:
            Calibrated magnetic field array with identical shape.
        """
        arr = np.asarray(B, dtype=float)
        single_vector = (arr.ndim == 1)
        if single_vector:
            arr = arr.reshape(1, 3)

        # Hard-iron offset removal
        unbiased = arr - self.b_hard

        # Soft-iron matrix correction: shape (N, 3)
        corrected = unbiased @ self.M_soft.T

        if single_vector:
            return corrected[0]
        return corrected

    def apply_to_dataframe(
        self,
        df: pd.DataFrame,
        bx_col: str = "bx",
        by_col: str = "by",
        bz_col: str = "bz",
        output_prefix: str = "",
    ) -> pd.DataFrame:
        """
        Applies calibration to a pandas DataFrame containing bx, by, bz columns.
        
        Args:
            df: Input DataFrame.
            bx_col, by_col, bz_col: Column names for tri-axial fields.
            output_prefix: Prefix for calibrated column names (default "" overwrites bx, by, bz).
            
        Returns:
            DataFrame with calibrated magnetic field columns.
        """
        df_out = df.copy()
        raw_mat = df[[bx_col, by_col, bz_col]].values
        calibrated = self.apply(raw_mat)

        out_bx = f"{output_prefix}bx" if output_prefix else bx_col
        out_by = f"{output_prefix}by" if output_prefix else by_col
        out_bz = f"{output_prefix}bz" if output_prefix else bz_col

        df_out[out_bx] = calibrated[:, 0]
        df_out[out_by] = calibrated[:, 1]
        df_out[out_bz] = calibrated[:, 2]
        return df_out

    def save(self, filepath: str) -> str:
        """Saves calibration parameters to a JSON file."""
        os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
        payload = {
            "calibration_metadata": {
                "format_version": "1.0",
                "calibration_type": "Hard-Iron and Soft-Iron Calibration",
                "disclaimer": "Verify whether parameters are SYNTHETIC TEST or PHYSICAL SENSOR measurements.",
            },
            "hard_iron_offset": self.b_hard.tolist(),
            "soft_iron_matrix": self.M_soft.tolist(),
            "is_calibrated": self.is_calibrated,
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        return os.path.abspath(filepath)

    @classmethod
    def load(cls, filepath: str) -> "MagnetometerCalibrator":
        """Loads calibration parameters from a JSON file."""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Calibration file not found: {filepath}")
        with open(filepath, "r", encoding="utf-8") as f:
            payload = json.load(f)
        return cls(
            hard_iron_offset=payload.get("hard_iron_offset"),
            soft_iron_matrix=payload.get("soft_iron_matrix"),
        )


def apply_calibration(
    df: pd.DataFrame,
    calibrator: Optional[MagnetometerCalibrator] = None,
) -> pd.DataFrame:
    """
    Functional wrapper to apply calibration to a DataFrame if calibrator is provided and calibrated.
    """
    if calibrator is not None and calibrator.is_calibrated:
        return calibrator.apply_to_dataframe(df)
    return df.copy()
