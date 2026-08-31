# Requirements Specification
## Problem Statement ID: 26064 — NCPOR / MoES Seafloor Metal Detection Sensor Frontend

---

## 1. Functional Requirements (FR)

### FR-1: Locked Data Contract & Validation
- **FR-1.1**: The application MUST strictly accept and parse readings matching the 10-field locked contract: `sensor_id`, `timestamp`, `x`, `y`, `bx`, `by`, `bz`, `magnetic_signal`, `anomaly_score`, `classification`.
- **FR-1.2**: Runtime validation (Zod) MUST validate field types, coordinate bounds, ISO timestamps, and restrict `classification` strictly to `'normal' | 'weak_anomaly' | 'strong_anomaly'`.
- **FR-1.3**: The frontend MUST NOT introduce unauthorized fields (e.g. depth, temperature, pressure, salinity, battery, GPS, latitude, longitude).

### FR-2: Data Provider & Agnostic Architecture
- **FR-2.1**: The application MUST implement an abstract interface `ISensorDataProvider` with a mock implementation (`MockSensorProvider`) and provisional API skeleton (`ApiSensorProvider`).
- **FR-2.2**: The application MUST seamlessly switch between mock and live modes via `VITE_USE_MOCK_DATA` without modifying any UI components.
- **FR-2.3**: UI components MUST consume data exclusively via custom hooks (`useSensorData`, `useSurveyGrid`, `useTelemetryStats`).

### FR-3: Mission Control Dashboard
- **FR-3.1**: Display active sensor ID, latest timestamp, latest magnetic signal, latest anomaly score, and current classification.
- **FR-3.2**: Display metric counters derived from active readings: Total Readings, Normal Count, Weak Anomaly Count, Strong Anomaly Count, and Peak Magnetic Signal.
- **FR-3.3**: Provide a recent readings live feed (last 10 readings).
- **FR-3.4**: Render an interactive compact heatmap preview linking to the survey grid.
- **FR-3.5**: Display a clear, prominent operational mode badge (`MOCK DATA` or `LIVE STREAM`).

### FR-4: Seafloor Survey Heatmap View
- **FR-4.1**: Render a 2D Cartesian survey coordinate grid ($X/Y$) with numerical tick marks and axes.
- **FR-4.2**: Plot all sensor readings at their respective $(X, Y)$ coordinates.
- **FR-4.3**: Visually distinguish anomaly classifications using distinct colors, sizes, and halo intensity without overriding upstream classifications.
- **FR-4.4**: Support interactive point hover displaying a rich metadata tooltip.
- **FR-4.5**: Support point click selection, opening a dedicated Reading Detail Drawer that clearly separates **Raw Telemetry** from **ML Analysis**.
- **FR-4.6**: Provide zoom in, zoom out, reset view, and layer toggle controls.
- **FR-4.7**: Display a scientific legend explaining classification markers and provisional grid coordinates.

### FR-5: Scientific Analytics View
- **FR-5.1**: Render a multi-line time-series chart for $Bx, By, Bz$ vector components.
- **FR-5.2**: Render an area chart for scalar `magnetic_signal` over reading sequence/timestamp.
- **FR-5.3**: Render an area chart for `anomaly_score` ($0.0 - 1.0$) with color-coded classification zones.
- **FR-5.4**: Render a correlation scatter plot of `magnetic_signal` vs `anomaly_score`.
- **FR-5.5**: Display scientific disclaimers on provisional/unconfirmed physical units.

### FR-6: Data Logs & Export View
- **FR-6.1**: Display a full tabular grid containing all 10 locked fields.
- **FR-6.2**: Support column sorting by timestamp, coordinates, signal, and anomaly score.
- **FR-6.3**: Support classification filtering (`All`, `Normal`, `Weak Anomaly`, `Strong Anomaly`).
- **FR-6.4**: Support search filtering by sensor ID or timestamp substring.
- **FR-6.5**: Support pagination with customizable page sizes (25, 50, 100).
- **FR-6.6**: Allow row click to inspect the reading in the detail drawer.
- **FR-6.7**: Provide one-click data export to both formatted **CSV** and **JSON** files.

### FR-7: Mock Stream Simulation Controls
- **FR-7.1**: Support interactive simulation with Play, Pause, Step-forward, and Reset actions.
- **FR-7.2**: Support playback speed multipliers (1x, 2x, 5x, 10x).
- **FR-7.3**: Synchronize simulated telemetry updates in real-time across Dashboard, Heatmap, Analytics, and Logs.

---

## 2. Non-Functional Requirements (NFR)

### NFR-1: Performance
- **NFR-1.1**: The application MUST render up to 500 data points smoothly with instantaneous hover/click response ($< 16\text{ms}$ frame time, 60fps).
- **NFR-1.2**: Data filtering and sorting calculations MUST be memoized to prevent redundant renders.

### NFR-2: Maintainability & Code Quality
- **NFR-2.1**: Complete TypeScript coverage with strict mode enabled and zero `any` types.
- **NFR-2.2**: Modular component organization with clear separation of presentation, business logic, and data access.

### NFR-3: Reliability & Error Handling
- **NFR-3.1**: Every data-driven view MUST gracefully handle Loading, Empty, Error, and Success states.
- **NFR-3.2**: Malformed records encountered during parsing MUST be caught, logged, and isolated without crashing the application.

### NFR-4: Accessibility (a11y)
- **NFR-4.1**: Meet WCAG 2.1 AA contrast standards across all UI text and metrics.
- **NFR-4.2**: Semantic HTML elements and accessible keyboard focus navigation.

### NFR-5: Responsiveness
- **NFR-5.1**: Fully responsive layout supporting viewports from desktop ($1920\times1080$, $1440\times900$) down to tablets ($1024\times768$) and mobile devices.

---

## 3. Explicit Out of Scope

The following areas are strictly outside the frontend scope:
1. **Hardware Firmware / ESP32 code**: Physical embedded programming, microcontroller I2C/SPI drivers.
2. **Backend / Database Engineering**: Database schemas, raw telemetry ingest queues, server-side scaling.
3. **ML Model Training & Weight Optimization**: Training pipelines, feature extraction models.
4. **Scientific Threshold Engineering**: Establishing physical unit conversions or geological classifications.
5. **Underwater Acoustic Modems**: Ocean acoustics or acoustic telemetry transmission protocols.
