"""
Isolation Forest Anomaly Detection Wrapper for Seafloor Magnetic Data.
Problem Statement ID: 26064

Provides:
- Unsupervised isolation forest model training on background & residual features
- Robust model persistence (save/load via joblib)
- Extraction of raw anomaly decision scores
"""

import os
from typing import Any, Dict, Optional, Union
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest


class MagneticAnomalyDetector:
    """
    Wrapper around scikit-learn IsolationForest for detecting localized magnetic anomalies.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        cfg = config or {}
        model_cfg = cfg.get("model", {})
        
        self.n_estimators = model_cfg.get("n_estimators", 150)
        self.contamination = model_cfg.get("contamination", 0.05)
        self.max_samples = model_cfg.get("max_samples", 256)
        self.random_state = model_cfg.get("random_state", 42)
        
        self.model: Optional[IsolationForest] = None
        self.is_fitted: bool = False
        self.feature_names: Optional[list] = None

    def fit(self, X: Union[pd.DataFrame, np.ndarray]) -> "MagneticAnomalyDetector":
        """
        Fits the Isolation Forest model on feature matrix X.
        
        Args:
            X: Feature matrix (DataFrame or 2D numpy array).
            
        Returns:
            self
        """
        if isinstance(X, pd.DataFrame):
            self.feature_names = list(X.columns)
            X_mat = X.values
        else:
            self.feature_names = None
            X_mat = np.asarray(X)
            
        if len(X_mat) == 0:
            raise ValueError("Cannot fit model on empty feature dataset")
            
        # Initialize scikit-learn IsolationForest with single-thread for deterministic performance
        self.model = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            max_samples=self.max_samples,
            random_state=self.random_state,
            n_jobs=1,
        )
        
        self.model.fit(X_mat)
        self.is_fitted = True
        return self

    def get_raw_scores(self, X: Union[pd.DataFrame, np.ndarray]) -> np.ndarray:
        """
        Computes raw anomaly decision scores from Isolation Forest.
        In scikit-learn:
        - decision_function(X) returns negative values for anomalies and positive for inliers.
        - We invert the sign (-decision_function) so that higher values indicate higher anomaly.
        
        Args:
            X: Feature matrix.
            
        Returns:
            1D numpy array of raw anomaly scores (higher = more anomalous).
        """
        if not self.is_fitted or self.model is None:
            raise RuntimeError("Model is not fitted yet. Call fit() or load_model() first.")
            
        if isinstance(X, pd.DataFrame):
            X_mat = X.values
        else:
            X_mat = np.asarray(X)
            
        # Invert decision function: higher raw score = higher anomaly deviation
        raw_scores = -self.model.decision_function(X_mat)
        return raw_scores

    def save_model(self, filepath: str) -> str:
        """
        Persists the trained model to disk using joblib.
        
        Args:
            filepath: Destination file path (e.g. 'models/isolation_forest.joblib').
            
        Returns:
            Absolute saved path.
        """
        if not self.is_fitted or self.model is None:
            raise RuntimeError("Cannot save unfitted model")
            
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        payload = {
            "model": self.model,
            "feature_names": self.feature_names,
            "params": {
                "n_estimators": self.n_estimators,
                "contamination": self.contamination,
                "max_samples": self.max_samples,
                "random_state": self.random_state,
            },
        }
        joblib.dump(payload, filepath)
        return os.path.abspath(filepath)

    @classmethod
    def load_model(cls, filepath: str) -> "MagneticAnomalyDetector":
        """
        Loads a persisted model from disk.
        
        Args:
            filepath: Path to saved .joblib file.
            
        Returns:
            Instantiated MagneticAnomalyDetector.
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Model file not found: {filepath}")
            
        payload = joblib.load(filepath)
        detector = cls()
        detector.model = payload["model"]
        detector.feature_names = payload.get("feature_names")
        detector.is_fitted = True
        
        params = payload.get("params", {})
        detector.n_estimators = params.get("n_estimators", 150)
        detector.contamination = params.get("contamination", 0.05)
        detector.max_samples = params.get("max_samples", 256)
        detector.random_state = params.get("random_state", 42)
        
        return detector
