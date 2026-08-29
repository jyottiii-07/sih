# Seafloor Metal Detection Sensor Dashboard & Survey System
## Problem Statement ID: 26064 — NCPOR / Ministry of Earth Sciences (MoES)

> **Theme**: Robotics & Drones / Marine Resource Exploration  
> **Target System**: Low-Cost Deployable Seafloor Metal Detection Sensor for Ocean Resource Exploration  
> **Status**: Frontend Phase 1 (Data-Agnostic Mission Control UI in Mock Mode)

---

## 1. Executive Summary

This repository contains the scientific frontend dashboard and spatial survey mapping interface for the **Low-Cost Deployable Seafloor Metal Detection Sensor**. Designed for the National Centre for Polar and Ocean Research (NCPOR), Ministry of Earth Sciences (MoES), the platform visualizes seafloor magnetic anomaly telemetry to assist marine researchers in detecting and localizing prospective seafloor metal-rich deposits.

```
┌───────────────────────────────────────────────────────────┐
│                      MISSION ARCHITECTURE                 │
│                                                           │
│  [Seafloor Sensor / ESP32]                                │
│              ↓                                            │
│  [Magnetic Telemetry (Bx, By, Bz, Signal)]                │
│              ↓                                            │
│  [Backend Data Pipeline & Ingestion]                      │
│              ↓                                            │
│  [ML Anomaly Detection & Classification Engine]           │
│              ↓                                            │
│  [REST / WebSocket / SSE API Gateway]                     │
│              ↓                                            │
│  [Frontend Data Adapter Interface (ISensorDataProvider)]   │
│              ↓                                            │
│  [Mission Control Dashboard, Heatmap, Analytics, Logs]    │
└───────────────────────────────────────────────────────────┘
```

---

## 2. Current Development Stage & Hardware Status

> [!IMPORTANT]
> **Hardware Status**: Real ocean-bottom hardware, ESP32 sensor telemetry, live database ingestion, and production ML models are currently **under active development and not yet physically deployed**.
>
> Therefore, this frontend operates using a **high-fidelity mock data provider** that strictly obeys the confirmed 10-field telemetry contract. The architecture is completely data-source agnostic, allowing a seamless switch to live backend streaming via environment configuration (`VITE_USE_MOCK_DATA=false`) with zero changes to UI components.

---

## 3. Strict 10-Field Data Contract

Every sensor reading adheres strictly to the locked 10-field contract:

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

### Data Categorization
1. **Raw Telemetry**: `sensor_id`, `timestamp`, `x`, `y`, `bx`, `by`, `bz`, `magnetic_signal`
2. **ML Analysis Output**: `anomaly_score`, `classification` (`normal` | `weak_anomaly` | `strong_anomaly`)

### Strict Prohibitions
* No unconfirmed physical fields (depth, temperature, pressure, salinity, battery, humidity, GPS, latitude, longitude, altitude, heading, velocity) are introduced into the schema.
* The frontend does **not** independently calculate or override ML classifications.
* Coordinates `x` and `y` represent **Local Survey Coordinates (Grid Units)**, not GPS coordinates.
* Magnetic values are labeled as **Provisional Survey Units** pending physical calibration.

---

## 4. Key Frontend Features

1. **Mission Control Dashboard**:
   - Active sensor ID, latest timestamp, latest magnetic signal, latest anomaly score, and live classification status.
   - Comprehensive telemetry metric cards (Total readings, Normal, Weak Anomaly, Strong Anomaly counts).
   - Real-time recent readings ticker and interactive compact survey grid preview.
2. **Seafloor Survey Grid (Heatmap)**:
   - Interactive 2D Cartesian survey grid ($X/Y$).
   - Multi-layer spatial point rendering color-coded by upstream classification with anomaly score halo effects.
   - Interactive zoom, pan, point hover tooltips, and click-to-inspect selection.
   - Detailed reading inspection drawer cleanly segregating Raw Telemetry from ML Analysis.
3. **Scientific Analytics**:
   - Time-series vector component chart ($Bx, By, Bz$).
   - Scalar magnetic signal progression chart.
   - Anomaly score trajectory chart with classification zone bands.
   - Magnetic signal vs. anomaly score correlation scatter plot.
4. **Data Logs & Export**:
   - Comprehensive tabular view with all 10 fields.
   - Real-time classification filtering, coordinate bounding-box filtering, and search.
   - Paginated browsing and synchronized row selection.
   - Instant export to scientific **JSON** and **CSV** formats.
