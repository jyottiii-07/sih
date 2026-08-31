from app.database import insert_alert
from app.ws_manager import manager


async def evaluate_reading(reading_doc: dict):
    """
    Checks a newly processed reading against anomaly alert criteria.
    If anomaly_score >= 0.70 or classification == 'strong_anomaly', triggers
    a high-priority alert and broadcasts over WebSockets.
    """
    score = float(reading_doc.get("anomaly_score", 0.0))
    classification = str(reading_doc.get("classification", "normal"))
    mag = float(reading_doc.get("magnetic_signal", 0.0))

    if score < 0.70 and classification != "strong_anomaly":
        return None

    alert = {
        "sensor_id": str(reading_doc.get("sensor_id", "SFS-001")),
        "timestamp": str(reading_doc.get("timestamp", "")),
        "x": float(reading_doc.get("x", 0.0)),
        "y": float(reading_doc.get("y", 0.0)),
        "magnetic_signal": mag,
        "anomaly_score": score,
        "classification": classification,
        "message": f"Strong magnetic anomaly (Score: {score:.2f}, Signal: {mag:.2f}) detected at Grid ({reading_doc.get('x')}, {reading_doc.get('y')})",
    }

    saved_alert = await insert_alert(alert)
    await manager.broadcast("alert", saved_alert)
    return saved_alert