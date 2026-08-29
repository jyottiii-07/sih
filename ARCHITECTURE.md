# Architecture & Technical Design Blueprint
## Problem Statement ID: 26064 — NCPOR / MoES Seafloor Metal Detection Sensor Frontend

---

## 1. Architectural Philosophy

The frontend architecture is designed around two foundational tenets:
1. **Strict Data-Source Agnosticism**: UI presentation components must be completely decoupled from data access mechanics. Whether data originates from local static JSON, real-time mock playback, or a future production WebSocket/REST gateway, the UI interacts exclusively through a unified data adapter interface and React Context.
2. **Deterministic Data Contract**: All incoming data packets are subjected to strict runtime validation via Zod at the adapter boundary before entering application state, ensuring malformed payloads cannot cause runtime crashes in visualization components.

---

## 2. Layered Architecture & Data Flow

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                                    │
│   ┌─────────────────────────────┐    ┌─────────────────────────────┐   │
│   │   Mock JSON / Streamer      │    │  Backend REST / WS / SSE    │   │
│   │  (src/data/mockSensorData)  │    │  (Provisional API Gateway)  │   │
│   └──────────────┬──────────────┘    └──────────────┬──────────────┘   │
└──────────────────┼──────────────────────────────────┼──────────────────┘
                   │                                  │
┌──────────────────▼──────────────────────────────────▼──────────────────┐
│                   DATA ADAPTER BOUNDARY                                │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │               ISensorDataProvider Interface                    │   │
│   │         ├── MockSensorProvider                                 │   │
│   │         └── ApiSensorProvider (Provisional Skeleton)           │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│              RUNTIME VALIDATION & NORMALIZATION (ZOD)                   │
│   ├── Strict 10-Field Schema Validation (Rejects unauthorized keys)    │
│   └── Classification & Coordinate Integrity Enforcement                │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│                    APPLICATION STATE & CONTEXT                         │
│   ├── SensorDataContext (Readings array, streaming index, selection)   │
│   └── Memoized Custom Hooks:                                           │
│         ├── useSensorData()      ──► Access active telemetry & stream  │
│         ├── useTelemetryStats()  ──► Aggregated counters & metrics     │
│         └── useSurveyGrid()      ──► Viewport scaling, zoom & pan      │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│                     PRESENTATION LAYER (UI)                            │
│   ┌───────────────┬─────────────────┬────────────────┬─────────────┐   │
│   │  Dashboard    │  Survey Grid    │   Analytics    │  Data Logs  │   │
│   │  (Overview)   │  (Heatmap)      │   (Charts)     │  (Export)   │   │
│   └───────────────┴─────────────────┴────────────────┴─────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Layout & Module Responsibilities

```text
src/
├── assets/                  # Static SVG badges, institutional branding
├── components/
│   ├── common/              # Shared UI primitives (Badge, Card, Button, DetailDrawer, StateViews)
│   ├── layout/              # Structural shells (Navbar, Footer, Shell, PlaybackControls)
│   ├── dashboard/           # Dashboard-specific widgets (MetricCard, LatestTelemetryCard, etc.)
│   ├── visualization/       # Survey grid components (SurveyHeatmap, GridControls, HeatmapLegend)
│   ├── analytics/           # Scientific charts (VectorChart, SignalChart, AnomalyChart, ScatterChart)
│   └── data/                # Data management components (LogsTable, TableFilters, ExportActions)
├── context/
│   └── SensorDataContext.tsx # Centralized application state and simulation stream runner
├── data/
│   └── mockSensorData.json  # 256-point high-fidelity mock survey dataset
├── hooks/
│   ├── useSensorData.ts     # Primary hook for components consuming sensor readings
│   ├── useSurveyGrid.ts     # Geometric transformation, bounding box, and zoom/pan logic
│   └── useTelemetryStats.ts # Real-time aggregation of anomaly ratios, peaks, and counts
├── pages/
│   ├── Dashboard/           # Mission Control Overview View
│   ├── Survey/              # Seafloor Survey Grid & Heatmap View
│   ├── Analytics/           # Scientific Time-Series & Cross-Plot View
│   └── Logs/                # Tabular Telemetry Inspector & Data Exporter
├── services/
│   ├── api/
│   │   └── apiProvider.ts   # Provisional REST/WebSocket integration client
│   ├── mock/
│   │   └── mockProvider.ts  # Local JSON data loader and timed stream simulator
│   └── sensorService.ts     # Data provider factory and contract interface
├── styles/
│   └── index.css            # Tailwind directives, color variables, custom animations
├── types/
│   └── sensor.ts            # Strict 10-field TypeScript types and UI state models
└── utils/
    ├── export.ts            # Formatted CSV and JSON data export utility
    └── validation.ts        # Zod runtime schemas, error formats, and batch parser
```

---

## 4. Why UI Components Never Directly Fetch Data

Direct data fetching in UI components violates single-responsibility principles and tightly couples presentation to the network transport layer. In this architecture:
1. **Zero UI Code Changes on Hardware Arrival**: When the backend API is deployed, flipping `VITE_USE_MOCK_DATA=false` switches the provider without altering any JSX or CSS.
2. **Uniform Error & Loading States**: The `SensorDataContext` standardizes loading, empty, and error lifecycles across all four primary views.
3. **Optimized Render Cycles**: Derived metrics ($Bx/By/Bz$ aggregations, anomaly ratios) are computed and memoized at the context layer, avoiding redundant per-component recalculation.
