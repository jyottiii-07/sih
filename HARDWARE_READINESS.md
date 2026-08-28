# Seafloor Magnetometer Hardware-Readiness Guide
**Problem Statement ID:** 26064  
**Module:** Seafloor Magnetic Anomaly Detection  
**Status:** Software Readiness & Pre-Hardware Integration Preparation Complete  

> [!IMPORTANT]
> **CRITICAL SCIENTIFIC SCOPE & LIMITATIONS**:
> 1. All algorithms, test cases, and numerical calibrations developed to date are **SYNTHETIC DEVELOPMENT BASELINES**.
> 2. The pipeline is strictly an unsupervised **magnetic anomaly detector**. It measures local magnetic field disturbances relative to the ambient geomagnetic background.
> 3. The system **DOES NOT** perform mineral speciation, ore grade assay, or metal deposit confirmation.
> 4. Physical sensor calibration parameters, operating noise floors, and operational thresholds **CANNOT** be fabricated and must be empirically measured on the physical hardware.

---

## 1. Before Hardware Arrives

### A. Current ML Pipeline Status
- **Core Algorithm**: Scikit-learn `IsolationForest` (unsupervised, $n=150$ estimators, contamination=0.05).
- **Signal Preprocessing**: Total magnetic intensity $B = \sqrt{B_x^2 + B_y^2 + B_z^2}$, robust centered rolling median baseline, signed residual calculation.
- **Feature Extraction**: 12 directional, statistical, signal-to-noise, and spatial gradient features (`bx, by, bz, magnetic_signal, baseline_B, residual, normalized_deviation, rolling_mean, rolling_std, local_min, local_max, spatial_gradient_mag`).
- **Score Normalization**: Calibrated min-max scaling mapping raw decision scores into bounded continuous $[0.0, 1.0]$.
- **Classification Decision**: Configurable threshold $\tau$ (current development baseline $\tau = 0.65$; synthetic F1 reference $\tau = 0.60$).
- **Software Test Suite**: 100% passing automated test suite covering end-to-end inference, data quality auditing, calibration mathematics, and data immutability.

### B. Required Physical Sensor Specifications
The physical hardware team must provide the following parameters upon hardware delivery:

| Specification Parameter | Current Placeholder Status in Software | Requirement Upon Hardware Delivery |
| :--- | :--- | :--- |
| **Sensor Model & Type** | `UNKNOWN — REQUIRES HARDWARE SPECIFICATION` | Specify exact sensor type (e.g. 3-axis fluxgate, AMR, optically pumped cesium, Overhauser). |
| **Physical Measurement Unit** | `arbitrary_magnetic_units` | Define unit: MicroTesla ($\mu\text{T}$), NanoTesla ($\text{nT}$), or Gauss ($\text{G}$). |
| **Measurement Scale Factor** | `1.0` (Identity multiplier) | Raw ADC count-to-magnetic field conversion multiplier (e.g. $\text{nT/LSB}$). |
| **Dynamic Sensor Range** | `[-100.0, 100.0]` | Full-scale linear range before saturation (e.g. $\pm 70,000\text{ nT}$ for geomagnetic fluxgates). |
| **Nominal Sampling Rate** | `1.0 Hz` | Measured acquisition frequency in Hz (e.g. $1\text{ Hz}, 10\text{ Hz}, 50\text{ Hz}$). |
| **ADC Resolution** | `null` | Resolution in bits (e.g. 16-bit, 24-bit ADC). |
| **Intrinsic Noise Floor** | `0.015` | Measured RMS noise standard deviation in a magnetically shielded zero-field chamber or quiet site. |
| **Survey Platform Velocity** | `5.0 m/s` (Max plausible velocity) | Operating speed of ROV / AUV / towed sled platform. |
| **Sensor Operating Altitude** | `UNKNOWN` | Nominal altitude above seabed ($1.0 - 5.0\text{ m}$). |

### C. Expected Raw Telemetry Schema
The ML ingestion pipeline natively consumes standard telemetry JSON records:

```json
{
  "sensor_id": "SFS-001",
  "timestamp": "2026-08-27T10:00:00.000Z",
  "x": 42.15,
  "y": 18.30,
  "bx": 0.1845,
  "by": 0.1725,
  "bz": 0.3488
}
```

