"""
Temporal and Spatial Consistency Post-Processing Filter.
Problem Statement ID: 26064

Experimental post-processing layer to enhance anomaly classification reliability:
    - Single Isolated High-Anomaly Spike -> Likely noise artifact / transient dropout.
    - Spatially / Temporally Clustered Anomalies -> Coherent geological / physical body (higher confidence).

IMPORTANT SCIENTIFIC NOTE:
This is an EXPERIMENTAL post-processing module. It does NOT alter the core Isolation Forest model.
It evaluates spatial adjacency and local persistence to reduce false alarms from single-point spikes.
"""

from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd


class SpatialTemporalConsistencyFilter:
    """
    Evaluates spatial and sequence consistency of detected anomalies to distinguish
    localized coherent target bodies from isolated transient noise spikes.
    """

    def __init__(
        self,
        min_cluster_size: int = 2,
        spatial_radius: float = 5.0,
        temporal_window: int = 3,
        downgrade_isolated: bool = True,
    ):
        """
        Args:
            min_cluster_size: Minimum neighboring high-anomaly samples required for high confidence.
            spatial_radius: Max Euclidean distance (meters) between samples to count as co-located.
            temporal_window: Max sample index difference to count as sequential.
            downgrade_isolated: If True, isolated single spikes are downgraded to 'low_anomaly'
                               with flag 'ISOLATED_TRANSIENT_SPIKE'.
        """
        self.min_cluster_size = min_cluster_size
        self.spatial_radius = spatial_radius
        self.temporal_window = temporal_window
        self.downgrade_isolated = downgrade_isolated

    def filter_predictions(
        self,
        predictions: List[Dict[str, Any]],
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Filters prediction records using spatial-temporal neighborhood clustering.
        
        Args:
            predictions: List of standardized prediction dictionaries.
            
        Returns:
            Tuple of:
                - Filtered prediction dictionaries with added fields:
                    'consistency_status': 'CLUSTERED_ANOMALY' | 'ISOLATED_SPIKE' | 'BACKGROUND'
                    'neighbor_count': int
                - Summary statistics dictionary.
        """
        if not predictions:
            return [], {"total": 0, "clustered": 0, "isolated_downgraded": 0}

        n = len(predictions)
        x = np.array([p["x"] for p in predictions], dtype=float)
        y = np.array([p["y"] for p in predictions], dtype=float)
        is_high = np.array([p["classification"] == "high_anomaly" for p in predictions], dtype=bool)

        high_indices = np.where(is_high)[0]
        neighbor_counts = np.zeros(n, dtype=int)
        consistency_statuses = ["BACKGROUND"] * n

        # Find spatial neighbors among high anomalies
        for idx in high_indices:
            # Check spatial distance to other high anomalies
            dx = x[high_indices] - x[idx]
            dy = y[high_indices] - y[idx]
            dists = np.sqrt(dx**2 + dy**2)
            time_diffs = np.abs(high_indices - idx)

            # Count valid neighbors (either within spatial radius or within temporal window)
            valid_neighbors = (dists <= self.spatial_radius) | (time_diffs <= self.temporal_window)
            count = np.sum(valid_neighbors)  # includes self

            neighbor_counts[idx] = count
            if count >= self.min_cluster_size:
                consistency_statuses[idx] = "CLUSTERED_ANOMALY"
            else:
                consistency_statuses[idx] = "ISOLATED_SPIKE"

        # Apply filtering
        filtered_records = []
        isolated_downgraded = 0
        clustered_count = 0

        for i, p in enumerate(predictions):
            rec = dict(p)
            status = consistency_statuses[i]
            rec["consistency_status"] = status
            rec["neighbor_count"] = int(neighbor_counts[i])

            if status == "ISOLATED_SPIKE" and self.downgrade_isolated:
                rec["classification"] = "low_anomaly"
                rec["consistency_flag"] = "DOWNGRADED_ISOLATED_SPIKE"
                isolated_downgraded += 1
            elif status == "CLUSTERED_ANOMALY":
                clustered_count += 1
                rec["consistency_flag"] = "CONFIRMED_CLUSTER"
            else:
                rec["consistency_flag"] = "NORMAL"

            filtered_records.append(rec)

        summary = {
            "total_records": n,
            "raw_high_anomalies": int(np.sum(is_high)),
            "confirmed_clustered_anomalies": clustered_count,
            "isolated_spikes_downgraded": isolated_downgraded,
            "filtered_high_anomalies": clustered_count if self.downgrade_isolated else int(np.sum(is_high)),
        }
        return filtered_records, summary
