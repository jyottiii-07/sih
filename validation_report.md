# Seafloor Magnetic Anomaly Detection: ML Audit, Multi-Condition Validation & Real-Data Readiness Report

**Problem Statement ID:** 26064  
**Evaluation Type:** SYNTHETIC DEVELOPMENT EVALUATION  
**Pipeline Architecture:** Raw Magnetic Tri-Axial Data $\rightarrow$ Preprocessing $\rightarrow$ Baseline $\rightarrow$ Feature Extraction $\rightarrow$ Isolation Forest $\rightarrow$ Normalized Anomaly Score $\rightarrow$ Configurable Threshold $\rightarrow$ LOW_ANOMALY / HIGH_ANOMALY  
**Status:** All 22 Tests Passing (100% Suite Pass Rate)  

> [!IMPORTANT]
> **MANDATORY SCIENTIFIC DISCLAIMER**:
> All metrics, scores, thresholds, and performance curves in this report are derived from **SYNTHETIC DEVELOPMENT SIMULATIONS ONLY**. They benchmark pipeline stability, feature separability, and noise response prior to sea trials. They **DO NOT** represent real-world sensor performance and **DO NOT** indicate mineral or commercial metal deposit confirmation. The system is exclusively an unsupervised **magnetic anomaly detector**.

---

## Section 1: ML Audit Findings & Code Hardening

