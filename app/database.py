from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGO_URI, DB_NAME

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

readings_collection = db["readings"]
alerts_collection = db["alerts"]
devices_collection = db["devices"]
users_collection = db["users"]


async def init_indexes():
    """Run once on startup. Geospatial index enables 'find nearby readings' queries."""
    await readings_collection.create_index([("location", "2dsphere")])
    await readings_collection.create_index([("device_id", 1), ("timestamp", -1)])
    await alerts_collection.create_index([("timestamp", -1)])