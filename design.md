# Technical Design Document — Seafloor Magnetic Anomaly Detection ML Module

**Problem ID:** 26064  
**Scope:** Strictly Machine Learning / Data Processing

---

## 1. System Architecture Overview

The ML module is organized as a sequential, deterministic data processing and anomaly detection pipeline:

```text
[Raw Reading JSON / Batch Data]
               │
               ▼
   [ Stage 1: Validation ]       ──► Checks schema, datatypes, bounds, NaN/Inf
               │
               ▼
  [ Stage 2: Preprocessing ]     ──► Time-series/spatial sorting, index alignment
               │
               ▼
[ Stage 3: Magnetic Magnitude ]  ──► B = √(bx² + by² + bz²)
               │
               ▼
[ Stage 4: Baseline Estimation]  ──► Rolling median / local background B_0
               │
               ▼
[ Stage 5: Feature Engineering ] ──► Residuals, normalized dev, rolling std/mean, gradients
               │
               ▼
[ Stage 6: Isolation Forest ]    ──► Tree-based partition isolation of residual features
               │
               ▼
[ Stage 7: Score Normalization]  ──► Normalized anomaly score ∈ [0.0, 1.0]
               │
               ▼
 [ Stage 8: Threshold Decision ] ──► Binary decision: low_anomaly vs high_anomaly
               │
               ▼
    [ Prediction JSON Output ]
```

---

## 2. Mathematical Formulations & Feature Engineering

### 2.1 Magnetic Signal Calculation
Given tri-axial magnetic sensor components $(bx, by, bz)$:
$$B = \sqrt{bx^2 + by^2 + bz^2}$$

### 2.2 Background / Baseline Estimation
A rolling median filter is applied to the time series / spatial trajectory with window size $W$:
$$\text{baseline}_B(t) = \text{median}(\{B(t-k), \dots, B(t), \dots, B(t+k)\})$$
*Rationale:* Median is chosen over mean because high-amplitude anomaly spikes do not bias the median baseline.

### 2.3 Feature Set & Scientific Rationales

| Feature Name | Mathematical Definition | Scientific Rationale |
| :--- | :--- | :--- |
| `bx`, `by`, `bz` | Raw sensor axes | Preserves directional magnetization vector information. |
| `magnetic_signal` | $B = \sqrt{bx^2 + by^2 + bz^2}$ | Rotation-invariant total magnetic field intensity. |
| `baseline` | $\text{baseline}_B$ | Represents ambient background geomagnetic field. |
| `deviation_from_baseline` | $B - \text{baseline}_B$ | Signed residual; isolated localized field disturbance. |
| `normalized_deviation` | $\frac{\|B - \text{baseline}_B\|}{\sigma_{\text{local}} + \epsilon}$ | Standardized anomaly magnitude relative to local background noise. |
| `rolling_mean` | $\frac{1}{W} \sum_{i=1}^W B_i$ | Local smoothed background trend. |
| `rolling_std` | $\sqrt{\frac{1}{W} \sum (B_i - \bar{B})^2}$ | Measures local magnetic texture/variance. |
| `local_min`, `local_max` | $\min(B_W), \max(B_W)$ | Dynamic envelope bounds over window $W$. |
| `spatial_gradient_mag` | $\sqrt{\left(\frac{\Delta B}{\Delta x}\right)^2 + \left(\frac{\Delta B}{\Delta y}\right)^2}$ | Detects spatial sharpness/boundaries of metallic anomalies. |

---

## 3. Model Design: Isolation Forest

### 3.1 Unsupervised Approach Rationale
1. **Absence of Real Ground Truth:** In ocean-bottom metal exploration, exhaustive ground truth labels do not exist prior to deployment.
2. **Anomaly Rarity Assumption:** Magnetic anomalies from seafloor metallic deposits (e.g., massive sulfides) are spatially localized and represent a small fraction of the surveyed area.
3. **Partition Efficiency:** Isolation Forest isolates anomalous points by randomly selecting a feature and a split value. Anomalies require fewer recursive partitions (shorter path lengths) to isolate.

### 3.2 Hyperparameters & Configuration
* `n_estimators`: `150` (Ensemble stability)
* `contamination`: `"auto"` or configurable (e.g. `0.05` for synthetic baseline)
* `max_samples`: `256` (Prevents masking/swamping effects)
* `random_state`: `42` (Deterministic reproducibility)

---

## 4. Anomaly Scoring & Binary Thresholding

### 4.1 Normalized Anomaly Score
The raw decision function $s(x) \in (-\infty, +\infty)$ from Isolation Forest is mapped into a normalized $[0.0, 1.0]$ score using fitted calibration bounds:
$$\text{score}(x) = \text{clip}\left(\frac{s(x) - s_{\min}}{s_{\max} - s_{\min}}, 0.0, 1.0\right)$$
where $0.0$ represents typical background noise and $1.0$ represents maximum anomalous deviation.

> **Scientific Caution:** This score is initially a *development anomaly score* based on synthetic baseline calibrations. It does not represent absolute physical deposit grade until calibrated with real sea-trial sensor data.

