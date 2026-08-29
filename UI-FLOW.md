# User Interface Navigation & Interaction Flows
## Problem Statement ID: 26064 — NCPOR / MoES Seafloor Metal Detection Sensor Frontend

---

## 1. Global Navigation Architecture

The application provides a persistent top mission control navbar with view switcher tabs, live operational indicators, active sensor metadata, and mock streaming playback controls.

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [NCPOR / MoES Logo]   [Dashboard] [Survey Grid] [Analytics] [Data Logs] │
│ [MOCK DATA Badge] [Sensor: SFS-001] [▶ Play ❚❚ Pause ⟳ Reset 1x/2x/5x]  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core User Flows & View State Transitions

```text
                     ┌──────────────────┐
                     │   APP LAUNCH     │
                     └────────┬─────────┘
                              │ Load Data (Mock Provider or API)
                              ▼
                     ┌──────────────────┐
                     │    DASHBOARD     │◄─────────────────┐
                     │ (Mission Control)│                  │
                     └────────┬─────────┘                  │
                              │ Click "Open Full Survey"   │
                              ▼                            │
                     ┌──────────────────┐                  │
             ┌───────┤   SURVEY GRID    ├───────┐          │
             │       │    (Heatmap)     │       │          │
             │       └────────┬─────────┘       │          │
Hover Point  │                │ Click Point     │ Switch   │ Switch
             ▼                ▼                 │ Tab      │ Tab
┌──────────────────┐ ┌──────────────────┐       │          │
│ Coordinate /     │ │ Reading Detail   │       ▼          │
│ Telemetry Tooltip│ │ Slide-out Drawer │ ┌───────────┐    │
└──────────────────┘ └────────┬─────────┘ │ ANALYTICS │────┤
                              │           └─────┬─────┘    │
                              │ View in         │          │
                              │ Data Logs       ▼          │
                              │           ┌───────────┐    │
                              └──────────►│ DATA LOGS │────┘
                                          └───────────┘
```

---

## 3. View-by-View Interaction Details

### 3.1 Mission Control Dashboard (`/dashboard` or Tab: Dashboard)
- **Primary Hero**: Real-time summary metrics (Total Readings, Baseline Normal, Weak Anomalies, High Ferrous Strong Anomalies, Latest Anomaly Score, Peak Signal).
- **Latest Telemetry Card**: Real-time readout of the newest reading packet, with $Bx, By, Bz$ vector bars and classification banner.
- **Recent Readings Feed**: Scrolling list of the 10 most recent readings with quick inspection trigger.
- **Compact Heatmap Preview**: Live mini-map showing the spatial distribution and anomaly clusters, with an "Explore Survey Grid" direct action.

### 3.2 Seafloor Survey Heatmap (`/survey` or Tab: Survey Grid)
- **Viewport Canvas**: Interactive 2D Cartesian coordinate plane ($X \in [0, 60], Y \in [0, 60]$).
- **Point Encodings**:
  - `normal` readings rendered in Emerald `#10b981`.
  - `weak_anomaly` readings rendered in Amber `#f59e0b` with pulsing boundary ring.
  - `strong_anomaly` readings rendered in Crimson `#ef4444` with multi-stop radial glow halo.
- **Interactions**:
  - **Hover**: Renders an instantaneous tooltip showing $(X, Y)$, Sensor ID, Magnetic Signal, Anomaly Score, and Classification.
  - **Click**: Highlights point with target crosshairs and opens the **Reading Detail Drawer**.
  - **Zoom & Pan Controls**: Dedicated floating control panel for Zoom In (`+`), Zoom Out (`-`), and Reset View (`⌖`).
  - **Layer Filter**: Toggle display of Normal, Weak, or Strong points.

### 3.3 Scientific Analytics (`/analytics` or Tab: Analytics)
- **Multi-Vector Time Series**: Line chart plotting $Bx$ (sky blue), $By$ (indigo), and $Bz$ (purple) across sequential survey readings.
- **Magnetic Signal Area Chart**: Highlighting composite magnetic field intensity over time.
- **Anomaly Score Profile**: Time-series curve with distinct shaded horizontal zones ($0.0 - 0.50$ baseline, $0.50 - 0.80$ weak, $> 0.80$ strong).
- **Signal vs Anomaly Correlation Scatter Plot**: Visualizing relationship between magnetic signal and ML anomaly score.

### 3.4 Data Logs & Export (`/logs` or Tab: Data Logs)
- **Full 10-Field Table**: Real-time tabular rendering with columns for all locked fields.
- **Interactive Controls**:
  - **Classification Filter**: All, Normal, Weak Anomaly, Strong Anomaly pills with counter badges.
  - **Search**: Fast text filter on `sensor_id` or `timestamp`.
  - **Coordinate Filter**: Bounding box coordinate filters ($X_{\min}, X_{\max}, Y_{\min}, Y_{\max}$).
  - **Sorting**: Clickable table column headers for ascending/descending sorts.
  - **Pagination**: 25, 50, 100 rows per page with page jump buttons.
- **Data Export**:
  - **Export CSV**: Triggers formatted `.csv` download named `seafloor_telemetry_<timestamp>.csv`.
  - **Export JSON**: Triggers formatted `.json` download named `seafloor_telemetry_<timestamp>.json`.

---

## 4. Reading Detail Drawer
When any data point in the Survey Grid, Dashboard recent readings, or Data Logs table is selected:
1. The right-hand drawer slides into view.
2. Displays **Raw Sensor Telemetry** and **ML Anomaly Analysis** in distinct visual sections.
3. Provides quick actions: Center in Survey Grid, Filter for nearby points, or Copy JSON payload.