A comprehensive audit of the complete ML module ([data_generator.py](file:///c:/SIH_ML/ml/src/data_generator.py), [preprocessing.py](file:///c:/SIH_ML/ml/src/preprocessing.py), [features.py](file:///c:/SIH_ML/ml/src/features.py), [anomaly_detector.py](file:///c:/SIH_ML/ml/src/anomaly_detector.py), [scoring.py](file:///c:/SIH_ML/ml/src/scoring.py), [prediction.py](file:///c:/SIH_ML/ml/src/prediction.py), [pipeline.py](file:///c:/SIH_ML/ml/src/pipeline.py), [config.py](file:///c:/SIH_ML/ml/src/config.py), and test suites) was conducted.

| Audit Dimension | Finding / Assessment | Status | Corrective Action & Regression Protection |
| :--- | :--- | :--- | :--- |
| **Config Mutation & State Isolation** | `DEFAULT_CONFIG.copy()` performed a shallow copy; mutating nested sections in test runs or runtime instances polluted global state. | **RESOLVED** | Switched to `copy.deepcopy(DEFAULT_CONFIG)`. Added unit test `test_config_deepcopy_isolation`. |
| **Edge-Case / Single-Sample Robustness** | When processing single sensor readings or small batches ($N < 5$), rolling median baseline and `np.gradient` raised potential shape/NaN errors. | **RESOLVED** | Dynamic window/min_periods clamping (`max(1, min(len(df), min_periods))`) and gradient length checks added. Added regression tests `test_feature_extraction_single_record` and `test_pipeline_predict_single_record_real_data_schema`. |
| **Data Leakage & Contamination** | Verified feature extraction strictly isolates features (`bx, by, bz, magnetic_signal, baseline_B, residual, normalized_deviation, rolling statistics, spatial gradient`). | **VERIFIED** | Zero synthetic ground truth labels or future survey transects leak into features. |
| **Isolation Forest Score Inversion** | Scikit-learn `decision_function` returns negative values for outliers and positive for inliers. | **VERIFIED** | Sign is inverted (`-decision_function`) so higher scores consistently represent higher anomaly deviation. |
| **Score Normalization Bounds** | Min-max calibration uses empirical 1st–99th percentiles with explicit `[0.0, 1.0]` clipping. | **VERIFIED** | Boundedness rigorously verified; no NaN/Inf propagation possible. |
| **Contract Schema Adherence** | Verified strict output schema format and JSON serialization integrity. | **VERIFIED** | Validated against single payload and batch streaming records. |

---

## Section 2: Multi-Seed Evaluation (Deterministic Experiments)

**Evaluation Setup:** 2,500 samples per run, Isolation Forest ($n=150$, contamination=0.05), threshold $\tau = 0.65$, tested across deterministic random seeds: `[1, 10, 42, 100, 999]`.

### Individual Seed Benchmark Results (Synthetic Development Only)
| Seed | Precision | Recall | F1-Score | False Positive Rate (FPR) | False Negative Rate (FNR) | TP | FP | TN | FN |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | 96.08% | 73.68% | 0.8340 | 0.17% | 26.32% | 98 | 4 | 2363 | 35 |
| **10** | 86.67% | 94.55% | 0.9043 | 0.67% | 5.45% | 104 | 16 | 2374 | 6 |
| **42** | 93.26% | 90.22% | 0.9171 | 0.25% | 9.78% | 83 | 6 | 2402 | 9 |
| **100** | 87.69% | 83.82% | 0.8571 | 0.33% | 16.18% | 57 | 8 | 2424 | 11 |
| **999** | 93.52% | 78.91% | 0.8559 | 0.30% | 21.09% | 101 | 7 | 2365 | 27 |

### Multi-Seed Aggregate Summary
| Metric | Mean ($\mu$) | Standard Deviation ($\sigma$) | Minimum | Maximum |
| :--- | :---: | :---: | :---: | :---: |
| **Precision** | **91.44%** | $\pm 3.63\%$ | 86.67% | 96.08% |
| **Recall** | **84.24%** | $\pm 7.51\%$ | 73.68% | 94.55% |
| **F1-Score** | **0.8737** | $\pm 0.0316$ | 0.8340 | 0.9171 |
| **False Positive Rate (FPR)** | **0.34%** | $\pm 0.17\%$ | 0.17% | 0.67% |
| **False Negative Rate (FNR)** | **15.76%** | $\pm 7.51\%$ | 5.45% | 26.32% |

*Interpretation:* Across diverse spatial layouts and trajectory intersections, the model maintains a very low false positive rate ($\le 0.67\%$). F1 scores average $0.8737$, demonstrating consistent baseline stability across seeds.

---

## Section 3: Noise Robustness Evaluation

Evaluated across synthetic white noise standard deviations $\sigma \in [0.005, 0.015, 0.035, 0.060]$ averaged over 5 random seeds:

| Noise Condition | Noise Std ($\sigma$) | Precision (Mean) | Recall (Mean) | F1-Score (Mean) | FPR (Mean) | FNR (Mean) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Low Noise** | 0.005 | 85.09% | 88.84% | 0.8648 | 0.68% | 11.16% |
| **Medium Noise (Baseline)** | 0.015 | 91.44% | 84.24% | 0.8737 | 0.34% | 15.76% |
| **High Noise** | 0.035 | 90.36% | 74.38% | 0.8145 | 0.33% | 25.62% |
| **Very High Noise** | 0.060 | 89.68% | 70.17% | 0.7851 | 0.38% | 29.83% |

*Key Findings:*
1. Precision remains remarkably resilient ($\sim 89.7\% - 91.4\%$) even under high noise.
2. The primary degradation occurs in **Recall** (dropping from $88.8\%$ to $70.2\%$) as noise floor obscures peripheral anomaly edges, increasing False Negatives.

---

## Section 4: Anomaly-Strength Analysis

Evaluated response across synthetic anomaly amplitude ranges (arbitrary magnetic perturbation units relative to 0.45 background base):

| Anomaly Strength Category | High Anomaly Strength Range | Mean High Anomaly Score | Median High Anomaly Score | Mean Background Score | Detection Rate (Recall) | Precision | F1-Score | FPR |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Very Weak** | $0.05 - 0.15$ | 0.5897 | 0.6120 | 0.2259 | 45.70% | 37.20% | 0.4017 | 3.53% |
| **Weak** | $0.15 - 0.30$ | 0.7465 | 0.7724 | 0.1731 | 65.08% | 74.95% | 0.6919 | 1.00% |
| **Medium** | $0.30 - 0.60$ | 0.8205 | 0.8444 | 0.1389 | 83.03% | 87.28% | 0.8464 | 0.57% |
| **Strong** | $0.60 - 1.00$ | 0.8515 | 0.8650 | 0.1212 | 90.94% | 91.86% | 0.9105 | 0.38% |
| **Very Strong** | $1.00 - 2.00$ | 0.8688 | 0.8801 | 0.1067 | 94.88% | 90.04% | 0.9213 | 0.50% |

*Key Insights:*
- **Monotonic Scaling**: Anomaly scores scale monotonically with anomaly amplitude ($0.5897 \rightarrow 0.7465 \rightarrow 0.8205 \rightarrow 0.8515 \rightarrow 0.8688$).
- Clear separability exists between background scores ($\mu \approx 0.10 - 0.22$) and prominent high anomalies ($\mu \ge 0.82$).

---

## Section 5: Threshold Sensitivity Analysis

Threshold $\tau$ sweep evaluated over 5 seeds on baseline synthetic data:

| Threshold ($\tau$) | Precision | Recall | F1-Score | FPR | FNR | Mean TP | Mean FP | Mean TN | Mean FN |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **0.30** | 38.83% | **100.00%** | 0.5578 | 6.84% | 0.00% | 106.2 | 163.6 | 2230.2 | 0.0 |
| **0.35** | 48.66% | 99.55% | 0.6528 | 4.56% | 0.45% | 105.8 | 109.0 | 2284.8 | 0.4 |
| **0.40** | 57.16% | 98.66% | 0.7222 | 3.20% | 1.34% | 105.0 | 76.6 | 2317.2 | 1.2 |
| **0.45** | 64.86% | 96.76% | 0.7751 | 2.26% | 3.24% | 103.0 | 54.0 | 2339.8 | 3.2 |
| **0.50** | 72.84% | 95.78% | 0.8256 | 1.55% | 4.22% | 101.8 | 37.0 | 2356.8 | 4.4 |
| **0.55** | 80.78% | 93.00% | 0.8618 | 0.95% | 7.00% | 98.6 | 22.8 | 2371.0 | 7.6 |
| **0.60** | 86.99% | 89.30% | **0.8781** | 0.58% | 10.70% | 94.2 | 13.8 | 2380.0 | 12.0 |
| **0.65 (Baseline)** | **91.44%** | **84.24%** | **0.8737** | **0.34%** | **15.76%** | **88.6** | **8.2** | **2385.6** | **17.6** |
| **0.70** | 94.60% | 76.10% | 0.8416 | 0.18% | 23.90% | 80.0 | 4.4 | 2389.4 | 26.2 |
| **0.75** | 96.85% | 67.91% | 0.7952 | 0.09% | 32.09% | 71.2 | 2.2 | 2391.6 | 35.0 |
| **0.80** | **99.72%** | 60.95% | 0.7532 | **0.01%** | 39.05% | 63.6 | 0.2 | 2393.6 | 42.6 |

### Operational Takeaways:
1. **Recall Maximization**: $\tau = 0.30$ achieves 100% recall with an FPR of 6.84%.
2. **False Positive Minimization**: $\tau = 0.80$ minimizes false alarms (FPR = 0.01%, Precision = 99.72%).
3. **Optimal F1 Trade-off**: $\tau = 0.60 - 0.65$ yields balanced F1 ($0.874 - 0.878$).
4. **Current Recommendation**: $\tau = 0.65$ remains an optimal development default, favoring low false alarms for survey verification until empirical sea-trial noise distributions are acquired.

---

## Section 6: Cross-Condition Testing & Failure-Case Mapping

Combinations of 4 noise levels $\times$ 4 anomaly strengths were mapped to identify operational failure boundaries:

```text
                                 ANOMALY STRENGTH
NOISE LEVEL (σ)   Very Weak (0.05-0.15)   Weak (0.15-0.30)     Medium (0.30-0.60)   Strong (0.60-1.20)
------------------------------------------------------------------------------------------------------
Low (0.005)       FNR: 60.6% [FAIL-FN]    FNR: 32.0% [FAIL-FN] FNR: 20.7% [STABLE]  FNR: 7.1% [STABLE]
Medium (0.015)    FNR: 61.6% [FAIL-FN]    FNR: 39.9% [FAIL-FN] FNR: 21.7% [STABLE]  FNR: 10.0% [STABLE]
High (0.035)      FNR: 59.4% [FAIL-FN]    FNR: 43.1% [FAIL-FN] FNR: 31.5% [FAIL-FN] FNR: 16.0% [STABLE]
Very High (0.060) FNR: 69.2% [FAIL-FN]    FNR: 41.2% [FAIL-FN] FNR: 36.7% [FAIL-FN] FNR: 25.1% [STABLE]
```

### Critical Failure Cases:
1. **Failure Case 1: High Noise + Weak Anomaly (Submerged Anomaly)**
   - *Condition:* Sensor noise $\sigma \ge 0.035$ combined with anomaly strength $\le 0.30$.
   - *Failure Mode:* False negatives surge (FNR $> 40\%$). The anomaly signal magnitude is commensurate with ambient noise variance ($SNR \le 1.5$), so local rolling median baseline absorbs the disturbance.
   - *Remedy for Real Operations:* Lower vehicle altitude to enhance dipole signal amplitude or apply spatial spatial averaging over repeated passes.

2. **Failure Case 2: Very High Noise + Low Threshold (False Alarm Triggering)**
   - *Condition:* High noise ($\sigma = 0.060$) with threshold $\tau \le 0.40$.
   - *Failure Mode:* Elevated false positives ($FPR > 5\%$) caused by high-variance noise spikes mimicking small anomaly gradients.
   - *Remedy for Real Operations:* Re-calibrate $\tau$ higher during rough sea-state or high vehicle jitter surveys.

---

## Section 7: Real Sensor Data Requirements & Ingestion Verification

The pipeline has been verified to ingest single-point and streaming real sensor JSON payloads conforming to the contract:

```json
{
  "sensor_id": "SFS-001",
  "timestamp": "2026-08-26T10:32:15",
  "x": 42.0,
  "y": 18.0,
  "bx": 0.31,
  "by": 0.47,
  "bz": 0.66
}
```

The pipeline automatically computes:
$$\text{magnetic\_signal} = \sqrt{b_x^2 + b_y^2 + b_z^2} = \sqrt{0.31^2 + 0.47^2 + 0.66^2} \approx 0.8675$$
along with rolling baseline estimation, residual computation, feature extraction, Isolation Forest scoring, and formatted output contract emission.

---

## Section 8: Limitations

1. **Magnetic Perturbation Only**: The pipeline detects spatial and statistical deviations in magnetic field intensity. It **cannot** differentiate between ferrous shipwreck debris, basaltic volcanic outcrops, polymetallic nodules, or seafloor pipelines.
2. **Single-Survey Training Dependency**: Isolation Forest is trained on the survey background. Surveys crossing dramatic geological contacts require segmented baseline windows.
3. **Synthetic Threshold Assumption**: The $\tau = 0.65$ threshold is calibrated against synthetic distributions and **must** be re-calibrated during ocean trials.

---

## Section 9: Next ML Steps After Hardware Arrival

1. **Acquire Zero-Target Reference Run**: Execute Phase A background survey protocol in `real_data_collection_protocol.md`.
2. **Empirical Noise Profiling**: Measure real magnetometer $\sigma_{\text{noise}}$ and diurnal drift curves.
3. **Hard/Soft Iron Offset Calibration**: Fit sensor zero-offsets and platform magnetization matrices.
4. **Re-Fit Isolation Forest & Normalizer**: Train model on clean real seabed transects and calibrate normalizer bounds.
5. **Calibrate Operational Threshold**: Set $\tau$ based on operational requirements (e.g. high-sensitivity reconnaissance $\tau=0.50$ vs. verified anomaly confirmation $\tau=0.70$).
