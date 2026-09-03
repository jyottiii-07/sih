# Architecture & Technical Design Blueprint
## Problem Statement ID: 26064 — NCPOR / MoES Seafloor Metal Detection Sensor

---

## 1. Architectural Philosophy

The system architecture is designed around three foundational tenets:
1. **Multi-Mode Sensor Abstraction**: Hardware sensing mechanisms are decoupled through a lightweight **Sensor Adapter Layer** (`app/sensor_adapters.py`). The system dynamically handles:
   - **Single-Axis Hall-Effect Sensing** (ESP32 ADC with automatic baseline calibration and dynamic range normalization).
   - **3-Axis Magnetometer Sensing** (QMC5883L/HMC5883L physical 3-axis vector data).
   - **Mock Survey Simulation Mode** (256-point high-fidelity survey dataset).
2. **Deterministic Data Contract**: All incoming data packets are validated via Zod at the frontend boundary and Pydantic at the backend boundary before entering application state, ensuring malformed payloads cannot cause runtime crashes.
3. **Physical & Scientific Accuracy**: Single-axis Hall data is processed as a dimensionless normalized magnetic response $S_{\text{norm}} \in [0.0, 1.0]$. The system does NOT falsely claim single-axis Hall data to be 3-axis vector measurements or calibrated $\mu\text{T}$ measurements without physical tri-axial sensors.

---

## 2. Hardware Classification & Roadmap

### Current Demonstrated Physical Prototype
* **Sensor**: 4-Pin Single-Axis Hall-Effect Sensor Module (A0 to ESP32 GPIO 34 / ADC1).
* **Microcontroller**: ESP32 DOIT DEVKIT V1 (12-bit ADC, oversampling filter, WiFi HTTP/MQTT client).
* **Measurement Type**: **Magnetic anomaly detection of magnetically susceptible (ferromagnetic) targets**.
* **Operational Principle**: Magnet proximity causes Hall voltage variation, driving ADC from resting baseline ($ADC_{\text{baseline}} \approx 4095$) towards zero ($ADC \approx 0$).
* **Baseline Calibration**: Dynamic automatic calibration on startup (averaging resting samples) + dynamic range deviation normalization.
* **Internal Representation**: $B_x=0.0, B_y=0.0, B_z=S_{\text{norm}}$ is strictly an internal backward-compatible contract mapping representing the 1D active sensing axis magnitude.

### Future Upgrade: 3-Axis Tri-Axial Magnetometer
* **Sensors**: QMC5883L / HMC5883L / PNI RM3100.
* **Capability**: Full spatial magnetic vector field decomposition ($B_x, B_y, B_z$) and true geomagnetic background estimation in physical $\mu\text{T}$ engineering units.

### Future Upgrade: Non-Magnetic Metal Detection
* **Technology**: Electromagnetic Induction / Pulse Induction (PI) / Eddy-Current Sensing.
* **Capability**: Detection of non-ferrous, non-magnetic conductive ocean resources (copper, aluminum, silver, gold, manganese nodules).

---

## 3. Layered Architecture & Data Flow

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES & HARDWARE                         │
│   ┌─────────────────────────────┐    ┌─────────────────────────────┐   │
│   │   ESP32 Hall-Effect Sensor  │    │   3-Axis Magnetometer Node  │   │
│   │  (raw_adc via REST / MQTT)  │    │   (bx, by, bz via REST/MQTT)│   │
│   └──────────────┬──────────────┘    └──────────────┬──────────────┘   │
│                  │                                  │                  │
│   ┌──────────────┴──────────────────────────────────┴──────────────┐   │
│   │               Mock JSON / Timed Stream Simulator               │   │
│   └──────────────────────────────┬─────────────────────────────────┘   │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │ (HTTP POST / MQTT / Mock Feed)
┌──────────────────────────────────▼─────────────────────────────────────┐
│             BACKEND INGESTION & SENSOR ADAPTER LAYER                   │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │               SensorAdapterDispatcher                          │   │
│   │   ├── HallEffectSensorAdapter (Baseline Calib, Noise Filter)   │   │
│   │   └── Magnetometer3AxisAdapter (Vector Norm Preservation)      │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
│                                    │
│   ┌────────────────────────────────▼───────────────────────────────┐   │
│   │               ML Anomaly Scoring & Classification              │   │
│   │   ├── Hall Normalized Signal Scoring (0-1 mapping)             │   │
│   │   └── Isolation Forest / Geomagnetic Baseline Scoring          │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
│                                    │
│   ┌────────────────────────────────┴───────────────────────────────┐   │
│   ▼                                                                ▼   │
│ SQLite DB (seafloor.db)                                 WebSocket Manager
│ (Spatial/Temporal Indexes)                              (/ws/telemetry)
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ (WebSocket / REST JSON)
┌────────────────────────────────────▼───────────────────────────────────┐
│              FRONTEND ADAPTER & VALIDATION (ZOD)                       │
│   ├── ISensorDataProvider (ApiSensorProvider / MockSensorProvider)    │
│   └── Strict 10-Field Contract Validation                              │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│                    APPLICATION STATE & CONTEXT                         │
│   ├── SensorDataContext (Readings array, streaming index, selection)   │
│   └── Memoized Hooks (useSensorData, useTelemetryStats, useSurveyGrid) │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│                     PRESENTATION LAYER (UI)                            │
│   ┌───────────────┬─────────────────┬────────────────┬─────────────┐   │
│   │  Dashboard    │  Survey Grid    │   Analytics    │  Data Logs  │   │
│   │  (Overview)   │  (2D Heatmap)   │   (Charts)     │  (Export)   │   │
│   └───────────────┴─────────────────┴────────────────┴─────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Telemetry Transformation Pipeline: Hall Sensor

