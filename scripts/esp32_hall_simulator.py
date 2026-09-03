"""
ESP32 Hall-Effect Sensor Pipeline Simulator
Problem Statement ID: 26064 (NCPOR / MoES)

Simulates the physical ESP32 Hall sensor streaming across survey grid coordinates
to test the complete end-to-end ingestion, normalization, scoring, database, and WebSocket pipeline.

Usage:
    .venv/Scripts/python.exe scripts/esp32_hall_simulator.py
"""

import time
import json
import httpx
import asyncio

BACKEND_URL = "http://127.0.0.1:8000/api/v1/readings"


async def simulate_survey():
    print("==================================================================")
    print("ESP32 HALL-EFFECT SENSOR SURVEY SIMULATION")
    print("==================================================================")
    print("Target Backend:", BACKEND_URL)
    print("Simulating survey grid with magnetized target localized around (2.0, 2.0)...\n")

    # Survey points: (x, y, simulated_raw_adc, description)
    survey_points = [
        # Startup Baseline Calibration Points (Quiet background ~4090)
        (0.0, 0.0, 4095, "Resting geomagnetic background"),
        (1.0, 0.0, 4090, "Resting geomagnetic background"),
        (2.0, 0.0, 4092, "Resting geomagnetic background"),
        (0.0, 1.0, 4088, "Resting geomagnetic background"),
        (1.0, 1.0, 3200, "Approaching magnetic target (mild field deviation)"),
        (2.0, 1.0, 2100, "Weak magnetic anomaly halo"),
        (0.0, 2.0, 4090, "Resting background"),
        (1.0, 2.0, 2050, "Weak magnetic anomaly halo"),
        (2.0, 2.0, 350,  "STRONG MAGNETIC TARGET CONTACT (Peak response)"),
        (3.0, 2.0, 2200, "Departing target / weak anomaly halo"),
        (2.0, 3.0, 4092, "Returned to resting background"),
    ]

    async with httpx.AsyncClient(timeout=10.0) as client:
        for idx, (x, y, raw_adc, desc) in enumerate(survey_points, 1):
            payload = {
                "sensor_id": "ESP32-HALL-01",
                "sensor_type": "hall_effect",
                "raw_adc": raw_adc,
                "x": x,
                "y": y,
            }

            try:
                resp = await client.post(BACKEND_URL, json=payload)
                if resp.status_code == 201:
                    data = resp.json()
                    print(
                        f"[{idx:02d}/{len(survey_points):02d}] Coord: ({x:.1f}, {y:.1f}) | "
                        f"Raw ADC: {raw_adc:4d} -> "
                        f"Mag Signal: {data['magnetic_signal']:.4f} | "
                        f"Anomaly Score: {data['anomaly_score']:.4f} | "
                        f"Class: {data['classification']:<14} | "
                        f"Note: {desc}"
                    )
                else:
                    print(f"[{idx:02d}] POST failed ({resp.status_code}): {resp.text}")
            except Exception as e:
                print(f"[{idx:02d}] Connection Error (Is backend running?): {e}")

            await asyncio.sleep(0.3)

    print("\n[Simulation Finished] All survey points processed through pipeline.")


if __name__ == "__main__":
    asyncio.run(simulate_survey())
