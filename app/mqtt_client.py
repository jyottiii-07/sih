import json
import asyncio
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

from app.config import (
    MQTT_BROKER, MQTT_PORT, MQTT_TOPIC, MQTT_USERNAME, MQTT_PASSWORD,
)
from app.database import readings_collection
from app.ml_client import classify_reading
from app.ws_manager import manager
from app.alert_service import evaluate_reading

_loop = None

# ---------------------------------------------------------------------------
# CONTRACT WITH HARDWARE TEAM
# Share this with them: the device should publish JSON on MQTT_TOPIC
# (e.g. seafloor/sensors/AUV-01/data) shaped like:
#
# {
#   "device_id": "AUV-01",
#   "timestamp": "2026-08-25T10:30:00Z",   # optional, backend fills in if absent
#   "depth_m": 42.5,
#   "metal_signature": 68.2,               # raw sensor intensity/reading
#   "lat": 20.5937,
#   "lng": 78.9629
# }
# ---------------------------------------------------------------------------


async def handle_reading(payload: dict):
    """Runs on the asyncio event loop for every MQTT message received."""
    lat = payload.get("lat")
    lng = payload.get("lng")
    if lat is None or lng is None:
        print("Dropping message: missing lat/lng ->", payload)
        return

    timestamp = payload.get("timestamp")
    ts = datetime.fromisoformat(timestamp) if timestamp else datetime.now(timezone.utc)

    doc = {
        "device_id": payload.get("device_id", "unknown"),
        "timestamp": ts,
        "depth_m": payload.get("depth_m"),
        "metal_signature": payload.get("metal_signature"),
        "location": {"type": "Point", "coordinates": [lng, lat]},
        "raw_payload": payload,
    }

    # Hand off to the AI/ML teammate's service for classification
    ml_result = await classify_reading(payload)
    doc["metal_type"] = ml_result.get("metal_type")
    doc["confidence"] = ml_result.get("confidence")

    result = await readings_collection.insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    # Push to any connected frontend dashboards in real time
    await manager.broadcast({"event": "new_reading", "data": doc})

    # Delegate threshold-based alerting to alert_service.py
    await evaluate_reading(doc)


def on_connect(client, userdata, flags, rc, properties=None):
    print("MQTT connected with result code", rc)
    client.subscribe(MQTT_TOPIC)
    print(f"Subscribed to topic: {MQTT_TOPIC}")


def on_message(client, userdata, msg):
    """Runs on paho-mqtt's own background thread, so we hop back onto the asyncio loop."""
    try:
        payload = json.loads(msg.payload.decode())
    except json.JSONDecodeError:
        print("Invalid JSON on topic", msg.topic, "->", msg.payload)
        return

    if _loop is not None:
        asyncio.run_coroutine_threadsafe(handle_reading(payload), _loop)


def start_mqtt_client(loop):
    """Call once on FastAPI startup. Connects to the broker and starts listening."""
    global _loop
    _loop = loop

    client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    if MQTT_USERNAME:
        client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

    client.on_connect = on_connect
    client.on_message = on_message

    client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
    client.loop_start()  # non-blocking, runs in its own background thread
    return client