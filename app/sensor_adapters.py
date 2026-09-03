"""
Sensor Adapter Layer for NCPOR / MoES Seafloor Metal Detection System.
Problem Statement ID: 26064

Provides modular, lightweight normalization adapters for:
1. Single-Axis Hall-Effect Sensor (ESP32 ADC with automatic baseline calibration)
2. 3-Axis Magnetometer (QMC5883L/HMC5883L physical 3-axis vector data)

IMPORTANT SCIENTIFIC CLARIFICATIONS:
- The single-axis Hall sensor measures 1D magnetic perturbation, NOT 3-axis vectors.
- For single-axis Hall mode, bx=0.0, by=0.0, bz=S_norm is strictly an internal
  backward-compatible representation to adhere to the existing 10-field telemetry contract.
- Hall signal S_norm is a dimensionless normalized magnetic response [0.0, 1.0], NOT measured in uT.
"""

from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timezone
import math
import numpy as np


class HallEffectSensorAdapter:
    """
    Adapter for Single-Axis Hall-Effect Sensor on ESP32 (GPIO34 / A0).
    
    Features:
    - Automatic startup baseline calibration (collects initial N resting samples)
    - Moving average / median noise filtering
    - Dynamic range derivation: dynamic_range = baseline - min_floor
    - Normalized magnetic response computation: S_norm in [0.0, 1.0]
    - Reliable magnetic-target detection without fabricating 3D vector fields
    """

    def __init__(
        self,
        calibration_samples: int = 10,
        default_baseline: float = 4095.0,
        min_floor: float = 0.0,
        filter_window_size: int = 1,
    ):
        self.calibration_samples = calibration_samples
        self.default_baseline = default_baseline
        self.min_floor = min_floor
        self.filter_window_size = filter_window_size

        # Calibration state
        self._initial_readings: List[float] = []
        self._calibrated_baseline: Optional[float] = None
        self._recent_readings: List[float] = []

    def calibrate_baseline(self, samples: List[float]) -> float:
        """Explicitly sets baseline from a batch of resting calibration samples."""
        if not samples:
            self._calibrated_baseline = self.default_baseline
        else:
            self._calibrated_baseline = float(np.median(samples))
        return self._calibrated_baseline

    @property
    def baseline(self) -> float:
        return self._calibrated_baseline if self._calibrated_baseline is not None else self.default_baseline

    @property
    def is_calibrated(self) -> bool:
        return self._calibrated_baseline is not None

    def reset_calibration(self):
        """Resets dynamic calibration state."""
        self._initial_readings = []
        self._calibrated_baseline = None
        self._recent_readings = []

    def process_raw_reading(
        self,
        raw_adc: float,
        x: float = 0.0,
        y: float = 0.0,
        sensor_id: str = "ESP32-HALL-01",
        timestamp: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Processes a raw Hall ADC reading from ESP32.
        
        Transformation pipeline:
        raw_adc -> noise filtering -> baseline deviation -> normalized response S_norm
        """
        ts = timestamp or datetime.now(timezone.utc).isoformat()
        adc_val = float(raw_adc)

        # 1. Automatic Startup Calibration
        if self._calibrated_baseline is None:
            self._initial_readings.append(adc_val)
            if len(self._initial_readings) >= self.calibration_samples:
                self._calibrated_baseline = float(np.median(self._initial_readings))
            current_baseline = self._calibrated_baseline if self._calibrated_baseline is not None else self.default_baseline
        else:
            current_baseline = self._calibrated_baseline

        # 2. Noise Filtering (Sliding window median + mean)
        self._recent_readings.append(adc_val)
        if len(self._recent_readings) > self.filter_window_size:
            self._recent_readings.pop(0)
        filtered_adc = float(np.median(self._recent_readings))

        # 3. Baseline Deviation
        # Since magnet presence lowers the ADC towards 0:
        deviation = max(0.0, current_baseline - filtered_adc)

        # 4. Dynamic Range & Normalization
        dynamic_range = max(1.0, current_baseline - self.min_floor)
        s_norm = max(0.0, min(1.0, deviation / dynamic_range))
        s_norm = round(s_norm, 4)

        # 5. Backward-Compatible Contract Representation
        # Note: bx=0, by=0, bz=s_norm is purely a 1D compatibility mapping, NOT physically measured 3-axis data.
        return {
            "sensor_id": str(sensor_id),
            "timestamp": str(ts),
            "x": float(x),
            "y": float(y),
            "bx": 0.0,
            "by": 0.0,
            "bz": s_norm,
            "magnetic_signal": s_norm,
            "sensor_type": "hall_effect",
            "raw_payload": {
                "sensor_type": "hall_effect",
                "raw_adc": round(adc_val, 2),
                "filtered_adc": round(filtered_adc, 2),
                "baseline_adc": round(current_baseline, 2),
                "deviation": round(deviation, 2),
                "normalized_response": s_norm,
                "is_calibrated": self.is_calibrated,
            },
        }


class Magnetometer3AxisAdapter:
    """
    Adapter for Physical 3-Axis Magnetometer (QMC5883L/HMC5883L).
    Preserves existing 3-axis vector data and total field intensity.
    """

    def process_reading(
        self,
        bx: float,
        by: float,
        bz: float,
        x: float = 0.0,
        y: float = 0.0,
        sensor_id: str = "SFS-001",
        timestamp: Optional[str] = None,
        raw_payload: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        ts = timestamp or datetime.now(timezone.utc).isoformat()
        bx_f = float(bx)
        by_f = float(by)
        bz_f = float(bz)
        mag_sig = round(math.sqrt(bx_f**2 + by_f**2 + bz_f**2), 4)

        return {
            "sensor_id": str(sensor_id),
            "timestamp": str(ts),
            "x": float(x),
            "y": float(y),
            "bx": bx_f,
            "by": by_f,
            "bz": bz_f,
            "magnetic_signal": mag_sig,
            "sensor_type": "magnetometer_3axis",
            "raw_payload": raw_payload or {
                "sensor_type": "magnetometer_3axis",
                "bx": bx_f,
                "by": by_f,
                "bz": bz_f,
            },
        }


class SensorAdapterDispatcher:
    """
    Dispatcher that inspects incoming telemetry payloads and routes them to the
    appropriate sensor adapter (Hall-Effect single axis vs 3-Axis Magnetometer).
    """

    def __init__(self, default_mode: str = "hall"):
        self.default_mode = default_mode
        self.hall_adapter = HallEffectSensorAdapter()
        self.mag_adapter = Magnetometer3AxisAdapter()

    def process(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Auto-detects payload format and returns a normalized dictionary.
        """
        sensor_type = payload.get("sensor_type")
        raw_adc = payload.get("raw_adc") or payload.get("adc") or payload.get("raw_hall_value")

        # Explicit or auto-detected Hall Effect payload
        if sensor_type == "hall_effect" or raw_adc is not None:
            adc_val = float(raw_adc) if raw_adc is not None else 4095.0
            return self.hall_adapter.process_raw_reading(
                raw_adc=adc_val,
                x=float(payload.get("x", 0.0)),
                y=float(payload.get("y", 0.0)),
                sensor_id=str(payload.get("sensor_id", payload.get("device_id", "ESP32-HALL-01"))),
                timestamp=payload.get("timestamp"),
            )

        # Standard 3-Axis Magnetometer payload
        bx = payload.get("bx")
        by = payload.get("by")
        bz = payload.get("bz")

        if bx is not None and by is not None and bz is not None:
            return self.mag_adapter.process_reading(
                bx=float(bx),
                by=float(by),
                bz=float(bz),
                x=float(payload.get("x", 0.0)),
                y=float(payload.get("y", 0.0)),
                sensor_id=str(payload.get("sensor_id", payload.get("device_id", "SFS-001"))),
                timestamp=payload.get("timestamp"),
                raw_payload=payload.get("raw_payload"),
            )

        # Default fallback
        if self.default_mode == "hall":
            return self.hall_adapter.process_raw_reading(
                raw_adc=4095.0,
                x=float(payload.get("x", 0.0)),
                y=float(payload.get("y", 0.0)),
                sensor_id=str(payload.get("sensor_id", "ESP32-HALL-01")),
                timestamp=payload.get("timestamp"),
            )
        else:
            return self.mag_adapter.process_reading(
                bx=0.0,
                by=0.0,
                bz=0.0,
                x=float(payload.get("x", 0.0)),
                y=float(payload.get("y", 0.0)),
                sensor_id=str(payload.get("sensor_id", "SFS-001")),
                timestamp=payload.get("timestamp"),
            )


try:
    from app.config import SENSOR_MODE, HALL_CALIBRATION_SAMPLES, HALL_DEFAULT_BASELINE
except ImportError:
    SENSOR_MODE = "hall"
    HALL_CALIBRATION_SAMPLES = 20
    HALL_DEFAULT_BASELINE = 4095.0

# Singleton instance configured from environment
sensor_dispatcher = SensorAdapterDispatcher(default_mode=SENSOR_MODE)
sensor_dispatcher.hall_adapter.calibration_samples = HALL_CALIBRATION_SAMPLES
sensor_dispatcher.hall_adapter.default_baseline = HALL_DEFAULT_BASELINE
