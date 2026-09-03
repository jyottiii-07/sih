"""
End-to-End Orchestration Pipeline for Seafloor Magnetic Anomaly Detection.
Problem Statement ID: 26064

Provides complete training, inference, and synthetic benchmark evaluation workflows.
"""

import argparse
import json
import os
from typing import Any, Dict, List, Optional, Tuple, Union
import joblib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import confusion_matrix, f1_score, precision_score, recall_score

from src.anomaly_detector import MagneticAnomalyDetector
from src.config import load_config
from src.data_generator import SyntheticDataGenerator
from src.features import FeatureExtractor
from src.preprocessing import preprocess_pipeline, validate_sensor_dataframe
from src.prediction import export_predictions_to_json, format_prediction_records
from src.scoring import AnomalyScoreNormalizer


class SeafloorAnomalyPipeline:
    """
    Unified ML pipeline manager for training, inference, and synthetic evaluation.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or load_config()
        self.detector = MagneticAnomalyDetector(self.config)
        self.normalizer = AnomalyScoreNormalizer(self.config)
        self.feature_extractor = FeatureExtractor(self.config)
        self.threshold = self.config.get("scoring", {}).get("score_threshold", 0.65)
        self.is_ready = False

    def train(self, data: Union[pd.DataFrame, str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """
        Trains Isolation Forest detector and calibrates normalizer.
        
        Args:
            data: Input DataFrame, JSON filepath, or list of record dicts.
            
        Returns:
            Dictionary with training metadata.
        """
        if isinstance(data, str):
            with open(data, "r", encoding="utf-8") as f:
                raw_json = json.load(f)
            df_raw = pd.DataFrame(raw_json)
        elif isinstance(data, list):
            df_raw = pd.DataFrame(data)
        else:
            df_raw = data.copy()
            
        # 1. Preprocess
        df_preprocessed = preprocess_pipeline(
            df_raw,
            window_size=self.config.get("preprocessing", {}).get("baseline_window_size", 31),
        )
        
        # 2. Extract features
        feature_df = self.feature_extractor.extract_features(df_preprocessed)
        
        # 3. Fit Isolation Forest
        self.detector.fit(feature_df)
        
        # 4. Calibrate normalizer
        raw_scores = self.detector.get_raw_scores(feature_df)
        self.normalizer.fit(raw_scores)
        
        self.is_ready = True
        return {
            "num_samples": len(feature_df),
            "num_features": len(feature_df.columns),
            "features": list(feature_df.columns),
            "calibration_params": self.normalizer.get_calibration_params(),
        }

    def predict(
        self,
        data: Union[pd.DataFrame, str, List[Dict[str, Any]], Dict[str, Any]],
        threshold: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """
        Executes end-to-end inference on sensor readings and returns contract records.
        
        Args:
            data: Raw sensor readings.
            threshold: Optional custom threshold (overrides config).
            
        Returns:
            List of standardized prediction dictionaries.
        """
        if not self.is_ready:
            raise RuntimeError("Pipeline is not ready. Train or load_model first.")
            
        t_val = threshold if threshold is not None else self.threshold
        if not (0.0 <= float(t_val) <= 1.0):
            raise ValueError(f"Threshold must be between 0.0 and 1.0, got {t_val}")
        
        # 1. Preprocess & validate
        df_preprocessed = preprocess_pipeline(
            data,
            window_size=self.config.get("preprocessing", {}).get("baseline_window_size", 31),
        )
        
        # 2. Extract features
        feature_df = self.feature_extractor.extract_features(df_preprocessed)
        
        # 3. Predict raw scores
        raw_scores = self.detector.get_raw_scores(feature_df)
        
        # 4. Normalize scores to [0.0, 1.0]
        normalized_scores = self.normalizer.normalize(raw_scores)
        
        # 5. Format JSON contract output
        predictions = format_prediction_records(
            df=df_preprocessed,
            anomaly_scores=normalized_scores,
            threshold=t_val,
        )
        return predictions

    def save(self, model_dir: Optional[str] = None) -> str:
        """
        Saves detector model and normalizer calibration parameters.
        """
        if not self.is_ready:
            raise RuntimeError("Cannot save unfitted pipeline")
            
        target_dir = model_dir or self.config.get("pipeline", {}).get("model_dir", "models")
        os.makedirs(target_dir, exist_ok=True)
        
        model_path = os.path.join(target_dir, "isolation_forest.joblib")
        norm_path = os.path.join(target_dir, "score_normalizer.joblib")
        
        self.detector.save_model(model_path)
        joblib.dump(self.normalizer.get_calibration_params(), norm_path)
        return target_dir

    def load(self, model_dir: Optional[str] = None) -> "SeafloorAnomalyPipeline":
        """
        Loads saved model and normalizer from disk.
        """
        target_dir = model_dir or self.config.get("pipeline", {}).get("model_dir", "models")
        model_path = os.path.join(target_dir, "isolation_forest.joblib")
        norm_path = os.path.join(target_dir, "score_normalizer.joblib")
        
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
            
        self.detector = MagneticAnomalyDetector.load_model(model_path)
        if os.path.exists(norm_path):
            norm_params = joblib.load(norm_path)
            self.normalizer.set_calibration_params(norm_params)
        else:
            self.normalizer.is_calibrated = True
            
        self.is_ready = True
        return self

    def evaluate_held_out_benchmark(
        self,
        num_samples: int = 5000,
        seed: int = 42,
        train_ratio: float = 0.70,
        split_strategy: str = "block_trajectory",
        output_report_dir: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Runs synthetic development benchmark evaluation against genuinely unseen held-out data.
        
        Methodology:
        1. Generates continuous synthetic trajectory dataset with ground truth labels.
        2. Splits into strictly disjoint, non-overlapping blocks along the survey trajectory
           (e.g., first 70% of continuous lines for training, final 30% for testing).
        3. Isolates ground truth labels: ensures ground_truth_label NEVER enters the feature pipeline.
        4. Trains Isolation Forest and calibrates AnomalyScoreNormalizer exclusively on the training block.
        5. Performs inference on the held-out test block using the trained model and normalizer.
        6. Computes Precision, Recall, F1, FPR, FNR, Confusion Matrix, and Score Distributions
           strictly on the held-out test block.
        
        Args:
            num_samples: Total synthetic samples across the survey track.
            seed: Reproducible generator seed.
            train_ratio: Fraction of contiguous trajectory allocated to training (default: 0.70).
            split_strategy: "block_trajectory" (contiguous spatial/temporal block split).
            output_report_dir: Destination folder for JSON report and diagnostic plots.
            
        Returns:
            Dictionary containing evaluation metrics and split validation guarantees.
        """
        report_dir = output_report_dir or self.config.get("pipeline", {}).get("report_dir", "outputs/reports")
        os.makedirs(report_dir, exist_ok=True)
        
        # 1. Generate benchmark dataset with ground truth
        gen_cfg = self.config.copy()
        gen_cfg["synthetic_generator"] = dict(self.config.get("synthetic_generator", {}))
        gen_cfg["synthetic_generator"]["num_samples"] = num_samples
        gen_cfg["synthetic_generator"]["random_seed"] = seed
        
        generator = SyntheticDataGenerator(gen_cfg)
        df_full = generator.generate(return_ground_truth=True)
        
        # 2. Block/Trajectory-Aware Contiguous Split
        if split_strategy == "block_trajectory":
            split_idx = int(len(df_full) * train_ratio)
            df_train = df_full.iloc[:split_idx].copy().reset_index(drop=True)
            df_test = df_full.iloc[split_idx:].copy().reset_index(drop=True)
            
            # Explicit disjoint index validation
            train_indices = set(range(split_idx))
            test_indices = set(range(split_idx, len(df_full)))
            overlap_indices = train_indices.intersection(test_indices)
            assert len(overlap_indices) == 0, "Train and test index sets must be strictly disjoint!"
        else:
            raise ValueError(f"Unsupported split strategy: {split_strategy}. Must be 'block_trajectory'.")
            
        # 3. Ground Truth Separation & Leakage Prevention
        # Save test ground truth labels before stripping
        test_ground_truth = df_test["ground_truth_label"].values
        train_ground_truth = df_train["ground_truth_label"].values
        
        # Strip ground_truth_label from both datasets
        df_train_input = df_train.drop(columns=["ground_truth_label"])
        df_test_input = df_test.drop(columns=["ground_truth_label"])
        
        # Verify ground_truth_label is not in columns or feature names
        assert "ground_truth_label" not in df_train_input.columns
        assert "ground_truth_label" not in df_test_input.columns
        assert "ground_truth_label" not in self.feature_extractor.get_feature_names()
        
        # 4. Train Isolation Forest and calibrate Normalizer on Training Block ONLY
        self.train(df_train_input)
        assert self.is_ready
        
        # 5. Predict on Unseen Held-Out Test Block ONLY
        predictions = self.predict(df_test_input, threshold=self.threshold)
        assert len(predictions) == len(df_test)
        
        scores = np.array([p["anomaly_score"] for p in predictions])
        pred_labels = np.array([1 if p["classification"] == "high_anomaly" else 0 for p in predictions])
        
        # Binary target: 1 = high_anomaly, 0 = background or low_anomaly
        true_binary = np.array([1 if g == "high_anomaly" else 0 for g in test_ground_truth])
        
        # 6. Calculate Metrics on Held-Out Test Block
        prec = float(precision_score(true_binary, pred_labels, zero_division=0))
        rec = float(recall_score(true_binary, pred_labels, zero_division=0))
        f1 = float(f1_score(true_binary, pred_labels, zero_division=0))
        cm = confusion_matrix(true_binary, pred_labels)
        
        tn, fp, fn, tp = cm.ravel()
        fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
        fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0
        
        # Score distributions by ground truth category on held-out test block
        bg_scores = scores[test_ground_truth == "background"]
        low_scores = scores[test_ground_truth == "low_anomaly"]
        high_scores = scores[test_ground_truth == "high_anomaly"]
        
        score_stats = {
            "background": {
                "count": int(len(bg_scores)),
                "mean": float(np.mean(bg_scores)) if len(bg_scores) > 0 else 0.0,
                "std": float(np.std(bg_scores)) if len(bg_scores) > 0 else 0.0,
                "median": float(np.median(bg_scores)) if len(bg_scores) > 0 else 0.0,
                "p95": float(np.percentile(bg_scores, 95)) if len(bg_scores) > 0 else 0.0,
            },
            "low_anomaly": {
                "count": int(len(low_scores)),
                "mean": float(np.mean(low_scores)) if len(low_scores) > 0 else 0.0,
                "std": float(np.std(low_scores)) if len(low_scores) > 0 else 0.0,
                "median": float(np.median(low_scores)) if len(low_scores) > 0 else 0.0,
                "p95": float(np.percentile(low_scores, 95)) if len(low_scores) > 0 else 0.0,
            },
            "high_anomaly": {
                "count": int(len(high_scores)),
                "mean": float(np.mean(high_scores)) if len(high_scores) > 0 else 0.0,
                "std": float(np.std(high_scores)) if len(high_scores) > 0 else 0.0,
                "median": float(np.median(high_scores)) if len(high_scores) > 0 else 0.0,
                "p95": float(np.percentile(high_scores, 95)) if len(high_scores) > 0 else 0.0,
            },
        }
        
        evaluation_report = {
            "evaluation_type": "SYNTHETIC DEVELOPMENT HELD-OUT EVALUATION",
            "disclaimer": "Metrics benchmark synthetic separability on genuinely unseen held-out test data only and MUST be calibrated on real sea-trial sensor data.",
            "split_strategy": split_strategy,
            "total_samples": len(df_full),
            "train_sample_count": len(df_train),
            "test_sample_count": len(df_test),
            "train_ratio": train_ratio,
            "overlap_check": {
                "indices_overlap": len(overlap_indices),
                "status": "PASSED_ZERO_OVERLAP",
            },
            "data_leakage_checks": {
                "ground_truth_in_features": False,
                "test_data_in_training": False,
                "normalizer_fit_scope": "TRAINING_SET_ONLY",
                "threshold_optimization_performed": False,
            },
            "threshold": self.threshold,
            "metrics": {
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1_score": round(f1, 4),
                "false_positive_rate": round(fpr, 4),
                "false_negative_rate": round(fnr, 4),
            },
            "confusion_matrix": {
                "true_negative": int(tn),
                "false_positive": int(fp),
                "false_negative": int(fn),
                "true_positive": int(tp),
            },
            "score_distributions": score_stats,
        }
        
        # Save evaluation JSON
        report_json_path = os.path.join(report_dir, "synthetic_evaluation_report.json")
        with open(report_json_path, "w", encoding="utf-8") as f:
            json.dump(evaluation_report, f, indent=2)
            
        # 7. Generate ML diagnostic plots for held-out test set
        self._generate_diagnostic_plots(df_test, predictions, scores, report_dir)
        
        return evaluation_report

    def evaluate_synthetic_benchmark(
        self,
        num_samples: int = 2500,
        seed: int = 42,
        output_report_dir: Optional[str] = None,
        train_ratio: float = 0.70,
        split_strategy: str = "block_trajectory",
    ) -> Dict[str, Any]:
        """
        Runs synthetic development benchmark evaluation against genuinely unseen held-out data.
        Delegates to evaluate_held_out_benchmark to guarantee zero data leakage.
        """
        return self.evaluate_held_out_benchmark(
            num_samples=num_samples,
            seed=seed,
            train_ratio=train_ratio,
            split_strategy=split_strategy,
            output_report_dir=output_report_dir,
        )

    def _generate_diagnostic_plots(
        self,
        df: pd.DataFrame,
        predictions: List[Dict[str, Any]],
        scores: np.ndarray,
        report_dir: str,
    ) -> None:
        """Generates static diagnostic visualization plots for ML analysis."""
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        # Subplot 1: Total Magnetic Signal vs Estimated Baseline
        ax1 = axes[0, 0]
        ax1.plot(df.index, df["bx"]**2 + df["by"]**2 + df["bz"]**2, alpha=0.3, label="Raw Energy", color="gray")
        mag_sig = np.sqrt(df["bx"]**2 + df["by"]**2 + df["bz"]**2)
        ax1.plot(df.index, mag_sig, label="Magnetic Signal (B)", color="blue", linewidth=1.0)
        ax1.set_title("Magnetic Signal along Survey Trajectory")
        ax1.set_xlabel("Sample Index")
        ax1.set_ylabel("Field Intensity (arb. units)")
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # Subplot 2: Anomaly Score Distribution Histogram
        ax2 = axes[0, 1]
        gt_types = df["ground_truth_label"].values if "ground_truth_label" in df.columns else None
        if gt_types is not None:
            if np.sum(gt_types == "background") > 0:
                ax2.hist(scores[gt_types == "background"], bins=30, alpha=0.6, label="Background", color="green", density=True)
            if np.sum(gt_types == "low_anomaly") > 0:
                ax2.hist(scores[gt_types == "low_anomaly"], bins=30, alpha=0.6, label="Low Anomaly", color="orange", density=True)
            if np.sum(gt_types == "high_anomaly") > 0:
                ax2.hist(scores[gt_types == "high_anomaly"], bins=30, alpha=0.6, label="High Anomaly", color="red", density=True)
        else:
            ax2.hist(scores, bins=40, alpha=0.7, color="purple", density=True)
        ax2.axvline(self.threshold, color="black", linestyle="--", label=f"Threshold (tau={self.threshold})")
        ax2.set_title("Anomaly Score Distribution")
        ax2.set_xlabel("Normalized Anomaly Score")
        ax2.set_ylabel("Density")
        ax2.legend()
        ax2.grid(True, alpha=0.3)
        
        # Subplot 3: Spatial Map of Anomaly Detections
        ax3 = axes[1, 0]
        x = df["x"].values
        y = df["y"].values
        classifs = [p["classification"] for p in predictions]
        
        bg_mask = np.array([c == "low_anomaly" for c in classifs])
        high_mask = np.array([c == "high_anomaly" for c in classifs])
        
        ax3.scatter(x[bg_mask], y[bg_mask], c="lightblue", s=15, alpha=0.6, label="Low / Background")
        ax3.scatter(x[high_mask], y[high_mask], c="red", s=45, marker="^", label="Detected High Anomaly")
        ax3.set_title("Seabed Survey Spatial Anomaly Map (ML Diagnostic)")
        ax3.set_xlabel("X coordinate (m)")
        ax3.set_ylabel("Y coordinate (m)")
        ax3.legend()
        ax3.grid(True, alpha=0.3)
        
        # Subplot 4: Residuals vs Anomaly Scores
        ax4 = axes[1, 1]
        sc = ax4.scatter(df.index, scores, c=scores, cmap="viridis", s=10)
        ax4.axhline(self.threshold, color="red", linestyle="--", label=f"Threshold ({self.threshold})")
        ax4.set_title("Normalized Anomaly Score per Sample")
        ax4.set_xlabel("Sample Index")
        ax4.set_ylabel("Score [0.0, 1.0]")
        fig.colorbar(sc, ax=ax4, label="Anomaly Score")
        ax4.legend()
        ax4.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plot_path = os.path.join(report_dir, "ml_diagnostic_report.png")
        plt.savefig(plot_path, dpi=200)
        plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description="Seafloor Magnetic Anomaly Detection ML Pipeline")
    parser.add_argument("--config", type=str, default="config.yaml", help="Path to config.yaml")
    parser.add_argument("--generate", action="store_true", help="Generate synthetic survey data")
    parser.add_argument("--train", action="store_true", help="Train Isolation Forest model")
    parser.add_argument("--infer", action="store_true", help="Run inference on input sensor data")
    parser.add_argument("--evaluate", action="store_true", help="Run synthetic development benchmark evaluation on held-out test data")
    parser.add_argument("--evaluate-held-out", action="store_true", help="Run dedicated held-out trajectory benchmark evaluation")
    parser.add_argument("--train-ratio", type=float, default=0.70, help="Train ratio for trajectory block split (default: 0.70)")
    parser.add_argument("--input", type=str, default=None, help="Input data JSON file path")
    parser.add_argument("--output", type=str, default="outputs/predictions/predictions.json", help="Output predictions JSON path")
    parser.add_argument("--threshold", type=float, default=None, help="Decision threshold override")
    parser.add_argument("--samples", type=int, default=2000, help="Number of synthetic samples to generate")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()
    
    cfg = load_config(args.config if os.path.exists(args.config) else None)
    pipeline = SeafloorAnomalyPipeline(cfg)
    
    if args.generate:
        gen = SyntheticDataGenerator(cfg)
        df_gen = gen.generate(return_ground_truth=True)
        out_gen = args.output if args.output else "data/synthetic/synthetic_survey.json"
        os.makedirs(os.path.dirname(out_gen), exist_ok=True)
        df_gen.to_json(out_gen, orient="records", indent=2)
        print(f"Generated {len(df_gen)} synthetic samples saved to {out_gen}")
        
    elif args.train:
        in_file = args.input or "data/synthetic/synthetic_survey.json"
        if not os.path.exists(in_file):
            print(f"Input file {in_file} not found. Generating default training dataset...")
            gen = SyntheticDataGenerator(cfg)
            df_train = gen.generate()
            os.makedirs(os.path.dirname(in_file), exist_ok=True)
            df_train.to_json(in_file, orient="records", indent=2)
        else:
            with open(in_file, "r", encoding="utf-8") as f:
                df_train = pd.DataFrame(json.load(f))
                
        meta = pipeline.train(df_train)
        saved_dir = pipeline.save()
        print(f"Model successfully trained on {meta['num_samples']} samples and saved to {saved_dir}")
        
    elif args.infer:
        if not args.input:
            raise ValueError("--input argument is required for inference")
        pipeline.load()
        with open(args.input, "r", encoding="utf-8") as f:
            raw_input = json.load(f)
        preds = pipeline.predict(raw_input, threshold=args.threshold)
        export_predictions_to_json(preds, args.output)
        print(f"Inference completed for {len(preds)} records. Output written to {args.output}")
        
    elif args.evaluate or args.evaluate_held_out:
        res = pipeline.evaluate_held_out_benchmark(
            num_samples=args.samples,
            seed=args.seed,
            train_ratio=args.train_ratio,
        )
        pipeline.save()
        print("=== SYNTHETIC DEVELOPMENT HELD-OUT EVALUATION RESULTS ===")
        print(json.dumps(res, indent=2))
        
    else:
        # Default: Run full demonstration
        print("Running full end-to-end benchmark demonstration on held-out data...")
        res = pipeline.evaluate_held_out_benchmark(
            num_samples=args.samples,
            seed=args.seed,
            train_ratio=args.train_ratio,
        )
        pipeline.save()
        print("Evaluation Report:")
        print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
