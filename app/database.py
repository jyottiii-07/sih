import os
import json
import aiosqlite
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

DB_PATH = os.getenv("SQLITE_DB_PATH", os.path.join(os.path.dirname(os.path.dirname(__file__)), "seafloor.db"))


async def get_db():
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


async def init_indexes():
    """Initializes SQLite tables and spatial/temporal indexes."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                x REAL NOT NULL,
                y REAL NOT NULL,
                bx REAL NOT NULL,
                by REAL NOT NULL,
                bz REAL NOT NULL,
                magnetic_signal REAL NOT NULL,
                anomaly_score REAL NOT NULL,
                classification TEXT NOT NULL,
                raw_payload TEXT
            )
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_readings_coords ON readings(x, y)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings(timestamp)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_readings_sensor_id ON readings(sensor_id)
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                x REAL NOT NULL,
                y REAL NOT NULL,
                magnetic_signal REAL NOT NULL,
                anomaly_score REAL NOT NULL,
                classification TEXT NOT NULL,
                message TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp)
        """)
        await db.commit()


async def insert_reading(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Inserts a single processed sensor reading into the SQLite database."""
    ts = doc.get("timestamp") or datetime.now(timezone.utc).isoformat()

    sensor_id = str(doc.get("sensor_id", "SFS-001"))
    x = float(doc.get("x", 0.0))
    y = float(doc.get("y", 0.0))
    bx = float(doc.get("bx", 0.0))
    by = float(doc.get("by", 0.0))
    bz = float(doc.get("bz", 0.0))
    magnetic_signal = float(doc.get("magnetic_signal", 0.0))
    anomaly_score = float(doc.get("anomaly_score", 0.0))
    classification = str(doc.get("classification", "normal"))
    raw_payload_str = json.dumps(doc.get("raw_payload", {}))

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO readings (
                sensor_id, timestamp, x, y, bx, by, bz,
                magnetic_signal, anomaly_score, classification, raw_payload
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (sensor_id, ts, x, y, bx, by, bz, magnetic_signal, anomaly_score, classification, raw_payload_str)
        )
        await db.commit()

    return {
        "sensor_id": sensor_id,
        "timestamp": ts,
        "x": x,
        "y": y,
        "bx": bx,
        "by": by,
        "bz": bz,
        "magnetic_signal": magnetic_signal,
        "anomaly_score": anomaly_score,
        "classification": classification,
        "sensor_type": doc.get("sensor_type", "magnetometer_3axis"),
        "raw_payload": doc.get("raw_payload", {}),
    }


async def get_readings(
    sensor_id: Optional[str] = None,
    limit: int = 500,
    since: Optional[str] = None,
    sort_desc: bool = False,
) -> List[Dict[str, Any]]:
    """Fetches historical readings matching query criteria."""
    query = "SELECT sensor_id, timestamp, x, y, bx, by, bz, magnetic_signal, anomaly_score, classification, raw_payload FROM readings"
    params = []
    conditions = []

    if sensor_id:
        conditions.append("sensor_id = ?")
        params.append(sensor_id)
    if since:
        conditions.append("timestamp >= ?")
        params.append(since)

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    order = "DESC" if sort_desc else "ASC"
    query += f" ORDER BY id {order} LIMIT ?"
    params.append(limit)

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            results = []
            for row in rows:
                stype = "magnetometer_3axis"
                if row["raw_payload"]:
                    try:
                        p = json.loads(row["raw_payload"])
                        stype = p.get("sensor_type", stype)
                    except Exception:
                        pass
                results.append({
                    "sensor_id": row["sensor_id"],
                    "timestamp": row["timestamp"],
                    "x": row["x"],
                    "y": row["y"],
                    "bx": row["bx"],
                    "by": row["by"],
                    "bz": row["bz"],
                    "magnetic_signal": row["magnetic_signal"],
                    "anomaly_score": row["anomaly_score"],
                    "classification": row["classification"],
                    "sensor_type": stype,
                })
            return results


async def get_latest_reading(sensor_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Returns the most recent single reading."""
    query = "SELECT sensor_id, timestamp, x, y, bx, by, bz, magnetic_signal, anomaly_score, classification, raw_payload FROM readings"
    params = []
    if sensor_id:
        query += " WHERE sensor_id = ?"
        params.append(sensor_id)
    query += " ORDER BY id DESC LIMIT 1"

    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(query, params) as cursor:
            row = await cursor.fetchone()
            if not row:
                return None
            stype = "magnetometer_3axis"
            if row["raw_payload"]:
                try:
                    p = json.loads(row["raw_payload"])
                    stype = p.get("sensor_type", stype)
                except Exception:
                    pass
            return {
                "sensor_id": row["sensor_id"],
                "timestamp": row["timestamp"],
                "x": row["x"],
                "y": row["y"],
                "bx": row["bx"],
                "by": row["by"],
                "bz": row["bz"],
                "magnetic_signal": row["magnetic_signal"],
                "anomaly_score": row["anomaly_score"],
                "classification": row["classification"],
                "sensor_type": stype,
            }


async def get_grid_cells() -> List[Dict[str, Any]]:
    """
    Returns unique Cartesian grid cells (x, y) with their latest readings
    and total sample count for the 2D survey tank heatmap.
    """
    query = """
        SELECT 
            x, y,
            bx, by, bz,
            magnetic_signal,
            anomaly_score,
            classification,
            timestamp as last_timestamp,
            COUNT(*) as readings_count
        FROM readings
        GROUP BY x, y
        ORDER BY y ASC, x ASC
    """
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(query) as cursor:
            rows = await cursor.fetchall()
            return [
                {
                    "x": row["x"],
                    "y": row["y"],
                    "bx": row["bx"],
                    "by": row["by"],
                    "bz": row["bz"],
                    "magnetic_signal": row["magnetic_signal"],
                    "anomaly_score": row["anomaly_score"],
                    "classification": row["classification"],
                    "readings_count": row["readings_count"],
                    "last_timestamp": row["last_timestamp"],
                }
                for row in rows
            ]


async def delete_all_readings() -> int:
    """Deletes all readings and alerts from the database."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("DELETE FROM readings")
        deleted = cursor.rowcount
        await db.execute("DELETE FROM alerts")
        await db.commit()
        return deleted


async def insert_alert(alert_doc: Dict[str, Any]) -> Dict[str, Any]:
    """Inserts a magnetic anomaly alert record into SQLite."""
    ts = alert_doc.get("timestamp") or datetime.now(timezone.utc).isoformat()
    sensor_id = str(alert_doc.get("sensor_id", "SFS-001"))
    x = float(alert_doc.get("x", 0.0))
    y = float(alert_doc.get("y", 0.0))
    mag = float(alert_doc.get("magnetic_signal", 0.0))
    score = float(alert_doc.get("anomaly_score", 0.0))
    classification = str(alert_doc.get("classification", "strong_anomaly"))
    msg = str(alert_doc.get("message", "Anomaly detected"))

    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            """
            INSERT INTO alerts (sensor_id, timestamp, x, y, magnetic_signal, anomaly_score, classification, message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (sensor_id, ts, x, y, mag, score, classification, msg)
        )
        await db.commit()
        alert_doc["id"] = cursor.lastrowid

    return alert_doc


async def get_alerts(limit: int = 50) -> List[Dict[str, Any]]:
    """Returns recent anomaly alerts."""
    query = "SELECT id, sensor_id, timestamp, x, y, magnetic_signal, anomaly_score, classification, message FROM alerts ORDER BY id DESC LIMIT ?"
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(query, (limit,)) as cursor:
            rows = await cursor.fetchall()
            return [
                {
                    "id": row["id"],
                    "sensor_id": row["sensor_id"],
                    "timestamp": row["timestamp"],
                    "x": row["x"],
                    "y": row["y"],
                    "magnetic_signal": row["magnetic_signal"],
                    "anomaly_score": row["anomaly_score"],
                    "classification": row["classification"],
                    "message": row["message"],
                }
                for row in rows
            ]