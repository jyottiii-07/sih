import json
import asyncio
from datetime import datetime, timezone
import paho.mqtt.client as mqtt

from app.config import (
    MQTT_BROKER, MQTT_PORT, MQTT_TOPIC, MQTT_USERNAME, MQTT_PASSWORD,
)
from app.database import insert_reading
from app.ml_client import classify_reading
from app.ws_manager import manager
from app.alert_service import evaluate_reading

_loop = None


async def handle_reading(payload: dict):
    """Processes incoming magnetometer telemetry from MQTT topic."""
    # Ensure timestamp
    ts = payload.get("timestamp")
    if not ts:
        ts = datetime.now(timezone.utc).isoformat()

    # Determine coordinates
    x = float(payload.get("x", payload.get("lng", 0.0)))
    y = float(payload.get("y", payload.get("lat", 0.0)))

    # Raw magnetic field components
    bx = float(payload.get("bx", 0.0))
    by = float(payload.get("by", 0.0))
    bz = float(payload.get("bz", 0.0))

    # ML Inference
    ml_result = await classify_reading(payload)

    doc = {
        "sensor_id": str(payload.get("sensor_id", payload.get("device_id", "SFS-001"))),
        "timestamp": str(ts),
        "x": x,
        "y": y,
        "bx": bx,
        "by": by,
        "bz": bz,
        "magnetic_signal": ml_result["magnetic_signal"],
        "anomaly_score": ml_result["anomaly_score"],
        "classification": ml_result["classification"],
    }

    # Save to SQLite
    saved_doc = await insert_reading(doc)

    # Broadcast to live WebSockets
    await manager.broadcast("sensor_reading", saved_doc)

    # Check alert thresholds
    await evaluate_reading(saved_doc)


def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"[MQTT] Connected successfully. Subscribing to: {MQTT_TOPIC}")
        client.subscribe(MQTT_TOPIC)
    else:
        print(f"[MQTT] Connection returned code {rc}")


def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
    except json.JSONDecodeError:
        print("[MQTT] Invalid JSON on topic", msg.topic, "->", msg.payload)
        return

    if _loop is not None:
        asyncio.run_coroutine_threadsafe(handle_reading(payload), _loop)


def start_mqtt_client(loop):
    """Starts background MQTT client gracefully without blocking server startup."""
    global _loop
    _loop = loop

    try:
        client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
        if MQTT_USERNAME:
            client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

        client.on_connect = on_connect
        client.on_message = on_message

        # Non-blocking attempt to connect
        client.connect_async(MQTT_BROKER, MQTT_PORT, keepalive=60)
        client.loop_start()
        return client
    except Exception as e:
        print(f"[MQTT] Broker connection skipped or offline: {e}")
        return None