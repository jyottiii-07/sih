from typing import List, Optional, Union, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas import (
    RawSensorReadingIn,
    ProcessedSensorReadingOut,
    ReadingsBatchResponse,
    LatestReadingResponse,
    GridResponse,
    GridCellOut,
    TelemetryAlertOut,
)
from app.ml_client import classify_reading
from app.database import (
    insert_reading,
    get_readings,
    get_latest_reading,
    get_grid_cells,
    delete_all_readings,
    get_alerts,
)
from app.ws_manager import manager
from app.alert_service import evaluate_reading
from app.sensor_adapters import sensor_dispatcher

router = APIRouter()


async def _process_single_reading(raw_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to normalize, score, store, evaluate alerts, and broadcast a reading."""
    print(f"\n[DEBUG 1. Raw FastAPI request payload]: {raw_dict}")
    # Pass through sensor normalization adapter layer (Hall-Effect or 3-Axis)
    norm = sensor_dispatcher.process(raw_dict)
    print(f"[DEBUG 8b. Dispatcher normalized output]: magnetic_signal={norm.get('magnetic_signal')}, bz={norm.get('bz')}")

    # ML Anomaly inference
    ml_result = await classify_reading(norm)

    doc = {
        "sensor_id": norm["sensor_id"],
        "timestamp": norm["timestamp"],
        "x": norm["x"],
        "y": norm["y"],
        "bx": norm["bx"],
        "by": norm["by"],
        "bz": norm["bz"],
        "magnetic_signal": ml_result["magnetic_signal"],
        "anomaly_score": ml_result["anomaly_score"],
        "classification": ml_result["classification"],
        "sensor_type": norm.get("sensor_type", "magnetometer_3axis"),
        "raw_payload": norm.get("raw_payload", raw_dict),
    }
    print(f"[DEBUG 12. Final database/API doc]: magnetic_signal={doc['magnetic_signal']}, anomaly_score={doc['anomaly_score']}, classification={doc['classification']}")

    # Save to database
    saved_doc = await insert_reading(doc)

    # Broadcast to live WebSockets (using 'sensor_reading' and 'new_reading' event)
    await manager.broadcast("sensor_reading", saved_doc)

    # Check alert thresholds
    await evaluate_reading(saved_doc)

    return saved_doc


@router.post(
    "/readings",
    response_model=Union[ProcessedSensorReadingOut, ReadingsBatchResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Ingest sensor telemetry reading(s)",
)
async def ingest_readings(
    payload: Union[RawSensorReadingIn, List[RawSensorReadingIn]],
):
    """
    Ingests one or more raw magnetometer readings from ESP32 or simulation.
    Applies baseline ML anomaly scoring, stores in database, and streams over WebSockets.
    """
    if isinstance(payload, list):
        processed_list = []
        for item in payload:
            processed = await _process_single_reading(item.model_dump())
            processed_list.append(processed)
        return ReadingsBatchResponse(
            status="success",
            count=len(processed_list),
            data=processed_list,
        )
    else:
        processed = await _process_single_reading(payload.model_dump())
        return ProcessedSensorReadingOut(**processed)


@router.get(
    "/readings",
    response_model=ReadingsBatchResponse,
    summary="Query historical sensor readings",
)
async def fetch_readings(
    sensor_id: Optional[str] = Query(None, description="Filter by sensor node ID (e.g. SFS-001)"),
    limit: int = Query(500, ge=1, le=5000, description="Max number of readings to return"),
    since: Optional[str] = Query(None, description="ISO-8601 timestamp filter (>= since)"),
    order: str = Query("asc", pattern="^(asc|desc)$", description="Sort order by timestamp"),
):
    """Returns historical survey readings matching query filters."""
    sort_desc = (order == "desc")
    records = await get_readings(
        sensor_id=sensor_id,
        limit=limit,
        since=since,
        sort_desc=sort_desc,
    )
    return ReadingsBatchResponse(
        status="success",
        count=len(records),
        data=records,
    )


@router.get(
    "/readings/latest",
    response_model=LatestReadingResponse,
    summary="Fetch the most recent sensor reading telemetry",
)
async def fetch_latest_reading(
    sensor_id: Optional[str] = Query(None, description="Filter by sensor ID"),
):
    """Returns the latest sensor reading packet for live telemetry dashboards."""
    record = await get_latest_reading(sensor_id=sensor_id)
    return LatestReadingResponse(
        status="success",
        data=record,
    )


@router.get(
    "/grid",
    response_model=GridResponse,
    summary="Fetch 2D tank/grid heatmap aggregated matrix",
)
async def fetch_grid_matrix():
    """
    Returns 2D grid matrix aggregated by coordinates (x, y) for direct rendering
    on the Seafloor Tank Heatmap.
    """
    cells = await get_grid_cells()
    return GridResponse(
        status="success",
        count=len(cells),
        cells=cells,
    )


@router.get(
    "/alerts",
    summary="Fetch recent magnetic anomaly alerts",
)
async def fetch_alerts(
    limit: int = Query(50, ge=1, le=200),
):
    """Returns list of triggered anomaly alerts."""
    alerts = await get_alerts(limit=limit)
    return {
        "status": "success",
        "count": len(alerts),
        "alerts": alerts,
    }


@router.delete(
    "/readings",
    summary="Reset and clear all survey readings (Mission Reset)",
)
async def reset_readings():
    """Clears all sensor data from the database for re-testing."""
    deleted = await delete_all_readings()
    return {
        "status": "success",
        "message": f"Successfully deleted {deleted} survey records.",
        "deleted_count": deleted,
    }


@router.post(
    "/calibrate",
    summary="Reset Hall-effect baseline calibration",
)
async def reset_calibration():
    """Resets the in-memory Hall sensor baseline calibration state."""
    sensor_dispatcher.hall_adapter.reset_calibration()
    return {
        "status": "success",
        "message": "Hall baseline calibration reset. Next readings will establish the resting baseline.",
        "default_baseline": sensor_dispatcher.hall_adapter.default_baseline,
    }