For incoming single-axis Hall readings, the transformation stages are:

1. **Physical Acquisition**: ESP32 reads 12-bit ADC on GPIO34 (oversampled 10x).
2. **Startup Baseline Calibration**: $ADC_{\text{baseline}} = \text{median}(\text{initial } N \text{ resting readings})$.
3. **Baseline Deviation**: $\Delta = \max(0, ADC_{\text{baseline}} - ADC_{\text{filtered}})$.
4. **Dynamic Range Normalization**:
   $$S_{\text{norm}} = \text{clamp}\left(\frac{\Delta}{ADC_{\text{baseline}} - ADC_{\text{floor}}}, 0.0, 1.0\right)$$
5. **Magnetic Signal**: $\text{magnetic\_signal} = S_{\text{norm}}$ (Dimensionless normalized magnetic response).
6. **ML Anomaly Score**: $\text{anomaly\_score} = S_{\text{norm}} \in [0.0, 1.0]$.
7. **3-Tier Classification**:
   - $0.00 \le \text{Score} < 0.40 \implies \text{normal}$
   - $0.40 \le \text{Score} < 0.70 \implies \text{weak\_anomaly}$
   - $0.70 \le \text{Score} \le 1.00 \implies \text{strong\_anomaly}$

---

## 5. Directory Layout & Module Responsibilities

```text
SIH/sih/
├── app/                           # FastAPI Backend & Multi-Sensor Engine
│   ├── main.py                    # App entrypoint, CORS, routes & WebSockets
│   ├── sensor_adapters.py         # Hall-Effect & 3-Axis normalization adapters
│   ├── routes.py                  # Ingestion & grid matrix endpoints
│   ├── database.py                # Async SQLite storage & indexing
│   ├── ml_client.py               # Scale-aware ML inference bridge
│   ├── mqtt_client.py             # MQTT background telemetry receiver
│   ├── ws_manager.py              # WebSocket connection manager
│   ├── alert_service.py           # Anomaly threshold & alert evaluator
│   └── schemas.py                 # Pydantic schemas supporting Hall & 3-axis
├── scripts/                       # Firmware & Simulation Utilities
│   ├── esp32_hall_firmware.ino    # Complete ESP32 Arduino C++ firmware
│   └── esp32_hall_simulator.py    # Python survey grid test simulator
├── calibration/                   # Calibration Module
│   └── corrector.py               # Hard-iron & soft-iron physics corrector
├── models/                        # Pre-trained ML Artifacts
│   ├── isolation_forest.joblib    # Isolation Forest anomaly detector
│   └── score_normalizer.joblib    # Calibrated score normalizer
├── src/                           # Frontend React Application & ML Pipeline
│   ├── components/                # Modular UI widgets (dashboard, survey, analytics, logs)
│   ├── context/                   # SensorDataContext application state
│   ├── hooks/                     # Custom hooks (useSensorData, useSurveyGrid, etc.)
│   ├── pages/                     # Dashboard, Survey, Analytics, Logs views
│   ├── services/                  # Unified ISensorDataProvider (API + Mock)
│   ├── utils/                     # Zod runtime validation & export utilities
│   ├── pipeline.py                # Python ML training & validation pipeline
│   ├── features.py                # Feature extraction module
│   └── anomaly_detector.py        # ML anomaly detector
├── tests/                         # Pytest Suite (79 unit & integration tests)
├── seafloor.db                    # Active SQLite database file
├── ARCHITECTURE.md                # System architectural blueprint
├── DATA-CONTRACT.md               # Strict data interchange definition
└── package.json / requirements.txt# Dependencies
```
