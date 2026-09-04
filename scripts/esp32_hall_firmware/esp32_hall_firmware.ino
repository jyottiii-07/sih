/*
 * ==============================================================================
 * SIH 2026 — Problem Statement ID: 26064
 * "Low-Cost Deployable Seafloor Metal Detection Sensor for Ocean Resource Exploration"
 * Ministry of Earth Sciences (MoES) / National Centre for Polar and Ocean Research (NCPOR)
 *
 * ESP32 Production Telemetry Node: 4-Pin Hall-Effect Sensor
 * Dual-Channel Detection (A0 Analog + D0 Comparator Pulse Density)
 * WITH EMBEDDED WAYPOINT GRID SURVEY CONTROLLER (Option 1)
 *
 * Hardware Wiring:
 *   - Hall Sensor VCC -> ESP32 3.3V
 *   - Hall Sensor GND -> ESP32 GND
 *   - Hall Sensor A0  -> ESP32 GPIO34 (Analog Hall Voltage, 12-bit ADC)
 *   - Hall Sensor D0  -> ESP32 GPIO35 (Digital Comparator Interrupt Line)
 *   - BOOT Button     -> ESP32 GPIO0  (Tactile Waypoint Capture & Stepping Trigger)
 *   - Status LED      -> ESP32 GPIO2  (Onboard Blue LED Signaling Indicator)
 *
 * Key Capabilities:
 *   1. Hardware Interrupt Pulse Counting: Continuously catches high-frequency
 *      comparator chatter caused by unmagnetized ferromagnetic seafloor targets.
 *   2. Storm & Bounce Protection: Microsecond lockout guard (150us) prevents
 *      mechanical tap chatter from starving the FreeRTOS watchdog (no SW_RESET).
 *   3. Leaky Integrator Filter: Smooths transient metal perturbations over ~1.5s
 *      for stable visualization on the React telemetry dashboard.
 *   4. Multi-Tier Classification:
 *      - Idle Ambient Field   -> ADC 4095      -> NORMAL (Clear Seabed)
 *      - Iron / Steel Targets -> ADC 2200-1800 -> WEAK ANOMALY (Ferromagnetic Target)
 *      - Permanent Magnets    -> ADC 0-1200    -> STRONG ANOMALY (Magnetic Source)
 *   5. Tactile Waypoint Grid Controller (Option 1):
 *      - Short Press BOOT (<2s): Captures reading at (X,Y), blinks LED, transmits
 *        single HTTP POST, and advances coordinate along the 5x5 survey sweep path.
 *      - Long Press BOOT (>2s) : Resets survey coordinates back to (0.0, 0.0).
 *      - Prevents continuous HTTP flooding / screen green dot clutter.
 * ==============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>

// ==============================================================================
// 1. PIN DEFINITIONS & NETWORK CONFIGURATION
// ==============================================================================
const int HALL_ANALOG_PIN  = 34;    // A0 -> GPIO34 (Input-only ADC)
const int HALL_DIGITAL_PIN = 35;    // D0 -> GPIO35 (Input-only Digital Interrupt)
const int BOOT_BUTTON_PIN  = 0;     // BOOT Button -> GPIO0 (Internal pull-up, Active LOW)
const int ONBOARD_LED_PIN  = 2;     // Onboard Blue LED -> GPIO2

// Wi-Fi Credentials
const char* WIFI_SSID     = "realme12";
const char* WIFI_PASSWORD = "123456789";

// Backend API URL (Ensure laptop and ESP32 are on the same Wi-Fi network)
const char* BACKEND_URL   = "http://10.215.104.186:8000/api/v1/readings";

// Telemetry Identifiers
const char* SENSOR_ID     = "ESP32-HALL-01";
const char* SENSOR_TYPE   = "hall_effect";

// Diagnostic loop timing (ms)
const unsigned long CYCLE_DELAY_MS = 50;
const unsigned long SERIAL_PRINT_INTERVAL_MS = 300;


// ==============================================================================
// 2. SURVEY GRID CONFIGURATION (5x5 Grid: 0 to 40 in steps of 10)
// ==============================================================================
const int GRID_COLS        = 5;     // 5 columns (X: 0, 10, 20, 30, 40)
const int GRID_ROWS        = 5;     // 5 rows    (Y: 0, 10, 20, 30, 40)
const float STEP_SIZE      = 10.0;  // Spacing in survey grid units

int current_col = 0;                // Column index: 0 to 4
int current_row = 0;                // Row index: 0 to 4

// Button state tracking (Non-blocking debounce & long-press)
bool last_button_state = false;
unsigned long button_press_start = 0;
bool long_press_handled = false;


// ==============================================================================
// 3. HARDWARE INTERRUPT & STORM PROTECTION
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
unsigned long last_serial_print_time = 0;


// ==============================================================================
// 4. LED SIGNALING HELPER
// ==============================================================================
void blinkLed(int times, int on_ms, int off_ms) {
  for (int i = 0; i < times; i++) {
    digitalWrite(ONBOARD_LED_PIN, HIGH);
    delay(on_ms);
    digitalWrite(ONBOARD_LED_PIN, LOW);
    if (i < times - 1) delay(off_ms);
  }
}


// ==============================================================================
// 5. SURVEY RESET FUNCTION (Long Press > 2s)
// ==============================================================================
void resetSurveyCoordinates() {
  current_col = 0;
  current_row = 0;
  Serial.println("\n================================================================================");
  Serial.println("  *** [SURVEY RESET] Survey coordinates manually reset to Cell (0, 0) ***");
  Serial.println("  Next Target: (X: 0.0, Y: 0.0) -> Place sensor at origin and tap BOOT to start");
  Serial.println("================================================================================\n");
  blinkLed(3, 150, 100);
}


// ==============================================================================
// 6. WAYPOINT CAPTURE & HTTP TRANSMISSION
// ==============================================================================
void captureAndTransmitWaypoint(int effective_adc, String classification) {
  float x_coord = current_col * STEP_SIZE;
  float y_coord = current_row * STEP_SIZE;

  Serial.println("\n--------------------------------------------------------------------------------");
  Serial.printf("[WAYPOINT CAPTURE TRIGGERED] Cell (%d, %d) -> Target Coords: (X: %.1f, Y: %.1f)\n",
    current_col, current_row, x_coord, y_coord);
  Serial.printf("Sensor Signal: EFF_ADC = %d | %s\n", effective_adc, classification.c_str());

  // Transmit Telemetry via HTTP POST to FastAPI Backend
  bool transmit_success = false;
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");

    // Locked SIH 2026 schema with discrete survey waypoint coordinates
    String payload = "{";
    payload += "\"sensor_id\":\"" + String(SENSOR_ID) + "\",";
    payload += "\"sensor_type\":\"" + String(SENSOR_TYPE) + "\",";
    payload += "\"raw_adc\":" + String(effective_adc) + ",";
    payload += "\"x\":" + String(x_coord, 1) + ",";
    payload += "\"y\":" + String(y_coord, 1);
    payload += "}";

    int http_code = http.POST(payload);
    if (http_code == 200 || http_code == 201) {
      Serial.printf("Backend Ingestion Success: HTTP %d (Stored in DB & Emitted to Heatmap)\n", http_code);
      transmit_success = true;
    } else {
      Serial.printf("Backend Ingestion Warning: HTTP %d\n", http_code);
    }
    http.end();
  } else {
    Serial.println("[WARNING] Wi-Fi offline. Reading captured locally on Serial only.");
    WiFi.reconnect();
  }

  // --- Step coordinates along survey path ---
  current_col++;
  if (current_col >= GRID_COLS) {
    // Reached boundary of current row -> step to next row
    current_col = 0;
    current_row++;
    if (current_row >= GRID_ROWS) {
      // Completed entire 5x5 grid! Cycle back to 0,0
      current_row = 0;
      Serial.println("\n********************************************************************************");
      Serial.println("  *** [GRID SURVEY COMPLETED] All 25 cells surveyed! Resetting to (0.0, 0.0) ***");
      Serial.println("********************************************************************************\n");
      blinkLed(3, 150, 100);
    } else {
      Serial.printf("\n>>> [ROW ADVANCED] Completed row! Advancing to Row %d -> Next: (X: %.1f, Y: %.1f)\n",
        current_row, 0.0, current_row * STEP_SIZE);
      blinkLed(2, 120, 80);
    }
  } else {
    // Standard waypoint logged in current row
    blinkLed(1, 100, 50);
  }

  float next_x = current_col * STEP_SIZE;
  float next_y = current_row * STEP_SIZE;
  Serial.printf(">>> [NEXT TARGET] Move sensor to Cell (%d, %d) -> (X: %.1f, Y: %.1f) & Press BOOT\n",
    current_col, current_row, next_x, next_y);
  Serial.println("--------------------------------------------------------------------------------\n");
}


// ==============================================================================
// 7. SETUP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================================");
  Serial.println("  SIH 2026: ESP32 Hall-Effect Telemetry Node Starting   ");
  Serial.println("  Waypoint Grid Controller: Option 1 Active             ");
  Serial.println("========================================================");
  Serial.print("Analog Pin (A0) : GPIO "); Serial.println(HALL_ANALOG_PIN);
  Serial.print("Digital Pin (D0): GPIO "); Serial.println(HALL_DIGITAL_PIN);
  Serial.print("BOOT Button     : GPIO "); Serial.println(BOOT_BUTTON_PIN);
  Serial.print("Onboard LED     : GPIO "); Serial.println(ONBOARD_LED_PIN);
  Serial.print("Target Backend  : "); Serial.println(BACKEND_URL);

  // Configure Status LED
  pinMode(ONBOARD_LED_PIN, OUTPUT);
  digitalWrite(ONBOARD_LED_PIN, LOW);

  // Configure BOOT Button with Internal Pull-up (Active LOW)
  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);

  // Configure ESP32 ADC on GPIO34 (12-bit, 0 - 3.3V)
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // Configure D0 Pin with Hardware Falling-Edge Interrupt
  pinMode(HALL_DIGITAL_PIN, INPUT);
  attachInterrupt(digitalPinToInterrupt(HALL_DIGITAL_PIN), onD0Pulse, FALLING);

  // Flash LED twice to confirm hardware initialization
  blinkLed(2, 100, 100);

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
    blinkLed(3, 80, 50);
  } else {
    Serial.println("\n[WARNING] Wi-Fi offline. Continuing in Standalone Serial Diagnostic Mode.");
  }

  Serial.println("\n================================================================================");
  Serial.println("HOW TO OPERATE THE SURVEY GRID:");
  Serial.println("  1. Place sensor on designated grid cell (Starting at Cell 0,0).");
  Serial.println("  2. SHORT PRESS BOOT BUTTON (<2s): Records waypoint, flashes LED, transmits to DB.");
  Serial.println("  3. LONG PRESS BOOT BUTTON  (>2s): Resets survey back to (0.0, 0.0).");
  Serial.println("================================================================================");
  Serial.printf("Current Position: Cell (0, 0) -> Target (X: 0.0, Y: 0.0) [READY]\n\n");
}


// ==============================================================================
// 8. MAIN LOOP
// ==============================================================================
void loop() {
  unsigned long now = millis();

  // --- Step 1: Read and reset pulse counter atomically ---
  noInterrupts();
  unsigned long pulses = pulse_counter;
  pulse_counter = 0;
  interrupts();

  // --- Step 2: Leaky Integrator / Peak Hold Filter ---
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

  // --- Step 5: BOOT Button Handling (Short press: Log Waypoint, Long press: Reset) ---
  bool button_pressed = (digitalRead(BOOT_BUTTON_PIN) == LOW); // LOW when pressed

  if (button_pressed && !last_button_state) {
    // Button just went down
    button_press_start = now;
    long_press_handled = false;
  } 
  else if (button_pressed && last_button_state) {
    // Button is being held down
    if (!long_press_handled && (now - button_press_start >= 2000)) {
      // Held for >= 2.0 seconds -> Trigger Reset!
      long_press_handled = true;
      resetSurveyCoordinates();
    }
  } 
  else if (!button_pressed && last_button_state) {
    // Button just released
    unsigned long press_duration = now - button_press_start;
    if (!long_press_handled && press_duration >= 50 && press_duration < 2000) {
      // Valid short press -> Trigger Waypoint Capture!
      captureAndTransmitWaypoint(effective_adc, classification);
    }
  }
  last_button_state = button_pressed;

  // --- Step 6: Live Diagnostic Serial Output (Every 300ms) ---
  if (now - last_serial_print_time >= SERIAL_PRINT_INTERVAL_MS) {
    last_serial_print_time = now;
    float current_x = current_col * STEP_SIZE;
    float current_y = current_row * STEP_SIZE;
    Serial.printf("[MONITOR] A0: %4d | D0: %2lu | Smooth: %4.1f | EFF_ADC: %4d | %-28s | Target: (%d,%d) @ (X:%.0f, Y:%.0f)\n",
      raw_adc, pulses, smoothed_chatter, effective_adc, classification.c_str(), current_col, current_row, current_x, current_y);
  }

  delay(CYCLE_DELAY_MS);
}
