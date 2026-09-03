import math
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional

# Lazy loading of ML pipeline
_pipeline = None


def get_ml_pipeline():
    """Initializes and returns the singleton SeafloorAnomalyPipeline instance."""
    global _pipeline
    if _pipeline is None:
        try:
            from src.pipeline import SeafloorAnomalyPipeline
            _pipeline = SeafloorAnomalyPipeline().load("models")
            print("[ML Engine] Successfully loaded IsolationForest & ScoreNormalizer from models/")
        except Exception as e:
            print(f"[ML Engine] Notice: Could not load joblib models ({e}). Using robust analytical baseline.")
            _pipeline = False
    return _pipeline


async def classify_reading(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Performs anomaly inference on sensor reading.
    
    Supports:
    1. Single-Axis Hall-Effect Sensor: normalized response signal [0.0, 1.0]
    2. 3-Axis Magnetometer in MicroTesla units (geomagnetic background ~45.0 uT)
    3. 3-Axis Magnetometer in Normalized survey units (baseline ~0.45) via IsolationForest
    
    Returns:
        {
            "magnetic_signal": float,
            "anomaly_score": float,
            "classification": "normal" | "weak_anomaly" | "strong_anomaly"
        }
    """
    sensor_type = payload.get("sensor_type")

    # --- Mode 1: Single-Axis Hall-Effect Sensor ---
    if sensor_type == "hall_effect":
        # Hall normalized signal S_norm in [0.0, 1.0] derived from baseline deviation
        s_norm = float(payload.get("magnetic_signal", payload.get("bz", 0.0)))
        anomaly_score = round(max(0.0, min(1.0, s_norm)), 4)
        
        if anomaly_score >= 0.70:
            classification = "strong_anomaly"
        elif anomaly_score >= 0.40:
            classification = "weak_anomaly"
        else:
            classification = "normal"
            
        return {
            "magnetic_signal": anomaly_score,
            "anomaly_score": anomaly_score,
            "classification": classification,
        }

    # --- Mode 2: 3-Axis Physical Magnetometer (Unchanged Path) ---
    bx = float(payload.get("bx", 0.0))
    by = float(payload.get("by", 0.0))
    bz = float(payload.get("bz", 0.0))
    
    # Total magnetic intensity B = sqrt(bx^2 + by^2 + bz^2)
    mag_sig = round(math.sqrt(bx**2 + by**2 + bz**2), 4)

    pipeline = get_ml_pipeline()
    anomaly_score = 0.0

    # Determine measurement scale
    is_microtesla_scale = (mag_sig > 5.0)

    if is_microtesla_scale:
        # MicroTesla / Engineering scale (geomagnetic background around 45.0 uT)
        bg_baseline = 45.0
        delta_b = abs(mag_sig - bg_baseline)
        if delta_b < 1.5:
            # Baseline quiet background
            anomaly_score = round(delta_b / 15.0, 4)
        elif delta_b < 10.0:
            # Moderate field variation / weak target
            anomaly_score = round(0.40 + (delta_b - 1.5) / (10.0 - 1.5) * 0.28, 4)
        else:
            # Strong ferromagnetic anomaly
            anomaly_score = round(min(1.0, 0.70 + (delta_b - 10.0) / 25.0 * 0.30), 4)
    else:
        # Survey unit scale (baseline around 0.45)
        if pipeline and hasattr(pipeline, "is_ready") and pipeline.is_ready:
            try:
                df_in = pd.DataFrame([{
                    "sensor_id": str(payload.get("sensor_id", "SFS-001")),
                    "timestamp": str(payload.get("timestamp", "")),
                    "x": float(payload.get("x", 0.0)),
                    "y": float(payload.get("y", 0.0)),
                    "bx": bx,
                    "by": by,
                    "bz": bz,
                    "magnetic_signal": mag_sig,
                }])
                feat_df = pipeline.feature_extractor.extract_features(df_in)
                raw_scores = pipeline.detector.get_raw_scores(feat_df)
                norm_scores = pipeline.normalizer.normalize(raw_scores)
                anomaly_score = float(norm_scores[0])
            except Exception:
                delta_b = abs(mag_sig - 0.45)
                anomaly_score = min(1.0, round(delta_b / 0.50, 4))
        else:
            delta_b = abs(mag_sig - 0.45)
            anomaly_score = min(1.0, round(delta_b / 0.50, 4))

    # Strict Data-Contract 3-tier Classification Mapping
    anomaly_score = round(max(0.0, min(1.0, anomaly_score)), 4)
    if anomaly_score >= 0.70:
        classification = "strong_anomaly"
    elif anomaly_score >= 0.40:
        classification = "weak_anomaly"
    else:
        classification = "normal"

    return {
        "magnetic_signal": mag_sig,
        "anomaly_score": anomaly_score,
        "classification": classification,
    }