*Note: Raw telemetry files deposited into `data/raw/` are strictly read-only and immutable.*

### D. Sensor Calibration Mathematical Framework
The calibration module (`ml/calibration/`) is prepared to execute:
$$\mathbf{B}_{\text{corrected}} = \mathbf{M}_{\text{soft}} \cdot (\mathbf{B}_{\text{raw}} - \mathbf{b}_{\text{hard}})$$
where:
- $\mathbf{b}_{\text{hard}} \in \mathbb{R}^3$ compensates for constant platform permanent magnetization.
- $\mathbf{M}_{\text{soft}} \in \mathbb{R}^{3 \times 3}$ compensates for scale factor asymmetry and cross-axis alignment errors.

---

## 2. Immediately After Hardware Arrives: 10-Step Execution Protocol

Execute these steps in strict chronological sequence before declaring the system ready for sea survey operations:

```text
[Step 1]  Verify physical sensor telemetry output matches JSON schema.
    ↓
[Step 2]  Verify physical measurement units (µT, nT, or Gauss) and update config.yaml.
    ↓
[Step 3]  Measure real hardware sampling rate and timestamp jitter over 10 minutes.
    ↓
[Step 4]  Log raw uncalibrated telemetry directly to data/raw/ (verify immutability).
    ↓
[Step 5]  Perform 3D rotation calibration experiments (hard-iron & soft-iron parameter fitting).
    ↓
[Step 6]  Collect zero-target background data in a clean survey sector.
    ↓
[Step 7]  Quantify real sensor noise variance (sigma_noise) under static and mobile conditions.
    ↓
[Step 8]  Quantify sensor thermal and diurnal drift over a 1-hour static baseline.
    ↓
[Step 9]  Run controlled target experiments (known ferrous masses at calibrated standoff distances).
    ↓
[Step 10] Only then re-train Isolation Forest and calibrate operational threshold tau.
```

### Detailed Execution Guidelines:
1. **Step 1 — Verify Sensor Output**: Ingest live test streams into `src.data_quality.audit_sensor_data()`. Ensure zero `INVALID` classifications.
2. **Step 2 — Verify Units**: Set `sensor.measurement_unit` in `config.yaml` to the verified physical unit. Set `sensor.scale_factor` to convert raw digitizer counts to engineering units.
3. **Step 3 — Measure Sampling Rate**: Compute empirical inter-sample $\Delta t = t_{i} - t_{i-1}$. Set `sensor.nominal_sampling_rate_hz` to actual mean frequency.
4. **Step 4 — Record Raw Data**: Archive all initial tests in `data/raw/`. Calculate and log SHA-256 hashes using `src.data_preservation.compute_file_sha256()`.
5. **Step 5 — Calibration Maneuvers**: Rotate sensor through full $4\pi$ steradians (all pitch, roll, yaw orientations) in a uniform geomagnetic field. Fit $\mathbf{b}_{\text{hard}}$ and $\mathbf{M}_{\text{soft}}$ using `MagnetometerCalibrator.fit_from_rotations()`. Save parameters to `calibration/parameters/sensor_calibrated.json`.
6. **Step 6 — Background Baseline**: Execute $\ge 3$ transects over a verified clean seafloor sector. Preprocess via `preprocess_pipeline()`.
7. **Step 7 — Noise Floor**: Calculate standard deviation of high-frequency residuals ($B - B_{\text{baseline}}$). Update `sensor.nominal_noise_floor_std`.
8. **Step 8 — Drift Analysis**: Monitor baseline drift rate ($dB_{\text{baseline}}/dt$). Verify baseline rolling window ($W \approx 31$ samples) sufficiently detrends drift without clipping survey anomalies.
9. **Step 9 — Controlled Targets**: Place reference test targets (known magnetic moments). Make passes at altitudes of $1.0\text{ m}, 2.0\text{ m}, 3.0\text{ m}, 5.0\text{ m}$. Measure detected signal peak amplitude vs. distance.
10. **Step 10 — Model Calibration**: Fit Isolation Forest on calibrated background survey lines. Calibrate score normalizer bounds. Evaluate operational threshold $\tau$:
    - For high-sensitivity exploration (higher recall, accepting modest false positives): $\tau = 0.50 - 0.60$.
    - For high-confidence anomaly confirmation (minimal false positives): $\tau = 0.65 - 0.75$.
