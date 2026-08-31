# Engineering Roadmap & Phased Task Matrix
## Problem Statement ID: 26064 — NCPOR / MoES Seafloor Metal Detection Sensor Frontend

---

## Phased Implementation Overview

```
Phase 1: Documentation ───────────────► [COMPLETED]
Phase 2: Project Foundation ──────────► [IN PROGRESS]
Phase 3: Data Contract & Zod ────────► [PENDING]
Phase 4: High-Fidelity Mock Dataset ──► [PENDING]
Phase 5: Data Provider Abstraction ───► [PENDING]
Phase 6: Application State & Context ─► [PENDING]
Phase 7: Application Shell & Nav ────► [PENDING]
Phase 8: Mission Control Dashboard ───► [PENDING]
Phase 9: Seafloor Survey Heatmap ─────► [PENDING]
Phase 10: Scientific Analytics Charts ─► [PENDING]
Phase 11: Data Logs & Export ─────────► [PENDING]
Phase 12: Mock Stream Playback ───────► [PENDING]
Phase 13: Error, Empty & Loading States► [PENDING]
Phase 14: API Readiness & Skeleton ───► [PENDING]
Phase 15: Verification & Testing ─────► [PENDING]
```

---

## Detailed Task Manifest

| Task ID | Phase | Description | Target Files | Dependencies | Acceptance Criteria | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TSK-01** | Phase 1 | Create complete documentation suite | `README.md`, `DESIGN.md`, `REQUIREMENTS.md`, `TASKS.md`, `ARCHITECTURE.md`, `DATA-CONTRACT.md`, `API-INTEGRATION.md`, `UI-FLOW.md` | None | All 8 documentation files created with consistent contracts and zero contradictions | **DONE** |
| **TSK-02** | Phase 2 | Scaffolding, Vite, React, TypeScript, Tailwind config, dependencies | `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `.env.example`, `.env` | TSK-01 | `npm install` and basic build commands succeed | **IN PROGRESS** |
| **TSK-03** | Phase 3 | Implement strict TypeScript types and Zod schemas | `src/types/sensor.ts`, `src/utils/validation.ts` | TSK-02 | Strict 10-field validation rejects extra fields and invalid classifications | **PENDING** |
| **TSK-04** | Phase 4 | Create 256-point high-fidelity mock survey dataset | `src/data/mockSensorData.json` | TSK-03 | 256 valid records over $X/Y$ grid with realistic baseline, fringe, and strong anomaly zones | **PENDING** |
| **TSK-05** | Phase 5 | Implement data provider abstraction and mock provider | `src/services/sensorService.ts`, `src/services/mock/mockProvider.ts`, `src/services/api/apiProvider.ts` | TSK-03, TSK-04 | `ISensorDataProvider` abstraction decoupling UI from direct JSON import | **PENDING** |
| **TSK-06** | Phase 6 | Application state, Context, and Custom Hooks | `src/context/SensorDataContext.tsx`, `src/hooks/useSensorData.ts`, `src/hooks/useSurveyGrid.ts`, `src/hooks/useTelemetryStats.ts` | TSK-05 | Memoized metrics, selection state, and streaming state fully reactive | **PENDING** |
| **TSK-07** | Phase 7 | Application shell, Navbar, Navigation tabs, Footer | `src/components/layout/Navbar.tsx`, `src/components/layout/Footer.tsx`, `src/components/layout/Shell.tsx`, `src/components/common/Badge.tsx`, `src/styles/index.css` | TSK-06 | Responsive navbar, operational mode badge, stream controls, and footer disclaimers | **PENDING** |
| **TSK-08** | Phase 8 | Mission Control Dashboard view implementation | `src/pages/Dashboard/DashboardPage.tsx`, `src/components/dashboard/MetricCard.tsx`, `src/components/dashboard/LatestTelemetryCard.tsx`, `src/components/dashboard/CompactHeatmapCard.tsx`, `src/components/dashboard/RecentReadingsTable.tsx` | TSK-07 | Live metrics, active telemetry card, recent readings feed, mini heatmap | **PENDING** |
| **TSK-09** | Phase 9 | Interactive Seafloor Survey Heatmap View | `src/pages/Survey/SurveyPage.tsx`, `src/components/visualization/SurveyHeatmap.tsx`, `src/components/visualization/GridControls.tsx`, `src/components/visualization/HeatmapLegend.tsx`, `src/components/common/ReadingDetailDrawer.tsx` | TSK-07 | 2D coordinate grid, anomaly markers with radial glow, hover tooltips, click selection drawer | **PENDING** |
| **TSK-10** | Phase 10 | Scientific Analytics & Time-series charts | `src/pages/Analytics/AnalyticsPage.tsx`, `src/components/analytics/VectorChart.tsx`, `src/components/analytics/SignalChart.tsx`, `src/components/analytics/AnomalyChart.tsx`, `src/components/analytics/ScatterChart.tsx` | TSK-07 | Vector line charts, area signal/anomaly charts, scatter correlation, unconfirmed unit labels | **PENDING** |
| **TSK-11** | Phase 11 | Telemetry Data Logs & Data Export | `src/pages/Logs/LogsPage.tsx`, `src/components/data/LogsTable.tsx`, `src/components/data/TableFilters.tsx`, `src/components/data/TablePagination.tsx`, `src/utils/export.ts` | TSK-07 | 10-field table, classification filters, search, coordinate filter, CSV/JSON export | **PENDING** |
| **TSK-12** | Phase 12 | Interactive Mock Stream Simulation | `src/components/layout/PlaybackControls.tsx`, `src/context/SensorDataContext.tsx` | TSK-06, TSK-07 | Play, Pause, Step, Reset, Speed multipliers (1x-10x) with real-time UI synchronization | **PENDING** |
| **TSK-13** | Phase 13 | Comprehensive State Views (Loading, Empty, Error) | `src/components/common/StateViews.tsx` | TSK-07 | Loading spinner, empty dataset state, error banner with retry on all pages | **PENDING** |
| **TSK-14** | Phase 14 | API Provider skeleton and environment configuration | `src/services/api/apiProvider.ts`, `.env.example` | TSK-05 | Provisional endpoints marked with scientific disclaimers; seamless mock/API switch | **PENDING** |
| **TSK-15** | Phase 15 | Verification, Type-checking, Zod automated testing | `npm run build`, `npx tsc --noEmit`, test validation script | All | TypeScript compiles with 0 errors; all 256 mock records pass Zod schema | **PENDING** |
