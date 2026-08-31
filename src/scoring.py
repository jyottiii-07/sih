"""
Anomaly Score Normalization and Calibration Module.
Problem Statement ID: 26064

Transforms raw Isolation Forest decision scores into a standardized [0.0, 1.0] continuous scale.

IMPORTANT SCIENTIFIC NOTE:
The normalized anomaly score represents relative deviation from the local background model.
It is NOT a physical deposit probability, nor does it guarantee economic metal content.
It is an unsupervised relative anomaly index for synthetic/development testing.
"""

from typing import Any, Dict, Optional, Tuple, Union
import numpy as np


class AnomalyScoreNormalizer:
    """
    Normalizes and calibrates raw decision scores to a bounded [0.0, 1.0] range.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        cfg = config or {}
        scoring_cfg = cfg.get("scoring", {})
        
        self.method = scoring_cfg.get("normalization_method", "minmax")
        self.min_score: float = -0.2
        self.max_score: float = 0.4
        self.is_calibrated: bool = False

    def fit(self, raw_scores: np.ndarray) -> "AnomalyScoreNormalizer":
        """
        Calibrates normalization bounds based on empirical training distribution percentiles.
        
        Args:
            raw_scores: Array of raw decision scores from training set.
            
        Returns:
            self
        """
        raw = np.asarray(raw_scores)
        if len(raw) == 0:
            raise ValueError("Cannot calibrate normalizer on empty scores array")
            
        # Use robust percentiles (1st to 99th) to prevent extreme outliers from crushing variance
        p1 = float(np.percentile(raw, 1))
        p99 = float(np.percentile(raw, 99))
        
        if p99 <= p1:
            p99 = p1 + 1.0
            
        self.min_score = p1
        self.max_score = p99
        self.is_calibrated = True
        return self

    def normalize(self, raw_scores: Union[float, np.ndarray, list]) -> np.ndarray:
        """
        Transforms raw anomaly scores into standardized [0.0, 1.0] range.
        
        Args:
            raw_scores: Float, list, or array of raw anomaly scores.
            
        Returns:
            1D numpy array of normalized anomaly scores in [0.0, 1.0].
        """
        raw = np.asarray(raw_scores, dtype=float)
        
        # MinMax linear mapping with clipping
        span = self.max_score - self.min_score
        if span <= 0:
            span = 1.0
            
        normalized = (raw - self.min_score) / span
        clipped = np.clip(normalized, 0.0, 1.0)
        return np.round(clipped, 4)

    def get_calibration_params(self) -> Dict[str, float]:
        """Returns calibration bounds."""
        return {
            "min_score": self.min_score,
            "max_score": self.max_score,
            "is_calibrated": self.is_calibrated,
        }

    def set_calibration_params(self, params: Dict[str, Any]) -> None:
        """Restores calibration bounds."""
        self.min_score = float(params.get("min_score", -0.2))
        self.max_score = float(params.get("max_score", 0.4))
        self.is_calibrated = bool(params.get("is_calibrated", True))
