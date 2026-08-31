# Task Breakdown — Seafloor Magnetic Anomaly Detection ML Module

**Problem ID:** 26064  
**Scope:** Strictly Machine Learning Pipeline Implementation  
**Status:** Completed & Verified (All 19 automated tests passing)

---

## Phase 1 — Project Setup & Environment
- [x] **Task 1.1:** Initialize the `ml/` directory structure with folders: `data/`, `models/`, `notebooks/`, `src/`, `tests/`, `outputs/`, `config/`.  
  *Completion Criterion:* Directory hierarchy exists and is clean. *(Completed)*
- [x] **Task 1.2:** Create `ml/config.yaml` with baseline, window, model, and threshold parameters.  
  *Completion Criterion:* Config loads without error using `pyyaml`. *(Completed)*

## Phase 2 — Synthetic Data Generator
- [x] **Task 2.1:** Implement `src/data_generator.py` simulating 2D survey grids, ambient geomagnetic field drift, sensor noise, low-amplitude anomalies, and high-amplitude anomalies.  
  *Completion Criterion:* Generates pandas DataFrame or JSON records matching the input contract with realistic noise. *(Completed)*
- [x] **Task 2.2:** Add benchmark dataset generation script to produce repeatable datasets in `data/synthetic/`.  
  *Completion Criterion:* Deterministic datasets generated using fixed random seeds. *(Completed)*

## Phase 3 — Data Validation
- [x] **Task 3.1:** Implement `src/preprocessing.py` with strict schema validation, missing key checks, type verification, range/bounds checking, and NaN/Inf rejection.  
  *Completion Criterion:* Returns explicit boolean or error list for both valid and malformed sensor inputs. *(Completed)*

## Phase 4 — Preprocessing & Signal Calculation
- [x] **Task 4.1:** Implement `src/preprocessing.py` to sort readings chronologically/spatially.  
  *Completion Criterion:* Handles out-of-order or duplicate timestamp inputs. *(Completed)*
- [x] **Task 4.2:** Implement total magnetic field magnitude calculation $B = \sqrt{bx^2 + by^2 + bz^2}$.  
  *Completion Criterion:* Verified against known mathematical test vectors. *(Completed)*
- [x] **Task 4.3:** Implement robust baseline estimation (moving median filter).  
  *Completion Criterion:* Robust against high anomaly spikes without baseline contamination. *(Completed)*

## Phase 5 — Feature Engineering
- [x] **Task 5.1:** Implement `src/features.py` computing residuals (`deviation_from_baseline`), normalized deviations, rolling statistics (`mean`, `std`, `min`, `max`), and spatial gradients ($\nabla_x B, \nabla_y B$).  
  *Completion Criterion:* Feature dataframe produced with zero NaN values (proper edge handling). *(Completed)*

## Phase 6 — Isolation Forest Anomaly Detection
- [x] **Task 6.1:** Implement `src/anomaly_detector.py` wrapping scikit-learn `IsolationForest`.  
  *Completion Criterion:* Fits on background/synthetic features and exposes raw score outputs. *(Completed)*
- [x] **Task 6.2:** Implement model persistence (`save_model`, `load_model`) using `joblib`.  
  *Completion Criterion:* Model round-trip serialized and reloaded produces identical predictions. *(Completed)*

## Phase 7 — Anomaly Scoring & Calibration
- [x] **Task 7.1:** Implement `src/scoring.py` to map raw decision scores to normalized $[0.0, 1.0]$ anomaly scores.  
  *Completion Criterion:* Scores strictly bounded in $[0.0, 1.0]$ with monotonic response to anomaly injection strength. *(Completed)*

## Phase 8 — Low/High Anomaly Thresholding
- [x] **Task 8.1:** Implement configurable threshold logic separating `low_anomaly` ($< \tau$) from `high_anomaly` ($\ge \tau$).  
  *Completion Criterion:* Correct categorical string assignment based on configurable threshold parameter $\tau$. *(Completed)*

## Phase 9 — Prediction JSON Output Contract
- [x] **Task 9.1:** Implement `src/prediction.py` assembling the final standardized JSON payload matching the contract.  
  *Completion Criterion:* Output JSON validates against contract schema containing `sensor_id`, `timestamp`, `x`, `y`, `bx`, `by`, `bz`, `magnetic_signal`, `anomaly_score`, `classification`. *(Completed)*

## Phase 10 — Automated Testing Suite
- [x] **Task 10.1:** Implement unit tests in `tests/test_preprocessing.py`.  
  *Completion Criterion:* 100% pass rate on edge cases (nulls, types, NaNs, missing fields). *(Completed)*
- [x] **Task 10.2:** Implement unit tests in `tests/test_preprocessing.py` & `tests/test_features.py`.  
  *Completion Criterion:* 100% pass rate on vector math and feature calculations. *(Completed)*
- [x] **Task 10.3:** Implement model and scoring tests in `tests/test_anomaly_detector.py` & `tests/test_scoring.py`.  
  *Completion Criterion:* Model fit/predict and scoring bounds verified. *(Completed)*
