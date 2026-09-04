/*
 * ==============================================================================
 * SIH 2026 — Problem Statement ID: 26064
 * "Low-Cost Deployable Seafloor Metal Detection Sensor for Ocean Resource Exploration"
 *
 * ESP32 Physical Telemetry Node: 4-Pin Single-Axis Hall-Effect Sensor
 *
 * Hardware Wiring:
 *   - Hall Sensor VCC -> ESP32 3.3V
 *   - Hall Sensor GND -> ESP32 GND
 *   - Hall Sensor A0  -> ESP32 GPIO34 (ADC1 Channel 6, Input-Only Pin)
 *   - Hall Sensor D0  -> Unused
 *
 * Data Flow:
 *   analogRead(34) -> raw_adc -> Wi-Fi HTTP POST -> FastAPI /api/v1/readings
 * ==============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>

// ==============================================================================
// 1. NETWORK & BACKEND CONFIGURATION
// ==============================================================================
// Replace with your Wi-Fi router / mobile hotspot credentials:
const char* WIFI_SSID     = "realme12";
const char* WIFI_PASSWORD = "123456789";

// Replace with your laptop's local IPv4 address (e.g. 10.2.3.226 on your campus Wi-Fi)
// NOTE: Laptop and ESP32 must be on the same Wi-Fi / hotspot network.
const char* BACKEND_URL   = "http://10.215.104.186:8000/api/v1/readings";

// Hardware & Telemetry Identification
const int HALL_PIN     = 34;                // GPIO34
const char* SENSOR_ID  = "ESP32-HALL-01";
const char* SENSOR_TYPE = "hall_effect";

// Sampling delay in milliseconds (100ms = 10 Hz)
const unsigned long SAMPLING_DELAY_MS = 150;


// ==============================================================================
// 2. SETUP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================================");
  Serial.println("  SIH 2026: ESP32 Hall-Effect Telemetry Node Starting   ");
  Serial.println("========================================================");
  Serial.print("Target Backend URL: ");
  Serial.println(BACKEND_URL);

  // Configure ESP32 ADC on GPIO34
  // 12-bit resolution: readings range from 0 to 4095
  analogReadResolution(12);
  // ADC_11db: full 0V - 3.3V dynamic range
  analogSetAttenuation(ADC_11db);

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi [");
  Serial.print(WIFI_SSID);
  Serial.print("]");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi CONNECTED]");
    Serial.print("ESP32 IP Address : ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal Strength  : ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n[WARNING] Wi-Fi connection timed out. Check SSID/Password.");
    Serial.println("ESP32 will continue reading ADC and attempt reconnection in loop.");
  }
  Serial.println("--------------------------------------------------------\n");
}


// ==============================================================================
// 3. MAIN LOOP
// ==============================================================================
void loop() {
  // Check Wi-Fi connection and attempt auto-reconnect if dropped
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Wi-Fi] Reconnecting...");
    WiFi.reconnect();
    delay(1000);
    return;
  }

  // 1. Acquire raw Hall-Effect sensor ADC value (GPIO34)
  // Far away magnet -> ADC approx 4095; Close magnet -> ADC approx 0
  int raw_adc = analogRead(HALL_PIN);

  // 2. Build exact JSON payload matching FastAPI /api/v1/readings schema
  // (Coordinates x, y are intentionally omitted for this raw sensor stage)
  String jsonPayload = "{";
  jsonPayload += "\"sensor_id\":\"" + String(SENSOR_ID) + "\",";
  jsonPayload += "\"sensor_type\":\"" + String(SENSOR_TYPE) + "\",";
  jsonPayload += "\"raw_adc\":" + String(raw_adc);
  jsonPayload += "}";

  // 3. Transmit HTTP POST to FastAPI backend
  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(jsonPayload);

  // 4. Output telemetry status to Serial Monitor
  Serial.print("[ADC: ");
  Serial.print(raw_adc);
  Serial.print("] POST -> HTTP ");
  Serial.print(httpCode);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.print(" | Resp: ");
    Serial.println(response);
  } else {
    Serial.print(" | Error: ");
    Serial.println(http.errorToString(httpCode).c_str());
  }

  http.end();

  // 5. Sampling rate control
  delay(SAMPLING_DELAY_MS);
}
