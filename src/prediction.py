"""
Prediction Output Formatter and Thresholding for Seafloor Magnetic Anomaly Detection.
Problem Statement ID: 26064

Enforces the strict ML output data contract:
- Applies configurable decision threshold tau (default: 0.65)
- Assigns binary classification: 'low_anomaly' or 'high_anomaly'
- Emits standardized JSON contract records
"""

import json
from typing import Any, Dict, List, Optional, Union
import numpy as np
import pandas as pd


ALLOWED_CLASSIFICATIONS = {"low_anomaly", "high_anomaly"}


def apply_threshold(
    anomaly_scores: Union[float, np.ndarray, list],
    threshold: float = 0.65,
) -> List[str]:
    """
    Applies binary decision thresholding to anomaly scores.
    
    Args:
        anomaly_scores: Array or single value of normalized scores in [0.0, 1.0].
        threshold: Decision threshold (0.0 to 1.0).
        
    Returns:
        List of classification strings: 'low_anomaly' or 'high_anomaly'.
    """
    if not (0.0 <= float(threshold) <= 1.0):
        raise ValueError(f"Threshold must be between 0.0 and 1.0, got {threshold}")
    scores = np.atleast_1d(np.asarray(anomaly_scores, dtype=float))
    classifications = np.where(scores >= threshold, "high_anomaly", "low_anomaly")
    return classifications.tolist()


def format_prediction_records(
    df: pd.DataFrame,
    anomaly_scores: Union[np.ndarray, list],
    threshold: float = 0.65,
) -> List[Dict[str, Any]]:
    """
    Constructs standardized prediction records matching the exact data contract.
    
    Contract Schema:
    {
      "sensor_id": str,
      "timestamp": str,
      "x": float,
      "y": float,
      "bx": float,
      "by": float,
      "bz": float,
      "magnetic_signal": float,
      "anomaly_score": float,
      "classification": "low_anomaly" | "high_anomaly"
    }
    
    Args:
        df: DataFrame with raw and computed magnetic fields.
        anomaly_scores: Normalized scores in [0.0, 1.0].
        threshold: Binary classification threshold.
        
    Returns:
        List of validated prediction dictionaries.
    """
    scores = np.asarray(anomaly_scores, dtype=float)
    if len(df) != len(scores):
        raise ValueError(f"Length mismatch between DataFrame ({len(df)}) and scores ({len(scores)})")
        
    classifications = apply_threshold(scores, threshold=threshold)
    
    records = []
    for i in range(len(df)):
        row = df.iloc[i]
        
        # Calculate magnetic signal if not present
        if "magnetic_signal" in row:
            mag_sig = float(row["magnetic_signal"])
        else:
            mag_sig = float(np.sqrt(row["bx"]**2 + row["by"]**2 + row["bz"]**2))
            
        record = {
            "sensor_id": str(row["sensor_id"]),
            "timestamp": str(row["timestamp"]),
            "x": round(float(row["x"]), 2),
            "y": round(float(row["y"]), 2),
            "bx": round(float(row["bx"]), 4),
            "by": round(float(row["by"]), 4),
            "bz": round(float(row["bz"]), 4),
            "magnetic_signal": round(mag_sig, 4),
            "anomaly_score": round(float(scores[i]), 4),
            "classification": classifications[i],
        }
        records.append(record)
        
    return records


def export_predictions_to_json(
    records: List[Dict[str, Any]],
    output_filepath: str,
    indent: int = 2,
) -> str:
    """
    Exports prediction records to formatted JSON file.
    
    Args:
        records: List of prediction dictionaries.
        output_filepath: Output destination path.
        indent: JSON indentation.
        
    Returns:
        Destination file path.
    """
    import os
    out_dir = os.path.dirname(output_filepath)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    with open(output_filepath, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=indent)
    return output_filepath
