import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_indexes
from app.mqtt_client import start_mqtt_client
from app.ws_manager import manager

app = FastAPI(title="Seafloor Metal Detection Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your frontend's actual URL later
    allow_methods=["*"],
    allow_headers=["*"],
)

# Your friend will add: app.include_router(readings.router) etc. here


@app.on_event("startup")
async def startup():
    await init_indexes()
    loop = asyncio.get_event_loop()
    start_mqtt_client(loop)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws/live")
async def live_feed(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)