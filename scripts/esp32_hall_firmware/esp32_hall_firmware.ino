/*
 * ==============================================================================
 * SIH 2026 — Problem Statement ID: 26064
 * "Low-Cost Deployable Seafloor Metal Detection Sensor for Ocean Resource Exploration"
 *
 * ESP32 Production Telemetry Node: 4-Pin Hall-Effect Sensor
 * Dual-Channel Multi-Tier Detection (A0 Analog + D0 Comparator Pulse Density)
 *
 * Hardware Wiring:
 *   - Hall Sensor VCC -> ESP32 3.3V
 *   - Hall Sensor GND -> ESP32 GND
 *   - Hall Sensor A0  -> ESP32 GPIO34 (Analog Hall Voltage, 12-bit ADC)
 *   - Hall Sensor D0  -> ESP32 GPIO35 (Digital Comparator Interrupt Line)
 *
 * Key Capabilities:
 *   1. Hardware Interrupt Pulse Counting: Continuously catches high-frequency
 *      comparator chatter caused by unmagnetized ferromagnetic seafloor targets.
 *   2. Storm & Bounce Protection: Microsecond lockout guard prevents mechanical
 *      contact bounce / metal surface tapping from freezing the FreeRTOS watchdog.
 *   3. Leaky Integrator Filter: Smooths transient metal perturbations over ~1.5s
 *      for stable, glitch-free visualization on the React telemetry dashboard.
 *   4. Multi-Tier Classification:
 *      - Idle Resting Field   -> ADC 4095      -> NORMAL
 *      - Iron / Steel Targets -> ADC 2200-1800 -> WEAK ANOMALY (S_norm ~0.45-0.58)
 *      - Permanent Magnets    -> ADC 0-1200    -> STRONG ANOMALY (S_norm ~0.70-1.0)
 * ==============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>

// ==============================================================================
// 1. PIN DEFINITIONS & NETWORK CONFIGURATION
// ==============================================================================
const int HALL_ANALOG_PIN  = 34;    // A0 -> GPIO34 (Input-only ADC)
const int HALL_DIGITAL_PIN = 35;    // D0 -> GPIO35 (Input-only Digital Interrupt)

// Wi-Fi Credentials
const char* WIFI_SSID     = "realme12";
const char* WIFI_PASSWORD = "123456789";

// Backend API URL (Ensure laptop and ESP32 are on the same Wi-Fi network)
const char* BACKEND_URL   = "http://10.215.104.186:8000/api/v1/readings";

// Telemetry Identifiers
const char* SENSOR_ID     = "ESP32-HALL-01";
const char* SENSOR_TYPE   = "hall_effect";

// Sampling rate control (ms)
const unsigned long CYCLE_DELAY_MS = 150;


// ==============================================================================
// 2. INTERRUPT SERVICE ROUTINE (STORM & BOUNCE PROTECTED)
// ==============================================================================
volatile unsigned long pulse_counter = 0;
volatile unsigned long last_pulse_micros = 0;

void IRAM_ATTR onD0Pulse() {
  unsigned long now = micros();
  // Lockout guard: Ignore pulses closer than 150 microseconds (max ~6600 Hz)
  // Prevents contact chatter / metal surface tap from starving the CPU Watchdog!
  if (now - last_pulse_micros > 150) {
    pulse_counter++;
    last_pulse_micros = now;
  }
}

// Leaky integrator filter state
float smoothed_chatter = 0.0;
unsigned long last_cycle_time = 0;


// ==============================================================================
// 3. SETUP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================================");
  Serial.println("  SIH 2026: ESP32 Hall-Effect Telemetry Node Starting   ");
  Serial.println("========================================================");
  Serial.print("Analog Pin (A0) : GPIO "); Serial.println(HALL_ANALOG_PIN);
  Serial.print("Digital Pin (D0): GPIO "); Serial.println(HALL_DIGITAL_PIN);
  Serial.print("Target Backend  : "); Serial.println(BACKEND_URL);

  // Configure ESP32 ADC on GPIO34 (12-bit, 0 - 3.3V)
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // Configure D0 Pin with Hardware Falling-Edge Interrupt
  pinMode(HALL_DIGITAL_PIN, INPUT);
  attachInterrupt(digitalPinToInterrupt(HALL_DIGITAL_PIN), onD0Pulse, FALLING);

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi [");
  Serial.print(WIFI_SSID);
  Serial.print("]");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(400);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi CONNECTED]");
    Serial.print("ESP32 IP Address : ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WARNING] Wi-Fi offline. Continuing in Standalone Serial Diagnostic Mode.");
  }
  Serial.println("--------------------------------------------------------------------------------");
  Serial.println("RAW_A0  | PULSES | CHATTER | EFFECTIVE_ADC | CLASSIFICATION");
  Serial.println("--------------------------------------------------------------------------------");
}


// ==============================================================================
// 4. MAIN LOOP
// ==============================================================================
void loop() {
  unsigned long now = millis();
  if (now - last_cycle_time < CYCLE_DELAY_MS) {
    return;
  }
  last_cycle_time = now;

  // --- Step 1: Read and reset pulse counter atomically ---
  noInterrupts();
  unsigned long pulses = pulse_counter;
  pulse_counter = 0;
  interrupts();

  // --- Step 2: Leaky Integrator / Peak Hold Filter ---
  // Fast attack on pulse burst, smooth exponential decay over ~1.5s
  float instant_pulses = (float)pulses;
  if (instant_pulses > smoothed_chatter) {
    smoothed_chatter = instant_pulses;
  } else {
    smoothed_chatter = (smoothed_chatter * 0.72);
  }

  // --- Step 3: Read Analog A0 (4x oversampling for noise suppression) ---
  long a0_sum = 0;
  for (int i = 0; i < 4; i++) {
    a0_sum += analogRead(HALL_ANALOG_PIN);
    delayMicroseconds(50);
  }
  int raw_adc = a0_sum / 4;

  // --- Step 4: Multi-Tier Classification & Effective ADC Synthesis ---
  int effective_adc = raw_adc;
  String classification = "NORMAL (Idle)";

  if (raw_adc < 1500) {
    // Tier 3: Strong Magnet (Direct static flux drop on A0)
    effective_adc = raw_adc;
    classification = "STRONG ANOMALY (Magnet)";
  } 
  else if (smoothed_chatter >= 2.0) {
    // Tier 2: Ferromagnetic Metal (Iron/Steel detected via D0 comparator chatter)
    // Scale chatter into the Weak Anomaly range (effective ADC ~2200 to 1800)
    // Baseline is 4095; deviation ~1900-2300 gives normalized score ~0.46-0.56 (Weak Anomaly)
    int drop = 1800 + (int)(min(smoothed_chatter, 40.0f) * 12.0);
    effective_adc = 4095 - drop;
    if (effective_adc < 1750) effective_adc = 1750;
    if (effective_adc > 2300) effective_adc = 2300;
    classification = "WEAK ANOMALY (Ferromagnetic Target)";
  } 
  else {
    // Tier 1: Idle Ambient State
    effective_adc = 4095;
    classification = "NORMAL (Idle)";
  }

  // --- Step 5: Serial Monitor Output ---
  Serial.printf("A0: %4d | Pulses: %3lu | Smooth: %4.1f | EFF_ADC: %4d | %s",
    raw_adc, pulses, smoothed_chatter, effective_adc, classification.c_str());

  // --- Step 6: Transmit Telemetry via HTTP POST to FastAPI Backend ---
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");

    // Standard SIH 2026 schema
    String payload = "{";
    payload += "\"sensor_id\":\"" + String(SENSOR_ID) + "\",";
    payload += "\"sensor_type\":\"" + String(SENSOR_TYPE) + "\",";
    payload += "\"raw_adc\":" + String(effective_adc);
    payload += "}";

    int code = http.POST(payload);
    Serial.printf(" | HTTP %d\n", code);
    http.end();
  } else {
    // Auto-reconnect if Wi-Fi drops
    Serial.println(" | [Offline - Reconnecting...]");
    WiFi.reconnect();
  }
}
