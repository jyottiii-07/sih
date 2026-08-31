# Implementation Plan — Seafloor Magnetic Anomaly Detection ML Module

**Problem Statement ID:** 26064  
**Title:** Low-Cost Deployable Seafloor Metal Detection Sensor for Ocean Resource Exploration (ML Module)

---

## 1. Problem Understanding & Scope Boundaries

### Objective
Develop a modular, standalone, and strictly scoped **Machine Learning & Data Processing Pipeline** capable of detecting seafloor magnetic field anomalies and categorizing readings into **LOW_ANOMALY** or **HIGH_ANOMALY** relative to the local background geomagnetic field.

### Strict Scope Constraints (What We Will NOT Build)
* ❌ No Frontend / UI / Heatmap visualizers
* ❌ No Backend servers (FastAPI/Flask/Node.js) or database layers
* ❌ No Hardware/Firmware/ESP32/PCB/Serial/WiFi communication implementations
* ❌ No multi-class mineral categorization (e.g. nodule, sulphide, crust, iron, copper)
* ❌ No deep learning (CNN/LSTM/Transformer) without real-world data justification

---

## 2. Proposed ML Architecture

```
Raw Sensor Input (JSON / Stream / Batch)
        │
        ▼
[1. Data Validation & Schema Verification]
        │
        ▼
[2. Preprocessing & Temporal/Spatial Ordering]
        │
        ▼
[3. Magnetic Signal Calculation: B = √(bx² + by² + bz²)]
        │
        ▼
[4. Background & Baseline Estimation (Moving Median / Spatial Filter)]
        │
        ▼
[5. Feature Engineering (Residuals, Gradients, Rolling Statistics)]
        │
        ▼
[6. Isolation Forest Anomaly Detection]
        │
        ▼
[7. Anomaly Score Normalization (0.0 to 1.0)]
        │
        ▼
[8. Configurable Decision Thresholding]
        │
        ├──────────────────────┬──────────────────────┤
        ▼                                             ▼
  LOW_ANOMALY (< threshold)                     HIGH_ANOMALY (≥ threshold)
        │                                             │
        └──────────────────────┬──────────────────────┘
                               ▼
            Output Data Contract (JSON Prediction)
```

---

## 3. Data Contracts & Schemas

### Input Data Contract (Single Reading or Array of Readings)
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

### Output Data Contract
```json
{
  "sensor_id": "SFS-001",
  "timestamp": "2026-08-26T10:32:15",
  "x": 42.0,
  "y": 18.0,
  "bx": 0.31,
  "by": 0.47,
  "bz": 0.66,
  "magnetic_signal": 0.8675,
  "anomaly_score": 0.8921,
  "classification": "high_anomaly"
}
```
*Allowed `classification` values:* `"low_anomaly"` | `"high_anomaly"`

---

## 4. Repository Structure

```text
ml/
├── README.md
├── requirements.md
├── design.md
├── task.md
├── implementation_plan.md
│
├── config/
│   └── default_config.yaml
│
├── data/
│   ├── raw/
│   ├── synthetic/
│   └── processed/
│
├── models/
│   └── saved_models/
│
├── notebooks/
│   └── exploratory_analysis.ipynb
│
├── src/
│   ├── __init__.py
│   ├── config.py
│   ├── data_generator.py
│   ├── validation.py
│   ├── preprocessing.py
│   ├── features.py
│   ├── anomaly_detector.py
│   ├── scoring.py
│   ├── prediction.py
│   └── pipeline.py
│
├── tests/
│   ├── __init__.py
│   ├── test_validation.py
│   ├── test_magnetic_signal.py
│   ├── test_features.py
│   ├── test_model.py
│   ├── test_scoring.py
│   └── test_pipeline_integration.py
│
└── outputs/
    ├── predictions/
    └── reports/
```

---

## 5. Technical Component Strategies

### 1. Synthetic Data Generator (`data_generator.py`)
- **Physics-Informed Background:** Simulates Earth's background geomagnetic field (magnitude ~0.3 - 0.6 Gauss / 30-60 µT) with low-frequency spatial trend drift + Gaussian sensor noise ($\mu=0, \sigma=0.01$).
- **Low Anomaly Simulation:** Small localized magnetic field deviations ($+0.05 \text{ to } +0.15 \times \text{baseline}$), representative of minor geological variations or distant signatures.
- **High Anomaly Simulation:** Prominent localized dipolar/monopolar magnetic field spikes ($+0.4 \text{ to } +2.0 \times \text{baseline}$), representative of concentrated metallic bodies / seabed sulfide structures.
- **Controllable Parameters:** Grid dimensions $(X, Y)$, sensor trajectory (grid survey / random walk), noise level, anomaly count, anomaly radii, and fixed random seed for reproducible benchmark datasets.

