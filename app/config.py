import os
from dotenv import load_dotenv

load_dotenv()

# --- Database ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "seafloor_db")

# --- MQTT (broker + topic the hardware team publishes to) ---
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
# '+' is a wildcard for device_id, e.g. seafloor/sensors/AUV-01/data
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "seafloor/sensors/+/data")
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "")

# --- AI/ML service ---
ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:8500/predict")

# --- Auth (used by security.py and your friend's routes/auth.py) ---
JWT_SECRET = os.getenv("JWT_SECRET", "change_this_secret")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 12

# --- Sensor Hardware Mode ---
SENSOR_MODE = os.getenv("SENSOR_MODE", "hall")  # "hall" | "magnetometer" | "mock"
HALL_CALIBRATION_SAMPLES = int(os.getenv("HALL_CALIBRATION_SAMPLES", "20"))
HALL_DEFAULT_BASELINE = float(os.getenv("HALL_DEFAULT_BASELINE", "4095.0"))

# --- Alerting ---
METAL_ALERT_THRESHOLD = float(os.getenv("METAL_ALERT_THRESHOLD", 75.0))