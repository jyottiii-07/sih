"""
Unit & Integration Tests for Hall-Effect Sensor Adapter & Multi-Mode Sensor Ingestion.
Problem Statement ID: 26064 (NCPOR / MoES)

Verifies:
1. Automatic startup baseline calibration
2. Dynamic range derivation without hard-coded numbers
3. Noise filtering (sliding window median)
4. Magnetic target response normalization [0.0, 1.0]
5. 3-tier classification (normal, weak_anomaly, strong_anomaly)
6. Backward compatibility with 3-axis magnetometer path
"""

import asyncio
import pytest
import numpy as np
from app.sensor_adapters import HallEffectSensorAdapter, Magnetometer3AxisAdapter, SensorAdapterDispatcher
from app.ml_client import classify_reading


def test_hall_adapter_automatic_startup_calibration():
    """Verifies that baseline is automatically derived from initial startup readings."""
    adapter = HallEffectSensorAdapter(calibration_samples=10, default_baseline=4095.0)
    assert not adapter.is_calibrated

    # Feed 10 baseline samples around ADC 4050 with small noise
    resting_samples = [4050.0 + (i % 3 - 1) * 5.0 for i in range(10)]
    for s in resting_samples:
        result = adapter.process_raw_reading(raw_adc=s, x=1.0, y=2.0)

    assert adapter.is_calibrated
    assert pytest.approx(adapter.baseline, abs=5.0) == 4050.0


def test_hall_adapter_noise_filtering_and_deviation():
    """Verifies sliding window median noise suppression."""
    adapter = HallEffectSensorAdapter(calibration_samples=5, default_baseline=4000.0, filter_window_size=5)
    # Calibrate baseline to 4000
    for _ in range(5):
        adapter.process_raw_reading(raw_adc=4000.0)

    # A single noisy spike shouldn't immediately blow up the median filter
    res = adapter.process_raw_reading(raw_adc=1000.0)
    # In window [4000, 4000, 4000, 4000, 1000], median is still 4000
    assert res["raw_payload"]["filtered_adc"] == 4000.0
    assert res["magnetic_signal"] == 0.0


def test_hall_dynamic_range_and_normalization():
    """Verifies that normalization is derived dynamically from baseline range."""
    adapter = HallEffectSensorAdapter(calibration_samples=5, default_baseline=4000.0, min_floor=0.0, filter_window_size=3)
    for _ in range(5):
        adapter.process_raw_reading(raw_adc=4000.0)

    # 1. Quiet baseline reading (sustained 3 samples)
    for _ in range(3):
        quiet = adapter.process_raw_reading(raw_adc=3980.0, x=0.0, y=0.0)
    assert quiet["magnetic_signal"] < 0.05
    assert quiet["bx"] == 0.0 and quiet["by"] == 0.0
    assert quiet["bz"] == quiet["magnetic_signal"]
    assert quiet["sensor_type"] == "hall_effect"

    # 2. Moderate deviation (e.g. ~50% drop in ADC, sustained 3 samples)
    mid_adc = 2000.0
    for _ in range(3):
        mid = adapter.process_raw_reading(raw_adc=mid_adc)
    expected_mid_norm = (4000.0 - mid_adc) / 4000.0
    assert pytest.approx(mid["magnetic_signal"], abs=0.05) == expected_mid_norm

    # 3. Strong target / saturation near min_floor (sustained 3 samples)
    for _ in range(3):
        sat = adapter.process_raw_reading(raw_adc=100.0)
    assert sat["magnetic_signal"] >= 0.90


def test_hall_ml_classification_pipeline():
    """Verifies classification mapping on Hall normalized signals."""
    adapter = HallEffectSensorAdapter(calibration_samples=5, default_baseline=4000.0, filter_window_size=3)
    for _ in range(5):
        adapter.process_raw_reading(raw_adc=4000.0)

    # Quiet -> normal (< 0.40)
    for _ in range(3):
        reading_normal = adapter.process_raw_reading(raw_adc=3800.0)
    ml_normal = asyncio.run(classify_reading(reading_normal))
    assert ml_normal["classification"] == "normal"
    assert ml_normal["anomaly_score"] < 0.40

    # Weak target (between 0.40 and 0.70)
    for _ in range(3):
        reading_weak = adapter.process_raw_reading(raw_adc=1800.0)
    ml_weak = asyncio.run(classify_reading(reading_weak))
    assert ml_weak["classification"] == "weak_anomaly"
    assert 0.40 <= ml_weak["anomaly_score"] < 0.70

    # Strong target (>= 0.70)
    for _ in range(3):
        reading_strong = adapter.process_raw_reading(raw_adc=400.0)
    ml_strong = asyncio.run(classify_reading(reading_strong))
    assert ml_strong["classification"] == "strong_anomaly"
    assert ml_strong["anomaly_score"] >= 0.70


def test_dispatcher_auto_detection():
    """Verifies that SensorAdapterDispatcher routes Hall and 3-axis payloads accurately."""
    dispatcher = SensorAdapterDispatcher()

    # Hall payload with raw_adc
    hall_payload = {"sensor_id": "ESP32-01", "raw_adc": 1500, "x": 5.0, "y": 10.0}
    norm_hall = dispatcher.process(hall_payload)
    assert norm_hall["sensor_type"] == "hall_effect"
    assert norm_hall["bx"] == 0.0 and norm_hall["by"] == 0.0
    assert norm_hall["magnetic_signal"] > 0.0

    # 3-Axis magnetometer payload
    mag_payload = {"sensor_id": "SFS-001", "bx": 12.0, "by": 4.0, "bz": 42.0, "x": 1.0, "y": 2.0}
    norm_mag = dispatcher.process(mag_payload)
    assert norm_mag["sensor_type"] == "magnetometer_3axis"
    assert norm_mag["bx"] == 12.0
    assert norm_mag["by"] == 4.0
    assert norm_mag["bz"] == 42.0
    assert pytest.approx(norm_mag["magnetic_signal"], abs=0.1) == np.sqrt(12**2 + 4**2 + 42**2)


def test_3axis_magnetometer_unchanged_behavior():
    """Ensures existing 3-axis magnetometer scoring path remains completely intact."""
    mag_payload = {"sensor_id": "SFS-001", "bx": 10.0, "by": 2.0, "bz": 43.5, "sensor_type": "magnetometer_3axis"}
    ml_mag = asyncio.run(classify_reading(mag_payload))
    assert "magnetic_signal" in ml_mag
    assert "anomaly_score" in ml_mag
    assert ml_mag["classification"] in ["normal", "weak_anomaly", "strong_anomaly"]