5. **Interactive Mock Stream Simulator**:
   - Live stream playback controls (Play, Pause, Step, Reset, Speed multipliers: 1x, 2x, 5x, 10x).
   - Prominent `MOCK DATA` operational indicators.

---

## 5. Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Custom Deep-Ocean Design Tokens
- **Icons**: Lucide React
- **Charts**: Recharts
- **Validation**: Zod (Strict schema runtime parser)
- **Utilities**: clsx, tailwind-merge

---

## 6. Project Structure

```text
sih/
├── public/                     # Static assets and favicon
├── src/
│   ├── assets/                 # Branding and icons
│   ├── components/
│   │   ├── common/             # Badges, Cards, Buttons, StateViews, ReadingDetailDrawer
│   │   ├── layout/             # Navbar, Footer, Shell, PlaybackControls
│   │   ├── dashboard/          # MetricCard, LatestTelemetryCard, CompactHeatmapCard, RecentReadingsTable
│   │   ├── visualization/      # SurveyHeatmap, GridControls, HeatmapLegend, TooltipOverlay
│   │   ├── analytics/          # VectorChart, SignalChart, AnomalyChart, ScatterChart
│   │   └── data/               # LogsTable, TableFilters, TablePagination, ExportActions
│   ├── context/
│   │   └── SensorDataContext.tsx # Unified state provider & stream manager
│   ├── data/
│   │   └── mockSensorData.json # 256-point high-fidelity mock survey dataset
│   ├── hooks/
│   │   ├── useSensorData.ts    # Access context state and stream dispatches
│   │   ├── useSurveyGrid.ts    # Viewport transforms, zoom, pan, coordinate mapping
│   │   └── useTelemetryStats.ts# Memoized telemetry aggregation and counters
│   ├── pages/
│   │   ├── Dashboard/          # Mission control overview page
│   │   ├── Survey/             # Seafloor survey grid & heatmap page
│   │   ├── Analytics/          # Scientific time-series & correlation page
│   │   └── Logs/               # Interactive telemetry log & export page
│   ├── services/
│   │   ├── api/
│   │   │   └── apiProvider.ts  # Provisional REST/WS backend client skeleton
│   │   ├── mock/
│   │   │   └── mockProvider.ts # Validated mock data reader and stream generator
│   │   └── sensorService.ts    # ISensorDataProvider interface and factory
│   ├── styles/
│   │   └── index.css           # Design tokens, radar grid animations, scrollbars
│   ├── types/
│   │   └── sensor.ts           # Strict TypeScript interfaces & types
│   ├── utils/
│   │   ├── export.ts           # CSV and JSON data export utilities
│   │   └── validation.ts       # Zod runtime schemas & batch validator
│   ├── App.tsx                 # Root router and view container
│   └── main.tsx                # React application entry point
├── .env.example                # Environment configuration template
├── ARCHITECTURE.md             # System architecture & data flow specification
├── DATA-CONTRACT.md            # 10-field locked data contract reference
├── DESIGN.md                   # UI/UX design tokens and design system guide
├── REQUIREMENTS.md             # Functional and non-functional requirements
├── TASKS.md                    # Phased engineering roadmap and task tracking
├── API-INTEGRATION.md          # Backend integration and protocol blueprint
├── UI-FLOW.md                  # User flow and interaction documentation
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 7. Getting Started

### Prerequisites
- Node.js (v18+ recommended, verified on v25.x)
- npm (v9+ recommended)

### Installation
```bash
# Install dependencies
npm install
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```env
VITE_USE_MOCK_DATA=true
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws/telemetry
```

### Running Locally
```bash
npm run dev
```

### Production Build & Type Checking
```bash
# Run strict TypeScript validation
npx tsc --noEmit

# Build production bundle
npm run build
```

---

## 8. Switching from Mock to Live Backend

When the backend API and ESP32 hardware ingestion pipeline become available:
1. Update `.env`:
   ```env
   VITE_USE_MOCK_DATA=false
   VITE_API_BASE_URL=https://ncpor-sensor-backend.gov.in/api/v1
   VITE_WS_URL=wss://ncpor-sensor-backend.gov.in/ws/telemetry
   ```
2. The `sensorService` factory automatically instantiates `ApiSensorProvider` instead of `MockSensorProvider`.
3. All UI components, hooks, and visualizations continue functioning without a single line of code change.

---

## 9. License & Attribution
Developed for the National Centre for Polar and Ocean Research (NCPOR), Ministry of Earth Sciences (MoES), Government of India.