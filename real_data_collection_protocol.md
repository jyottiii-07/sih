# Seafloor Magnetic Sensor Real-Data Collection Protocol & Migration Guide
**Problem Statement ID:** 26064  
**Scope:** Magnetometer Calibration, Experimental Acquisition & ML Migration  

---

## 1. Overview and Operational Purpose

This protocol establishes the standardized procedure for acquiring, logging, and structuring marine magnetometry data when physical seabed sensors (e.g., fluxgate, optically pumped, or AMR magnetometers on AUV/ROV/towed sled platforms) arrive.

> [!IMPORTANT]
> **CRITICAL SCIENTIFIC SCOPE**:
> The ML model is strictly an **unsupervised magnetic anomaly detector**. It measures perturbations and deviations in local total magnetic field intensity relative to ambient geomagnetic background. It **DOES NOT** perform mineral speciation, chemical assay, or metal deposit confirmation.

---

## 2. Experimental Data Collection Protocol

### Phase A: Background Calibration Data (Zero-Target Surveys)
Collect continuous baseline readings in a clean, target-free marine sector prior to anomaly trials.

* **Objectives**:
  1. **Natural Background Estimation**: Characterize the ambient regional geomagnetic field ($B_{\text{bg}}$) at the survey latitude/longitude.
  2. **Intrinsic Noise Floor Quantification**: Measure sensor high-frequency noise variance ($\sigma_{\text{sensor}}$) under static and mobile conditions.
  3. **Low-Frequency Drift Profiling**: Log diurnal geomagnetic variation, temperature-induced drift, and platform motion artifacts over time.
  4. **Spatial Gradient Baseline**: Map ambient regional spatial trend slope along survey transects.
* **Procedure**:
  - Run at least 3 parallel survey lines (minimum 200–500 meters length) with zero known metallic/mineralized targets.
  - Maintain steady vehicle velocity and altitude off the seabed (e.g., $1.0 - 2.0\text{ m/s}$ at $2 - 5\text{ m}$ altitude).
  - Record continuously at fixed sampling frequency ($1 - 10\text{ Hz}$).

---

### Phase B: Controlled Anomaly Trials (Known Reference Targets)
Perform systematic passes over calibrated ferromagnetic and magnetic reference targets of known mass, geometry, and magnetic susceptibility.

* **Parameter Variations**:
  1. **Varying Standoff Distances**: Altitudes of $1.0\text{ m}, 2.0\text{ m}, 3.0\text{ m}, 5.0\text{ m}, 8.0\text{ m}$.
  2. **Spatial Offsets & Grid Angles**: Cross directly overhead ($dx=0$), and with lateral offsets ($dx = \pm 1\text{ m}, \pm 2\text{ m}, \pm 5\text{ m}$).
  3. **Target Orientations**: Orient magnetic dipole along X (survey track), Y (cross-track), and Z (vertical).
  4. **Replicated Passes**: Execute $\ge 5$ repeat passes per configuration to quantify measurement repeatability.
  5. **Environmental Conditions**: Low sea-state vs. high current conditions to evaluate vehicle motion jitter.

---

### Phase C: Comprehensive Metadata Schema
Every acquisition run must accompany a standardized JSON/CSV metadata manifest.

#### Required Telemetry Schema (per reading):
```json
{
  "sensor_id": "SFS-001",
  "timestamp": "2026-08-26T10:32:15.120Z",
  "x": 42.15,
  "y": 18.30,
  "z_depth": -124.50,
  "altitude": 3.20,
  "bx": 0.3104,
  "by": 0.4712,
  "bz": 0.6621
}
```

#### Experimental Trial Metadata Log:
```json
{
  "trial_id": "TRIAL-202609-014",
  "sensor_model": "Marine-Fluxgate-3AX",
  "target_id": "CAL-STEEL-50KG",
  "target_type": "known_ferrous_reference",
  "target_ground_truth_x": 42.0,
  "target_ground_truth_y": 18.0,
  "target_depth_m": 127.7,
  "pass_direction_deg": 90.0,
  "nominal_altitude_m": 3.0,
  "water_temperature_c": 4.2,
  "sea_state": "Calm (SS1)",
  "raw_data_file": "data/raw/trial_202609_014_raw.json"
}
```

---

## 3. Raw Data Preservation Standard

To ensure scientific integrity and auditability:
1. **Never mutate raw data**: Raw sensor logs are deposited into `data/raw/` with read-only permissions.
2. **Deterministic Processing**: All filtering, baseline subtraction, and feature engineering must run via reproducible pipeline scripts.
3. **Artifact Directory Hierarchy**:
   ```text
   data/
   ├── raw/           # Untouched raw sensor telemetry
   ├── processed/     # Validated and baseline-subtracted datasets
   ├── features/      # Model feature matrices
   └── predictions/   # Anomaly score outputs and classifications
   ```

---

## 4. Real-Data Migration Workflow

When physical seabed sensor data becomes available, the transition from synthetic development to operational inference proceeds through the following verified pipeline:

```text
Real Sensor Telemetry (data/raw/)
               ↓
[1. Strict Schema & Bounds Validation] (validate_sensor_dataframe)
               ↓
[2. Hard-Iron / Soft-Iron Calibration] (Optional sensor offset correction)
               ↓
[3. Chronological Time-Series Sorting]
               ↓
[4. Total Magnetic Field Calculation] (B = sqrt(bx^2 + by^2 + bz^2))
               ↓
[5. Rolling Baseline Estimation] (estimate_baseline - Median Filter)
               ↓
[6. Feature Extraction] (FeatureExtractor - 12 Geophysical Features)
               ↓
[7. Isolation Forest Model] (Unsupervised Spatial Scoring)
               ↓
[8. Score Normalization] (AnomalyScoreNormalizer - MinMax Calibrated)
               ↓
[9. Threshold Calibration] (Decision Boundary tau tuned on background runs)
               ↓
Standardized Output Contract (LOW_ANOMALY / HIGH_ANOMALY)
```

Synthetic data will be 100% replaced by real sensor data without architectural changes to the preprocessing, feature extraction, or isolation forest modules.
