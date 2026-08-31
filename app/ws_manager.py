import json
from typing import List, Union, Dict, Any
from fastapi import WebSocket


class ConnectionManager:
    """Tracks connected frontend dashboards and broadcasts live sensor data to all of them."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, event_or_data: Union[str, Dict[str, Any]], payload: Dict[str, Any] = None):
        """
        Broadcasts message to all connected WebSocket clients.
        Supports both signatures:
        - broadcast("sensor_reading", payload_dict) -> {"event": "sensor_reading", "payload": payload_dict}
        - broadcast(dict_payload) -> dict_payload
        """
        if isinstance(event_or_data, str) and payload is not None:
            message_obj = {"event": event_or_data, "payload": payload}
        elif isinstance(event_or_data, dict):
            message_obj = event_or_data
        else:
            message_obj = {"event": str(event_or_data), "payload": payload or {}}

        text_data = json.dumps(message_obj, default=str)
        dead = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(text_data)
            except Exception:
                dead.append(connection)
        for d in dead:
            self.disconnect(d)


manager = ConnectionManager()