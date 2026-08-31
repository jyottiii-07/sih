# Locked Data Contract Specification
## Problem Statement ID: 26064 — NCPOR / MoES Seafloor Metal Detection Sensor Frontend

> [!IMPORTANT]
> **LOCKED CONTRACT NOTICE**: The telemetry schema is strictly limited to exactly the 10 confirmed fields documented below. The frontend runtime validation rejects any extra physical sensor fields (such as depth, temperature, GPS, pressure, salinity, battery) or missing mandatory fields.

---

## 1. Complete Schema Definition

```json
{
  "sensor_id": "SFS-001",
  "timestamp": "2026-08-26T10:32:15.000Z",
  "x": 42.0,
  "y": 18.0,
  "bx": 0.31,
  "by": 0.47,
  "bz": 0.66,
  "magnetic_signal": 0.82,
  "anomaly_score": 0.91,
  "classification": "strong_anomaly"
}
```

---

## 2. Field-by-Field Reference

| Field Name | Type | Required | Classification Category | Description & Frontend Usage | Validation Constraints |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `sensor_id` | `string` | **Yes** | Raw Telemetry | Unique hardware identifier for the seafloor sensor node. Displayed in active telemetry badge and logs. | Non-empty string; matches format `/^[A-Za-z0-9_-]+$/`. |
| `timestamp` | `string` | **Yes** | Raw Telemetry | ISO-8601 UTC timestamp of measurement acquisition. Used for time-series ordering and logs. | Valid ISO-8601 string parseable by `Date.parse()`. |
| `x` | `number` | **Yes** | Raw Telemetry | Local survey Cartesian X-coordinate. Used to plot horizontal position on the Seafloor Survey Grid. | Finite number (typically $0 \le x \le 100$ in survey grid). |
| `y` | `number` | **Yes** | Raw Telemetry | Local survey Cartesian Y-coordinate. Used to plot vertical position on the Seafloor Survey Grid. | Finite number (typically $0 \le y \le 100$ in survey grid). |
| `bx` | `number` | **Yes** | Raw Telemetry | Magnetic vector X-component. Plotted on the multi-vector time-series chart. | Finite number. Labeled as *Provisional Survey Units*. |
| `by` | `number` | **Yes** | Raw Telemetry | Magnetic vector Y-component. Plotted on the multi-vector time-series chart. | Finite number. Labeled as *Provisional Survey Units*. |
| `bz` | `number` | **Yes** | Raw Telemetry | Magnetic vector Z-component. Plotted on the multi-vector time-series chart. | Finite number. Labeled as *Provisional Survey Units*. |
| `magnetic_signal` | `number` | **Yes** | Raw Telemetry | Composite scalar magnitude of the magnetic field. Plotted on the area chart and scatter chart. | Finite number $\ge 0$. Labeled as *Provisional Survey Units*. |
| `anomaly_score` | `number` | **Yes** | ML Analysis | Normalized anomaly likelihood score output by the upstream ML engine ($0.0 \text{ to } 1.0$). Modulates heatmap halo and marker intensity. | Finite number satisfying $0.0 \le \text{anomaly\_score} \le 1.0$. |
| `classification` | `string` | **Yes** | ML Analysis | Upstream categorical classification determined by the ML model. Dictates visual styling (emerald/amber/crimson). | Restricted to exact enum: `"normal" \| "weak_anomaly" \| "strong_anomaly"`. |

---

## 3. Upstream ML vs. Raw Telemetry Segregation

```
┌────────────────────────────────────────────────────────┐
│                   UPSTREAM TELEMETRY                   │
│                                                        │
│  RAW SENSOR TELEMETRY       UPSTREAM ML ANALYSIS       │
│  ├── sensor_id              ├── anomaly_score          │
│  ├── timestamp              └── classification         │
│  ├── x, y                       ├── normal             │
│  ├── bx, by, bz                 ├── weak_anomaly       │
│  └── magnetic_signal            └── strong_anomaly     │
│                                                        │
│  [Visualized directly]      [Visualized directly]      │
│  [No client calculations]   [No client re-calc]        │
└────────────────────────────────────────────────────────┘
```

The frontend **never** infers or overrides the `classification` from `anomaly_score` or magnetic readings. It renders the classification provided by the upstream ingestion and ML pipeline.

---

## 4. Scientific Assumptions & Disclaimers

1. **Local Survey Grid**: $X$ and $Y$ are **Local Survey Coordinates (Grid Units)** relative to the deployment baseline. They are **NOT** GPS coordinates or latitude/longitude.
2. **Provisional Physical Units**: The hardware and geophysics calibration for $Bx, By, Bz$ and $\text{magnetic\_signal}$ is not yet finalized by NCPOR. They are labeled as **"Survey Units [arb. units]"** rather than Tesla, microtesla ($\mu\text{T}$), or Gauss.
3. **Simulation Data Notice**: The included 256-point dataset is engineered for UI/UX interaction validation and does not represent verified geological ground truth.
