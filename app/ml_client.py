import httpx
from app.config import ML_SERVICE_URL


async def classify_reading(payload: dict) -> dict:
    """
    Sends a raw sensor reading to the AI/ML teammate's service and returns
    the predicted metal type + confidence.

    Agree with your ML teammate on a contract like:
      Request:  POST {"metal_signature": 68.2, "depth_m": 42.5, ...}
      Response: {"metal_type": "iron_ore", "confidence": 0.87}

    Falls back gracefully if the ML service is down or not built yet.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(ML_SERVICE_URL, json=payload)
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        return {"metal_type": "unknown", "confidence": 0.0, "error": str(e)}