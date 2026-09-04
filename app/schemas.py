from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


# ---------------------------------------------------------------------------
# LOCKED 10-FIELD SEAMLESS DATA CONTRACT (SIH 2026 / NCPOR 26064)
# ---------------------------------------------------------------------------

class RawSensorReadingIn(BaseModel):
    sensor_id: Optional[str] = "ESP32-HALL-01"
    timestamp: Optional[str] = None
    x: Optional[float] = 0.0
    y: Optional[float] = 0.0
    bx: Optional[float] = 0.0
    by: Optional[float] = 0.0
    bz: Optional[float] = 0.0
    raw_adc: Optional[float] = None
    adc: Optional[float] = None
    raw_hall_value: Optional[float] = None
    sensor_type: Optional[str] = None


class ProcessedSensorReadingOut(BaseModel):
    sensor_id: str
    timestamp: str
    x: float
    y: float
    bx: float
    by: float
    bz: float
    magnetic_signal: float
    anomaly_score: float
    classification: Literal["normal", "weak_anomaly", "strong_anomaly"]
    sensor_type: Optional[str] = None


class ReadingsBatchResponse(BaseModel):
    status: str = "success"
    mission_id: Optional[str] = "EXP-2026-NCPOR-01"
    count: int
    data: List[ProcessedSensorReadingOut]


class LatestReadingResponse(BaseModel):
    status: str = "success"
    data: Optional[ProcessedSensorReadingOut] = None


class GridCellOut(BaseModel):
    x: float
    y: float
    bx: float
    by: float
    bz: float
    magnetic_signal: float
    anomaly_score: float
    classification: Literal["normal", "weak_anomaly", "strong_anomaly"]
    readings_count: int
    last_timestamp: str


class GridResponse(BaseModel):
    status: str = "success"
    count: int
    cells: List[GridCellOut]


class TelemetryAlertOut(BaseModel):
    sensor_id: str
    timestamp: str
    x: float
    y: float
    magnetic_signal: float
    anomaly_score: float
    classification: str
    message: str


# ---------------------------------------------------------------------------
# LEGACY DRAFT SCHEMAS (Preserved for compatibility)
# ---------------------------------------------------------------------------

class GeoPoint(BaseModel):
    type: str = "Point"
    coordinates: List[float]


class SensorReading(BaseModel):
    device_id: str
    timestamp: datetime
    depth_m: float
    metal_signature: float
    metal_type: Optional[str] = None
    confidence: Optional[float] = None
    location: GeoPoint
    raw_payload: Optional[dict] = None


class ReadingOut(SensorReading):
    id: str = Field(default="", alias="_id")

    class Config:
        populate_by_name = True


class AlertOut(BaseModel):
    id: str = Field(default="", alias="_id")
    device_id: str
    timestamp: datetime
    metal_signature: float
    metal_type: Optional[str] = None
    location: GeoPoint
    message: str

    class Config:
        populate_by_name = True


class UserIn(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"