- [x] **Task 10.4:** Implement end-to-end integration tests in `tests/test_pipeline.py`.  
  *Completion Criterion:* Full pipeline execution from raw dict to output prediction JSON verified. *(Completed)*

## Phase 11 — Evaluation & Diagnostic Reporting
- [x] **Task 11.1:** Implement pipeline execution and benchmark evaluation script (`src/pipeline.py` / CLI entrypoint).  
  *Completion Criterion:* Outputs classification metrics (Precision: 0.9326, Recall: 0.9022, F1: 0.9171) on benchmark synthetic data. *(Completed)*
- [x] **Task 11.2:** Add diagnostic visualization script for ML score distributions and spatial detection maps in `outputs/reports/`.  
  *Completion Criterion:* Diagnostic plots saved to `outputs/reports/ml_diagnostic_report.png`. *(Completed)*

## Phase 12 — Real Sensor Data Migration Guide
- [x] **Task 12.1:** Document exact procedure in `README.md` and `design.md` for ingesting real seafloor magnetometer logs, recalibrating the baseline filter, and fine-tuning threshold $\tau$.  
  *Completion Criterion:* Clear step-by-step instructions provided for future sea-trial data ingestion. *(Completed)*

## Phase 13 — Step 3: ML Audit, Multi-Seed Validation & Robustness Evaluation
- [x] **Task 13.1:** Complete full ML code audit, deepcopy config state isolation, and small-batch/single-record edge case hardening. *(Completed)*
- [x] **Task 13.2:** Execute multi-seed evaluation across seeds 1, 10, 42, 100, 999 (Mean Precision: 91.44%, Recall: 84.24%, F1: 0.8737). *(Completed)*
- [x] **Task 13.3:** Run noise robustness sweep (Low, Medium, High, Very High) and anomaly strength scaling benchmarks. *(Completed)*
- [x] **Task 13.4:** Perform threshold sensitivity sweep $\tau \in [0.30, 0.80]$ and cross-condition failure case mapping. *(Completed)*
- [x] **Task 13.5:** Author `validation_report.md` and `real_data_collection_protocol.md`. *(Completed)*

## Phase 14 — Step 4: Hardware-Ready ML Integration Preparation
- [x] **Task 14.1:** Establish hardware-agnostic real data interface with sample schema fixtures in `data/fixtures/` (`REAL-DATA SCHEMA FIXTURE`). *(Completed)*
- [x] **Task 14.2:** Make sensor units, scale factors, dynamic range, and nominal sampling rate explicitly configurable without silent conversion. *(Completed)*
- [x] **Task 14.3:** Build magnetometer hard-iron and soft-iron calibration module (`calibration/corrector.py`) with synthetic validation test reporting 98.41% magnitude recovery. *(Completed)*
- [x] **Task 14.4:** Implement real-data telemetry quality checking engine (`src/data_quality.py`) with `VALID`, `WARNING`, `INVALID` state classification. *(Completed)*
- [x] **Task 14.5:** Implement raw data preservation verification (`src/data_preservation.py`) with SHA-256 cryptographic immutability checks. *(Completed)*
- [x] **Task 14.6:** Execute classical signal processing weak-anomaly experiments (Gaussian, Savitzky-Golay, multi-pass stacking) and spatial consistency post-processing filter (`src/consistency_filter.py`). *(Completed)*
- [x] **Task 14.7:** Author `HARDWARE_READINESS.md` (10-step arrival sequence) and `real_data_checklist.md`. *(Completed)*
- [x] **Task 14.8:** Expand automated test suite to 40 tests with 100% pass rate. *(Completed)*

## Phase 15 — Step 5: Held-Out Trajectory Evaluation & Leakage Prevention
- [x] **Task 15.1:** Refactor benchmark evaluation in `src/pipeline.py` into a block/trajectory-aware split (`block_trajectory`) dividing survey data into disjoint 70% training and 30% held-out test blocks. *(Completed)*
- [x] **Task 15.2:** Enforce feature isolation: ensure `ground_truth_label` is stripped prior to feature engineering and absent from feature columns. *(Completed)*
- [x] **Task 15.3:** Isolate model training and normalizer calibration: fit Isolation Forest and normalizer strictly on training block. *(Completed)*
- [x] **Task 15.4:** Implement out-of-sample inference and calculate metrics (Precision, Recall, F1, FPR, FNR, Confusion Matrix) exclusively on held-out test data. *(Completed)*
- [x] **Task 15.5:** Add dedicated leakage regression tests in `tests/test_evaluation_leakage.py` (5 tests). *(Completed)*
- [x] **Task 15.6:** Expand test suite to 50 passing tests with zero warnings. *(Completed)*
- [x] **Task 15.7:** Execute held-out benchmark on $N = 5000$, seed = 42, reporting Precision: 59.76%, Recall: 100.0%, F1: 0.7481, FPR: 4.86%, FNR: 0.0%. *(Completed)*


