"""
Feature Extraction Module for Seafloor Magnetic Anomaly Detection.
Problem Statement ID: 26064

Extracts geophysical, statistical, and spatial features for Isolation Forest:
- Raw directional components (bx, by, bz)
- Total magnetic intensity (magnetic_signal)
- Background baseline & localized residuals (baseline_B, residual)
- Normalized deviation (signal-to-noise ratio)
- Rolling window statistics (mean, std, local min, local max)
- Spatial gradient magnitude (edge/boundary sharpness)
"""

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd


FEATURE_DESCRIPTIONS = {
    "bx": "Magnetic field X component (directional dipole orientation)",
    "by": "Magnetic field Y component (directional dipole orientation)",
    "bz": "Magnetic field Z component (vertical dipole component)",
    "magnetic_signal": "Total field magnitude B = sqrt(bx^2 + by^2 + bz^2)",
    "baseline_B": "Local background geomagnetic field estimate (rolling median)",
    "residual": "Signed deviation from local background baseline (B - baseline_B)",
    "normalized_deviation": "Absolute residual scaled by local noise variance |residual| / (std + eps)",
    "rolling_mean": "Smoothed local window trend of total magnetic field",
    "rolling_std": "Local window magnetic texture and variance",
    "local_min": "Lower envelope bound of total field in local window",
    "local_max": "Upper envelope bound of total field in local window",
    "spatial_gradient_mag": "Magnitude of spatial field gradient sqrt((dB/dx)^2 + (dB/dy)^2)",
}


class FeatureExtractor:
    """
    Extracts informative geophysical features from preprocessed magnetic sensor readings.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        cfg = config or {}
        feat_cfg = cfg.get("features", {})
        prep_cfg = cfg.get("preprocessing", {})
        
        self.window_size = prep_cfg.get("baseline_window_size", 31)
        self.selected_features = feat_cfg.get("selected_features", list(FEATURE_DESCRIPTIONS.keys()))
        self.eps = 1e-6

    def get_feature_names(self) -> List[str]:
        """Returns the list of selected feature column names."""
        return list(self.selected_features)

    def extract_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Extracts all engineered features from preprocessed DataFrame.
        
        Args:
            df: Preprocessed DataFrame with bx, by, bz, x, y, magnetic_signal, baseline_B, residual.
            
        Returns:
            DataFrame containing the engineered feature columns with zero NaNs.
        """
        df = df.copy()
        
        # Ensure base columns exist
        if "magnetic_signal" not in df.columns:
            df["magnetic_signal"] = np.sqrt(df["bx"]**2 + df["by"]**2 + df["bz"]**2)
        if "baseline_B" not in df.columns:
            df["baseline_B"] = df["magnetic_signal"].rolling(window=self.window_size, center=True, min_periods=3).median().bfill().ffill()
        if "residual" not in df.columns:
            df["residual"] = df["magnetic_signal"] - df["baseline_B"]
            
        # 1. Rolling statistics
        eff_min_periods = max(1, min(len(df), 3))
        eff_window = max(1, min(len(df), self.window_size))
        rolling_series = df["magnetic_signal"].rolling(window=eff_window, center=True, min_periods=eff_min_periods)
        df["rolling_mean"] = rolling_series.mean().bfill().ffill().fillna(df["magnetic_signal"])
        df["rolling_std"] = rolling_series.std().fillna(0.0).bfill().ffill().fillna(0.0)
        df["local_min"] = rolling_series.min().bfill().ffill().fillna(df["magnetic_signal"])
        df["local_max"] = rolling_series.max().bfill().ffill().fillna(df["magnetic_signal"])
        
        # 2. Normalized deviation (Signal-to-Noise Ratio relative to local variance)
        df["normalized_deviation"] = np.abs(df["residual"]) / (df["rolling_std"] + self.eps)
        
        # 3. Spatial gradients
        # Approximate spatial derivative along trajectory
        if len(df) >= 2:
            dx = np.gradient(df["x"].values)
            dy = np.gradient(df["y"].values)
            ds = np.sqrt(dx**2 + dy**2)
            ds[ds == 0] = 1.0  # prevent division by zero for static readings
            
            dB = np.gradient(df["magnetic_signal"].values)
            spatial_grad = np.abs(dB) / ds
        else:
            spatial_grad = np.zeros(len(df), dtype=float)
            
        df["spatial_gradient_mag"] = spatial_grad
        
        # Filter strictly to selected features
        for col in self.selected_features:
            if col not in df.columns:
                raise ValueError(f"Required feature '{col}' could not be computed")
                
        feature_df = df[self.selected_features].copy()
        
        # Verify no NaN or Inf remains
        feature_df = feature_df.fillna(0.0)
        return feature_df


def extract_features(df: pd.DataFrame, config: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
    """Functional wrapper for FeatureExtractor."""
    extractor = FeatureExtractor(config)
    return extractor.extract_features(df)
