from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class GeoPoint(BaseModel):
    type: str = "Point"
    coordinates: List[float]  # [lng, lat] -- GeoJSON order, NOT [lat, lng]


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
    id: str = Field(alias="_id")

    class Config:
        populate_by_name = True


class AlertOut(BaseModel):
    id: str = Field(alias="_id")
    device_id: str
    timestamp: datetime
    metal_signature: float
    metal_type: Optional[str]
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