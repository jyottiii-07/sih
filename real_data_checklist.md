# Seafloor Magnetometer Real-Data Integration Checklist
**Problem Statement ID:** 26064  
**Scope:** Physical Sensor Arrival & Sea-Trial Verification Sequence  

---

> [!IMPORTANT]
> **SCIENTIFIC NOTICE**:
> Do not check off any item until physical sensor measurements are acquired and verified.
> The ML model detects **magnetic anomalies only**; it does not confirm mineral presence.

---

## 1. Hardware Verification & Sensor Specifications
- [ ] **Sensor model recorded**: Document manufacturer, model number, magnetometer architecture (fluxgate / AMR / optically pumped), and serial number.
- [ ] **Sensor unit verified**: Confirm whether hardware outputs nanoTesla ($\text{nT}$), microTesla ($\mu\text{T}$), or Gauss ($\text{G}$). Update `sensor.measurement_unit` and `sensor.scale_factor` in `config.yaml`.
- [ ] **Sampling rate measured**: Log 10 minutes of live output to compute empirical $\Delta t$ and mean sampling frequency (Hz). Update `sensor.nominal_sampling_rate_hz`.
- [ ] **Resolution verified**: Confirm ADC digitizer bit-depth and effective least significant bit (LSB) sensitivity.
- [ ] **Raw Bx/By/Bz verified**: Confirm right-handed coordinate frame convention (X = forward/along-track, Y = starboard/cross-track, Z = down/vertical).
- [ ] **Timestamp verified**: Confirm UTC ISO-8601 formatting and GPS time synchronization without clock drift.
- [ ] **Coordinate system defined**: Establish spatial positioning datum (e.g. USBL acoustic positioning or local relative grid meters from acoustic transponder).

---

## 2. Pre-Survey Calibration & Baseline Profiling
- [ ] **Calibration data collected**: Execute full 3D rotation maneuvers ($4\pi$ steradians) on survey platform at sea or clean non-magnetic calibration range.
- [ ] **Calibration parameters estimated**: Run `MagnetometerCalibrator.fit_from_rotations()` to compute hard-iron vector $\mathbf{b}_{\text{hard}}$ and soft-iron matrix $\mathbf{M}_{\text{soft}}$. Archive to `calibration/parameters/sensor_calibrated.json`.
- [ ] **Background survey collected**: Execute at least 3 parallel transects in a known target-free seabed sector.
- [ ] **Sensor noise measured**: Calculate residual standard deviation ($\sigma_{\text{noise}}$) during static and mobile zero-target passes.
- [ ] **Sensor drift measured**: Monitor diurnal variation and sensor thermal drift across a 1-hour static baseline.

---

## 3. Controlled Experimental Target Passes
- [ ] **Controlled target data collected**: Deploy known reference test body (calibrated mass/magnetic moment) and execute passes across multiple standoff distances ($1\text{ m}, 2\text{ m}, 3\text{ m}, 5\text{ m}$).
- [ ] **Repeat measurements collected**: Execute $\ge 5$ repeat runs per configuration to evaluate spatial repeatability and SNR decay over distance.

---

## 4. Operational ML Re-Training & Validation
- [ ] **Real-data quality checked**: Run `src.data_quality.audit_sensor_data()`. Verify zero `INVALID` classifications, and inspect `WARNING` flags.
- [ ] **Raw data immutability verified**: Verify `data/raw/` files are marked read-only and compute SHA-256 integrity hashes using `src.data_preservation.compute_file_sha256()`.
- [ ] **Isolation Forest retrained**: Fit unsupervised Isolation Forest on clean background survey transects (`data/processed/`).
- [ ] **Threshold calibrated**: Tune decision threshold $\tau$ against background noise distributions (e.g. $\tau = 0.50$ for reconnaissance vs. $\tau = 0.70$ for high-confidence localized detection).
- [ ] **Independent validation performed**: Evaluate detection performance on held-out controlled target transects before commencing full production survey operations.
