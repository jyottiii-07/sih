from app.config import METAL_ALERT_THRESHOLD
from app.database import alerts_collection
from app.ws_manager import manager


async def evaluate_reading(reading_doc: dict):
    """
    Checks a newly-saved reading against the alert threshold. If it crosses
    the line, creates an alert document and broadcasts it to any connected
    frontend dashboards over the WebSocket.

    Called by mqtt_client.py right after a reading is inserted into MongoDB.
    Returns the alert dict if one was created, otherwise None.
    """
    signature = reading_doc.get("metal_signature")
    if signature is None or signature < METAL_ALERT_THRESHOLD:
        return None

    alert = {
        "device_id": reading_doc.get("device_id"),
        "timestamp": reading_doc.get("timestamp"),
        "metal_signature": signature,
        "metal_type": reading_doc.get("metal_type"),
        "location": reading_doc.get("location"),
        "message": f"High metal signature ({signature}) detected by {reading_doc.get('device_id')}",
    }

    result = await alerts_collection.insert_one(alert)
    alert["_id"] = str(result.inserted_id)

    await manager.broadcast({"event": "alert", "data": alert})
    return alert