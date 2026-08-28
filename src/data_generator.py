"""
Synthetic Data Generator for Seafloor Magnetic Sensor Exploration.
Problem Statement ID: 26064

Generates physics-informed synthetic seabed magnetometry data with background drift,
sensor noise, and multi-scale localized magnetic anomalies.

NOTE: Synthetic parameters are development baselines and must be re-calibrated
using real ocean-bottom sensor data.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd


class SyntheticDataGenerator:
    """
    Simulates ocean-bottom magnetic field surveys with background field variation,
    noise, drift, and localized low/high anomalies.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        cfg = config or {}
        gen_cfg = cfg.get("synthetic_generator", {})
        
        self.seed = gen_cfg.get("random_seed", 42)
        self.num_samples = gen_cfg.get("num_samples", 2000)
        self.grid_width = gen_cfg.get("grid_width", 100.0)
        self.grid_height = gen_cfg.get("grid_height", 100.0)
        self.sensor_id = gen_cfg.get("sensor_id", "SFS-001")
        self.start_timestamp = gen_cfg.get("start_timestamp", "2026-08-26T10:00:00")
        self.interval_sec = gen_cfg.get("sample_interval_seconds", 1.0)
        
        self.background_base = gen_cfg.get("background_base", 0.45)
        self.spatial_drift = gen_cfg.get("background_spatial_drift", 0.001)
        self.drift_std = gen_cfg.get("low_frequency_drift_std", 0.005)
        self.sensor_noise_std = gen_cfg.get("sensor_noise_std", 0.015)
        
        self.num_low_anomalies = gen_cfg.get("num_low_anomalies", 6)
        self.low_strength_min = gen_cfg.get("low_anomaly_strength_min", 0.05)
        self.low_strength_max = gen_cfg.get("low_anomaly_strength_max", 0.15)
        self.low_radius_min = gen_cfg.get("low_anomaly_radius_min", 2.0)
        self.low_radius_max = gen_cfg.get("low_anomaly_radius_max", 5.0)
        
        self.num_high_anomalies = gen_cfg.get("num_high_anomalies", 3)
        self.high_strength_min = gen_cfg.get("high_anomaly_strength_min", 0.40)
        self.high_strength_max = gen_cfg.get("high_anomaly_strength_max", 1.20)
        self.high_radius_min = gen_cfg.get("high_anomaly_radius_min", 4.0)
        self.high_radius_max = gen_cfg.get("high_anomaly_radius_max", 8.0)

    def _generate_survey_track(self, rng: np.random.Generator) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generates a continuous 2D seabed survey trajectory (meandering lawnmower grid).
        """
        # Create a serpentine grid track over the survey area
        n_lines = 10
        points_per_line = self.num_samples // n_lines
        
        x_coords = []
        y_coords = []
        
        y_steps = np.linspace(5.0, self.grid_height - 5.0, n_lines)
        for i, y_val in enumerate(y_steps):
            if i % 2 == 0:
                xs = np.linspace(5.0, self.grid_width - 5.0, points_per_line)
            else:
                xs = np.linspace(self.grid_width - 5.0, 5.0, points_per_line)
            ys = np.full_like(xs, y_val) + rng.normal(0, 0.2, size=len(xs))
            x_coords.extend(xs)
            y_coords.extend(ys)
            
        # Pad or trim to exact num_samples
        x_arr = np.array(x_coords[:self.num_samples])
        y_arr = np.array(y_coords[:self.num_samples])
        if len(x_arr) < self.num_samples:
            diff = self.num_samples - len(x_arr)
            x_arr = np.pad(x_arr, (0, diff), mode="edge")
            y_arr = np.pad(y_arr, (0, diff), mode="edge")
            
        return x_arr, y_arr

    def _generate_anomalies(self, rng: np.random.Generator) -> List[Dict[str, Any]]:
        """
        Generates centers, radii, strengths, and orientations for low and high anomaly bodies.
        """
        anomalies = []
        
        # Low anomalies
        for i in range(self.num_low_anomalies):
            cx = rng.uniform(10.0, self.grid_width - 10.0)
            cy = rng.uniform(10.0, self.grid_height - 10.0)
            strength = rng.uniform(self.low_strength_min, self.low_strength_max)
            radius = rng.uniform(self.low_radius_min, self.low_radius_max)
            anomalies.append({
                "id": f"low_{i+1}",
                "type": "low_anomaly",
                "x": cx,
                "y": cy,
                "strength": strength,
                "radius": radius,
            })
            
        # High anomalies
        for i in range(self.num_high_anomalies):
            cx = rng.uniform(15.0, self.grid_width - 15.0)
            cy = rng.uniform(15.0, self.grid_height - 15.0)
            strength = rng.uniform(self.high_strength_min, self.high_strength_max)
            radius = rng.uniform(self.high_radius_min, self.high_radius_max)
            anomalies.append({
                "id": f"high_{i+1}",
                "type": "high_anomaly",
                "x": cx,
                "y": cy,
                "strength": strength,
                "radius": radius,
            })
            
        return anomalies

    def generate(self, return_ground_truth: bool = False) -> pd.DataFrame:
        """
        Generates a synthetic survey dataset.
        
        Args:
            return_ground_truth: If True, includes synthetic evaluation labels ('ground_truth_label').
            
        Returns:
            pandas DataFrame containing sensor readings.
        """
        rng = np.random.default_rng(self.seed)
        x_coords, y_coords = self._generate_survey_track(rng)
        anomalies = self._generate_anomalies(rng)
        
        # Base geomagnetic field components (representing ~45 deg inclination)
        base_bx = self.background_base * 0.40
        base_by = self.background_base * 0.40
        base_bz = self.background_base * 0.82
        
        # Spatial regional gradient across the seabed
        spatial_trend = (x_coords * self.spatial_drift * 0.6) + (y_coords * self.spatial_drift * 0.4)
        
        # Low frequency time drift (random walk)
        time_drift = np.cumsum(rng.normal(0, self.drift_std / np.sqrt(self.num_samples), size=self.num_samples))
        
        # Sensor measurement noise
        noise_bx = rng.normal(0, self.sensor_noise_std, size=self.num_samples)
        noise_by = rng.normal(0, self.sensor_noise_std, size=self.num_samples)
        noise_bz = rng.normal(0, self.sensor_noise_std, size=self.num_samples)
        
        # Accumulate anomaly perturbations (Gaussian bell response over distance)
        anomaly_bx = np.zeros(self.num_samples)
        anomaly_by = np.zeros(self.num_samples)
        anomaly_bz = np.zeros(self.num_samples)
        ground_truth_labels = ["background"] * self.num_samples
        
        for anom in anomalies:
            dx = x_coords - anom["x"]
            dy = y_coords - anom["y"]
            dist_sq = dx**2 + dy**2
            sigma = anom["radius"] / 2.0
            influence = np.exp(-dist_sq / (2 * sigma**2))
            
            # Anomaly field perturbation vector
            amp = anom["strength"] * influence
            anomaly_bx += amp * 0.35
            anomaly_by += amp * 0.35
            anomaly_bz += amp * 0.87
            
            # Mark ground truth for points within effective radius
            mask = dist_sq <= (anom["radius"] ** 2)
            for idx in np.where(mask)[0]:
                # High anomaly takes precedence if overlaps
                if anom["type"] == "high_anomaly" or ground_truth_labels[idx] == "background":
                    ground_truth_labels[idx] = anom["type"]
                    
        # Total tri-axial magnetic field
        bx = base_bx + spatial_trend * 0.4 + time_drift * 0.4 + noise_bx + anomaly_bx
        by = base_by + spatial_trend * 0.4 + time_drift * 0.4 + noise_by + anomaly_by
        bz = base_bz + spatial_trend * 0.82 + time_drift * 0.82 + noise_bz + anomaly_bz
        
        # Generate timestamps
        base_dt = datetime.fromisoformat(self.start_timestamp)
        timestamps = [(base_dt + timedelta(seconds=i * self.interval_sec)).isoformat() for i in range(self.num_samples)]
        
        data = {
            "sensor_id": [self.sensor_id] * self.num_samples,
            "timestamp": timestamps,
            "x": np.round(x_coords, 2),
            "y": np.round(y_coords, 2),
            "bx": np.round(bx, 4),
            "by": np.round(by, 4),
            "bz": np.round(bz, 4),
        }
        
        if return_ground_truth:
            data["ground_truth_label"] = ground_truth_labels
            
        return pd.DataFrame(data)


if __name__ == "__main__":
    import argparse
    import json
    import os
    
    parser = argparse.ArgumentParser(description="Generate synthetic seafloor magnetic data.")
    parser.add_argument("--samples", type=int, default=2000, help="Number of sensor samples")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--out", type=str, default="data/synthetic/synthetic_survey.json", help="Output JSON file")
    args = parser.parse_args()
    
    cfg = {"synthetic_generator": {"num_samples": args.samples, "random_seed": args.seed}}
    gen = SyntheticDataGenerator(cfg)
    df = gen.generate(return_ground_truth=True)
    
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    df.to_json(args.out, orient="records", indent=2)
    print(f"Generated {len(df)} synthetic samples saved to {args.out}")