### 4.2 Thresholding Logic
With a user-configurable decision threshold $\tau \in [0.0, 1.0]$ (default: `0.65`):
$$\text{classification} = \begin{cases} \text{"high\_anomaly"} & \text{if } \text{anomaly\_score} \ge \tau \\ \text{"low\_anomaly"} & \text{if } \text{anomaly\_score} < \tau \end{cases}$$

---

## 5. Synthetic Data Generation Strategy

The synthetic generator (`data_generator.py`) generates benchmark survey tracks simulating:
1. **Earth's Ambient Field:** Base field $B_0 \approx 0.45 \text{ Gauss}$ with smooth spatial gradients ($\Delta B_0 \sim 0.001 / \text{meter}$).
2. **Sensor & Ambient Noise:** Gaussian noise $\mathcal{N}(0, 0.015)$ + random walk drift.
3. **Low Anomalies:** Sub-threshold minor mineralizations ($+0.05 - 0.15 \text{ Gauss}$, radius $1-3 \text{ m}$).
4. **High Anomalies:** Concentrated high-susceptibility dipole/monopole signatures ($+0.40 - 1.50 \text{ Gauss}$, radius $3-8 \text{ m}$).

---

## 6. Migration Roadmap to Real Sensor Data

```text
[ Synthetic Benchmark ] ──► [ Lab/Tank Testbed ] ──► [ Sea-Trial Deployment ]
  • Algorithmic baseline     • Sensor bias/drift       • Real seabed background
  • Feature verification      • Noise characterization  • Recalibrated threshold τ
```
When real sensor readings arrive:
1. Validate inputs against the identical JSON input contract.
2. Ingest background survey segments to fit the baseline estimator and feature scalers.
3. Retrain/recalibrate the Isolation Forest on verified background data.
4. Tune decision threshold $\tau$ using physical core samples or ground-truth survey lines.

---

## 7. Sensor Calibration Architecture

To compensate for platform permanent magnetic bias and induced magnetic distortion before feature extraction:
$$\mathbf{B}_{\text{corrected}} = \mathbf{M}_{\text{soft}} \cdot (\mathbf{B}_{\text{raw}} - \mathbf{b}_{\text{hard}})$$

- **Hard-Iron Vector ($\mathbf{b}_{\text{hard}}$)**: Constant 3D bias vector removed by direct vector subtraction.
- **Soft-Iron Matrix ($\mathbf{M}_{\text{soft}}$)**: 3x3 transformation matrix compensating for anisotropic scale and cross-axis alignment errors.
- **Calibration Estimation**: Derived via least-squares ellipsoid fitting on 3D rotation maneuvers (`fit_from_rotations()`).
- **Software Test Harness**: Verified in `calibration/synthetic_calibration_test.py` with reported $L_2$ norm residuals.

---

## 8. Real-Data Quality & Immutability Architecture

- **Quality Engine (`src/data_quality.py`)**: Audits telemetry streams against non-finite values, duplicate timestamps, irregular sampling intervals ($\Delta t$), out-of-range readings, flatlines/dropouts, magnetic spikes, and coordinate discontinuities.
  - Telemetry is flagged with standardized diagnostic states (`VALID`, `WARNING`, `INVALID`) without silent deletion of records.
- **Raw Data Immutability (`src/data_preservation.py`)**: Strict separation of storage tiers (`data/raw/` vs `data/processed/` vs `data/features/` vs `data/predictions/`) with SHA-256 integrity hashing ensuring raw sensor telemetry remains untouched.
- **Experimental Post-Processing (`src/consistency_filter.py`)**: Downstream spatial/temporal consistency layer to distinguish isolated transient noise spikes from contiguous spatial anomalies.

---

## 9. Held-Out Evaluation & Leakage Prevention Architecture

To avoid optimistic bias and evaluate out-of-sample generalization on marine spatial time series:

### 9.1 The Leakage Hazard of Random Splitting
- **Spatial Autocorrelation**: Magnetic anomalies from seabed targets span spatial footprints ($r \sim 4 - 8\text{ m}$). Random row splitting scatters points from the same anomaly across both train and test partitions, enabling artificial memorization.
- **Temporal/Window Leakage**: Features rely on centered rolling medians and standard deviations ($W=31$). Shuffling samples would compute test features from adjacent training readings.

### 9.2 Block / Trajectory-Aware Split (`block_trajectory`)
- The continuous lawnmower survey path is partitioned into disjoint contiguous spatial transects:
  - **Training Block**: First 70% of continuous survey trajectory.
  - **Held-Out Test Block**: Remaining 30% of continuous survey trajectory.
- **Independence Enforcements**:
  1. **Disjoint Index Sets**: $\text{train\_indices} \cap \text{test\_indices} = \emptyset$.
  2. **Feature Isolation**: `ground_truth_label` is stripped prior to feature engineering and never enters the ML feature set.
  3. **Model & Normalizer Scope**: Isolation Forest and `AnomalyScoreNormalizer` are fitted exclusively on the training block.
  4. **Unseen Test Preprocessing**: Test readings are preprocessed and scored strictly out-of-sample.
  5. **Unbiased Threshold**: Decision threshold $\tau = 0.65$ is evaluated as a static development baseline without tuning on the test set.


