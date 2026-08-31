import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_indexes
from app.routes import router as readings_router
from app.ws_manager import manager
from app.ml_client import get_ml_pipeline

app = FastAPI(
    title="NCPOR / MoES Seafloor Metal Detection Backend",
    version="1.0.0",
    description="Real-time Magnetometer Telemetry Ingestion, ML Anomaly Scoring, and Survey Grid API",
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include REST API routes under /api/v1 and /api
app.include_router(readings_router, prefix="/api/v1", tags=["Telemetry & Grid"])
app.include_router(readings_router, prefix="/api", tags=["Legacy / Direct"])


@app.on_event("startup")
async def startup():
    """Initializes SQLite database and preloads ML pipeline."""
    await init_indexes()
    get_ml_pipeline()
    print("[Backend] Initialized SQLite database and ML models successfully.")


@app.get("/api/health", tags=["System"])
async def health():
    return {"status": "ok", "service": "seafloor-backend", "version": "1.0.0"}


@app.websocket("/ws/telemetry")
async def telemetry_feed(websocket: WebSocket):
    """Primary WebSocket endpoint for real-time frontend streaming."""
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.websocket("/ws/live")
async def live_feed(websocket: WebSocket):
    """Secondary/legacy WebSocket endpoint."""
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)