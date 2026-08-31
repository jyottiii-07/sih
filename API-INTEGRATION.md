# Backend API Integration Specification
## Problem Statement ID: 26064 — NCPOR / MoES Seafloor Metal Detection Sensor Frontend

> [!WARNING]
> **PROVISIONAL SPECIFICATION**: The backend API endpoints and WebSocket channels described below represent the **proposed integration architecture** and are subject to final confirmation by the NCPOR backend and hardware engineering teams.

---

## 1. Integration Boundary Overview

The frontend interacts with the backend strictly through the `ISensorDataProvider` abstraction implemented in `src/services/api/apiProvider.ts`. 

```
┌────────────────────────────────────────────────────────┐
│                   FRONTEND INTERFACE                   │
│                ISensorDataProvider                     │
│                        ▲                               │
│                        │ (Implements)                  │
│               ApiSensorProvider                        │
└────────────────────────┬───────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
   REST API Gateway               WebSocket / SSE Gateway
  (Historical Readings)          (Real-time Live Ingestion)
```

---

## 2. Proposed REST Endpoints

### 2.1 Batch Historical Readings
- **Endpoint**: `GET /api/v1/readings`
- **Description**: Retrieves historical seafloor survey readings for the active mission or deployment.
- **Query Parameters**:
  - `sensor_id` (string, optional): Filter by sensor node ID (e.g. `SFS-001`).
  - `limit` (integer, optional, default: 500): Maximum records to fetch.
  - `since` (ISO-8601 timestamp, optional): Fetch readings newer than specified timestamp.
- **Response Format**:
  ```json
  {
    "status": "success",
    "mission_id": "EXP-2026-NCPOR-01",
    "count": 256,
    "data": [
      {
        "sensor_id": "SFS-001",
        "timestamp": "2026-08-26T10:00:00.000Z",
        "x": 0.0,
        "y": 0.0,
        "bx": 0.12,
        "by": 0.15,
        "bz": 0.22,
        "magnetic_signal": 0.29,
        "anomaly_score": 0.08,
        "classification": "normal"
      }
    ]
  }
  ```

### 2.2 Latest Reading Telemetry
- **Endpoint**: `GET /api/v1/readings/latest`
- **Description**: Returns the most recently acquired and processed sensor telemetry packet.
- **Response Format**:
  ```json
  {
    "status": "success",
    "data": {
      "sensor_id": "SFS-001",
      "timestamp": "2026-08-26T10:45:00.000Z",
      "x": 58.0,
      "y": 54.0,
      "bx": 0.74,
      "by": 0.88,
      "bz": 1.15,
      "magnetic_signal": 1.62,
      "anomaly_score": 0.94,
      "classification": "strong_anomaly"
    }
  }
  ```

---

## 3. Proposed WebSocket Live Ingest Protocol

- **URL**: `ws://<backend-host>/ws/telemetry` or `wss://<backend-host>/ws/telemetry`
- **Connection Handshake**: Client sends subscription message with optional `sensor_id` filter.
- **Payload Broadcast**: Backend pushes new verified reading packets immediately after ML inference:
  ```json
  {
    "event": "sensor_reading",
    "payload": {
      "sensor_id": "SFS-001",
      "timestamp": "2026-08-26T10:45:05.000Z",
      "x": 58.0,
      "y": 56.0,
      "bx": 0.71,
      "by": 0.85,
      "bz": 1.10,
      "magnetic_signal": 1.56,
      "anomaly_score": 0.92,
      "classification": "strong_anomaly"
    }
  }
  ```

### Reconnection & Resilience Strategy:
1. **Exponential Backoff**: Initial retry at 1s, doubling up to max 30s.
2. **Heartbeat**: 15s ping/pong keepalive.
3. **Data Deduplication**: Frontend deduplicates readings by `(sensor_id, timestamp)`.

---

## 4. Environment Variables Configuration

| Variable Name | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_USE_MOCK_DATA` | `true` | When `true`, uses `MockSensorProvider`. When `false`, uses `ApiSensorProvider`. |
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Base URL for REST API endpoints. |
| `VITE_WS_URL` | `ws://localhost:8000/ws/telemetry` | WebSocket endpoint for live streaming. |
| `VITE_POLLING_INTERVAL_MS` | `3000` | Fallback polling interval if WebSocket is unavailable. |
