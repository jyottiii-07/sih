/*
 * ESP32 DOIT DEVKIT V1 - Hall-Effect Sensor Telemetry Firmware
 * Problem Statement ID: 26064: Seafloor Metal Detection Sensor
 *
 * Hardware Wiring:
 * - VCC -> ESP32 3V3
 * - GND -> ESP32 GND
 * - A0  -> ESP32 GPIO 34 (ADC1 Channel 6)
 * - D0  -> Unused
 *
 * Operational Behavior:
 * - Automatic startup baseline calibration (averages initial 50 resting samples)
 * - Multi-sample noise filtering (10-sample ADC oversampling per loop)
 * - Transmits standardized JSON telemetry over WiFi to FastAPI backend
 */

#include <WiFi.h>
#include <HTTPClient.h>

// --- Configuration ---
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* BACKEND_URL   = "http://192.168.1.100:8000/api/v1/readings";

const int HALL_ADC_PIN = 34; // GPIO 34 (Input only, ADC1)
const char* SENSOR_ID  = "ESP32-HALL-01";

// Grid survey coordinates (can be updated dynamically or via stepper/odometry)
float current_x = 0.0;
float current_y = 0.0;

// Baseline Calibration State
float baseline_adc = 4095.0;
const int CALIBRATION_SAMPLES = 50;

// Multi-sample averaging
int readAveragedADC(int pin, int samples = 10) {
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delay(2);
  }
  return (int)(sum / samples);
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[ESP32] Initializing Hall-Effect Telemetry Node...");

  // Configure ADC
  analogReadResolution(12); // 12-bit ADC (0 - 4095)
  analogSetAttenuation(ADC_11db); // Full 0 - 3.3V range

  // 1. Automatic Startup Baseline Calibration
  Serial.println("[ESP32] Performing automatic resting baseline calibration (Keep magnets away)...");
  long cal_sum = 0;
  for (int i = 0; i < CALIBRATION_SAMPLES; i++) {
    cal_sum += readAveragedADC(HALL_ADC_PIN, 5);
    delay(20);
  }
  baseline_adc = (float)cal_sum / CALIBRATION_SAMPLES;
  Serial.print("[ESP32] Baseline Calibrated: ");
  Serial.println(baseline_adc);

  // 2. Connect WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[ESP32] Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[ESP32] WiFi Connected. IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n[ESP32] WiFi connection failed or running in Serial-only mode.");
  }
}

void loop() {
  // Read filtered Hall ADC
  int raw_adc = readAveragedADC(HALL_ADC_PIN, 10);

  // Construct JSON payload
  // Single-axis Hall telemetry format with coordinates
  String jsonPayload = "{";
  jsonPayload += "\"sensor_id\":\"" + String(SENSOR_ID) + "\",";
  jsonPayload += "\"sensor_type\":\"hall_effect\",";
  jsonPayload += "\"raw_adc\":" + String(raw_adc) + ",";
  jsonPayload += "\"x\":" + String(current_x, 2) + ",";
  jsonPayload += "\"y\":" + String(current_y, 2);
  jsonPayload += "}";

  Serial.println("[Telemetry] " + jsonPayload);

  // Send to FastAPI Backend if WiFi connected
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");

    int httpResponseCode = http.POST(jsonPayload);
    if (httpResponseCode > 0) {
      Serial.print(" -> Backend Response: ");
      Serial.println(httpResponseCode);
    } else {
      Serial.print(" -> POST Error: ");
      Serial.println(http.errorToString(httpResponseCode).c_str());
    }
    http.end();
  }

  // Telemetry rate: 5 Hz (200ms interval)
  delay(200);
}