### 2. Validation & Preprocessing (`validation.py`, `preprocessing.py`)
- **Strict Validation Rules:** Non-null check on required keys (`sensor_id`, `timestamp`, `x`, `y`, `bx`, `by`, `bz`), finite float checks (no `NaN`/`Inf`), timestamp parse validation, and coordinate range sanity checks.
- **Magnetic Magnitude Computation:** $B = \sqrt{bx^2 + by^2 + bz^2}$.
- **Baseline Estimation:** Robust moving median window (temporal or spatial nearest neighbors) to prevent high-amplitude anomaly spikes from skewing the background estimate.

### 3. Feature Engineering (`features.py`)
- **Primary Signals:** `bx`, `by`, `bz`, `magnetic_signal` ($B$).
- **Baseline Differentials:**
  - `baseline_B`: local estimated background field.
  - `residual_B`: $B - \text{baseline\_B}$.
  - `normalized_deviation`: $\frac{|B - \text{baseline\_B}|}{\text{rolling\_std}(B) + \epsilon}$.
- **Local Window Statistics:** `rolling_mean`, `rolling_std`, `rolling_min`, `rolling_max`, `local_range` ($max - min$).
- **Spatial Gradients (when spatial ordering available):** $\nabla_x B \approx \frac{\Delta B}{\Delta x}$, $\nabla_y B \approx \frac{\Delta B}{\Delta y}$, $\nabla_{mag} = \sqrt{\nabla_x^2 + \nabla_y^2}$.

### 4. Isolation Forest Strategy (`anomaly_detector.py`)
- **Model Choice:** Scikit-learn `IsolationForest`.
- **Hyperparameters:** Configurable `n_estimators` (default: 150), `contamination` (estimated expected anomaly fraction, e.g. 0.05 - 0.10 for synthetic benchmarks), `max_samples` ("auto" / 256), `random_state` (42).
- **Persistence:** Save/load models and fitted baseline scalers via standard serialization (`joblib`).

### 5. Anomaly Scoring & Thresholding (`scoring.py`, `prediction.py`)
- **Score Computation:** Convert raw Isolation Forest decision function output $s(x)$ to a standardized $[0.0, 1.0]$ score using MinMax/Sigmoid scaling calibrated against training background baseline.
- **Threshold Decision:**
  $$\text{Classification} = \begin{cases} \text{"high\_anomaly"} & \text{if } \text{anomaly\_score} \ge \tau \\ \text{"low\_anomaly"} & \text{if } \text{anomaly\_score} < \tau \end{cases}$$
- Default synthetic development threshold: $\tau = 0.65$ (fully configurable via config/cli/args).

---

## 6. Testing & Evaluation Strategy

### Test Suites (`pytest`)
1. `test_validation.py`: Null/missing fields, NaN/Inf values, invalid timestamp string formats, malformed types.
2. `test_magnetic_signal.py`: Known vector norms, e.g., $\sqrt{0.3^2 + 0.4^2 + 0.0^2} = 0.5$, boundary condition tests.
3. `test_features.py`: Exact computation of residual, rolling mean/std, spatial gradient approximations.
4. `test_model.py`: Fit, predict, serialization round-trip, handling unseen inputs.
5. `test_scoring.py`: Normalized score bounded in $[0.0, 1.0]$, monotonicity test with varying anomaly injection strengths.
6. `test_pipeline_integration.py`: End-to-end JSON in $\to$ JSON out compliance with strict contract.

### Evaluation Metrics (for benchmark synthetic experiments)
- Precision, Recall, F1-Score on injected synthetic anomalies.
- Confusion Matrix (Background/Low vs High).
- Score separation analysis (ROC curve, AUC-PR, score distribution histogram).
- Explicit scientific disclaimer: *These evaluation metrics benchmark synthetic discriminability only and must be re-calibrated when real sea-trial sensor data is ingested.*

---

## 7. Migration Roadmap to Real Sensor Data

```
Phase A: Synthetic Dev (Current)
└── Benchmark features & pipeline with controlled synthetic simulations.

Phase B: In-Lab / Test Tank Calibration
└── Collect baseline sensor noise profile; calibrate temperature/sensor bias drift.

Phase C: Sea-Trial Ingestion & Re-training
└── Ingest real seabed magnetometer logs; recompute baseline field distributions; recalibrate threshold τ.
```

---

## 8. Definition of Done (DoD)

1. Complete clean `ml/` repository structure created.
2. Synthetic data generator capable of producing realistic seabed background noise and multi-scale anomalies.
3. Modular, typed, well-documented Python source code for each pipeline stage.
4. 100% passing test suite across all unit and integration test modules.
5. Full documentation (`README.md`, `design.md`, `requirements.md`, `task.md`, `implementation_plan.md`) without scope creep.
6. Verified sample run producing exact JSON contract output.
