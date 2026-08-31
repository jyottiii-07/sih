"""
Calibration module for Seafloor Magnetic Sensor.
Problem Statement ID: 26064

Provides hard-iron and soft-iron magnetic calibration mathematics:
    B_corrected = M_soft * (B_raw - b_hard)
"""

from .corrector import MagnetometerCalibrator, apply_calibration

__all__ = ["MagnetometerCalibrator", "apply_calibration"]
