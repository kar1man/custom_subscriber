#include <Arduino.h>
#include <WiFiS3.h>
#include <ArduinoHttpClient.h>

// =========================
// Hardware pins
// =========================
#define LED_YELLOW 4

// =========================
// Timing
// =========================
#define READ_INTERVAL_MS 5000UL
#define HTTP_RETRY_MS 5000UL
#define WIFI_CONNECT_TIMEOUT_MS 15000UL
#define TEMP_ALERT_THRESHOLD_C 30.0f

// =========================
// WiFi credentials
// =========================
const char* WIFI_SSID = "PLDTHOMEFIBRAdWa4";
const char* WIFI_PASS = "PasswordNiWifi!";

// =========================
// Custom Backend Server
// =========================
const char* BACKEND_SERVER = "localhost";      // Change to your backend IP (e.g., "192.168.1.100")
const uint16_t BACKEND_PORT = 3000;
const char* API_ENDPOINT = "/api/sensors/data";

// =========================
// Node identity
// =========================
const char* SENSOR_ID = "001";
const char* LOCATION_NAME = "Metro Manila Multi-Site Simulator";

WiFiClient wifiClient;
HttpClient httpClient = HttpClient(wifiClient, BACKEND_SERVER, BACKEND_PORT);

struct LocationProfile {
  const char* owner;
  const char* location;
  float baselineC;
  float minC;
  float maxC;
  float tempC;
  float driftDir;
};

LocationProfile locations[] = {
  {"axl", "Las Pinas", 30.8f, 29.8f, 33.9f, 30.8f, 0.06f},
  {"aljun", "Tondo II", 33.4f, 31.7f, 36.4f, 33.4f, 0.14f},
  {"lenard", "Tondo I", 31.5f, 30.4f, 35.0f, 31.5f, 0.10f},
  {"vandre", "Makati", 31.0f, 29.9f, 34.4f, 31.0f, 0.07f},
  {"cj", "Rizal", 30.6f, 29.6f, 34.0f, 30.6f, 0.08f},
};

const size_t LOCATION_COUNT = sizeof(locations) / sizeof(locations[0]);
const size_t TONDO_II_INDEX = 1;
const size_t TONDO_I_INDEX = 2;

unsigned long lastPublishAt = 0;

void clearStatusLeds() {
  digitalWrite(LED_YELLOW, LOW);
}

void ledSelfTest() {
  digitalWrite(LED_YELLOW, HIGH);
  delay(150);
  digitalWrite(LED_YELLOW, LOW);
  Serial.println("[CHECK] LED self-test OK");
}

bool connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  Serial.print("[WIFI] Connecting to: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long startAt = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - startAt > WIFI_CONNECT_TIMEOUT_MS) {
      Serial.println("[WIFI] Connection timeout (15s)");
      WiFi.disconnect();
      return false;
    }
    digitalWrite(LED_YELLOW, HIGH);
    delay(150);
    digitalWrite(LED_YELLOW, LOW);
    delay(350);
  }

  Serial.print("[WIFI] Connected! IP: ");
  Serial.println(WiFi.localIP());
  return true;
}

bool isBackendOnline() {
  wifiClient.setTimeout(2000);
  bool canConnect = wifiClient.connect(BACKEND_SERVER, BACKEND_PORT);
  if (canConnect) {
    wifiClient.stop();
    return true;
  }
  return false;
}

void simulateTemperatureCycle(LocationProfile& location, unsigned long elapsedMs) {
  // 30-second cycle: 15 rising, 15 falling
  unsigned long phaseMs = elapsedMs % 30000UL;
  float normalizedPhase = (float)phaseMs / 30000.0f;

  // Range: min to max
  float range = location.maxC - location.minC;

  if (phaseMs < 15000) {
    // Rising phase (0 to 0.5 of sine = 0 to 1)
    float risePhase = normalizedPhase * 2.0f;
    location.tempC = location.minC + (range * sin(risePhase * PI / 2.0f));
  } else {
    // Falling phase (0.5 to 1.0 of sine = 1 to 0)
    float fallPhase = (normalizedPhase - 0.5f) * 2.0f;
    location.tempC = location.maxC - (range * sin(fallPhase * PI / 2.0f));
  }
}

void publishSensorData() {
  if (!isBackendOnline()) {
    Serial.println("[HTTP] Backend is offline");
    return;
  }

  unsigned long elapsedMs = millis();

  // Simulate temperature for Tondo II (demo focus)
  simulateTemperatureCycle(locations[TONDO_II_INDEX], elapsedMs);

  LocationProfile& location = locations[TONDO_II_INDEX];

  // Build JSON payload
  String jsonData = "";
  jsonData += "{";
  jsonData += "\"sensor_id\":\"" + String(SENSOR_ID) + "\",";
  jsonData += "\"location\":\"" + String(location.location) + "\",";
  jsonData += "\"temperature\":" + String(location.tempC, 2) + ",";
  jsonData += "\"humidity\":65.0,";
  jsonData += "\"light_level\":850,";
  jsonData += "\"is_daytime\":true,";
  jsonData += "\"timestamp\":\"" + getCurrentISO8601() + "\"";
  jsonData += "}";

  Serial.print("[HTTP] Sending POST to ");
  Serial.println(API_ENDPOINT);
  Serial.println(jsonData);

  // Send HTTP POST request
  httpClient.beginRequest();
  httpClient.post(API_ENDPOINT);
  httpClient.sendHeader("Content-Type", "application/json");
  httpClient.sendHeader("Content-Length", jsonData.length());
  httpClient.endRequest();
  httpClient.write((uint8_t*)jsonData.c_str(), jsonData.length());

  // Read response
  int statusCode = httpClient.responseStatusCode();
  String response = httpClient.responseBody();

  if (statusCode == 200 || statusCode == 201) {
    Serial.print("[HTTP] Success (");
    Serial.print(statusCode);
    Serial.println(")");
    digitalWrite(LED_YELLOW, HIGH);
    delay(100);
    digitalWrite(LED_YELLOW, LOW);
  } else {
    Serial.print("[HTTP] Failed (");
    Serial.print(statusCode);
    Serial.print("): ");
    Serial.println(response);
  }
}

// Publish data for a specific location index (for staggered multi-node simulation)
void publishSensorDataForLocation(size_t locationIndex) {
  if (!isBackendOnline()) {
    return;
  }

  if (locationIndex >= LOCATION_COUNT) {
    return;
  }

  unsigned long elapsedMs = millis();

  // Simulate temperature for this location with phase offset for stagger
  unsigned long offsetElapsed = elapsedMs + (locationIndex * 1000UL);
  simulateTemperatureCycle(locations[locationIndex], offsetElapsed);

  LocationProfile& location = locations[locationIndex];

  // Build JSON payload
  String jsonData = "";
  jsonData += "{";
  jsonData += "\"sensor_id\":\"00" + String(locationIndex + 1) + "\",";
  jsonData += "\"location\":\"" + String(location.location) + "\",";
  jsonData += "\"temperature\":" + String(location.tempC, 2) + ",";
  jsonData += "\"humidity\":" + String(60 + random(10)) + ",";
  jsonData += "\"light_level\":" + String(800 + random(100)) + ",";
  jsonData += "\"is_daytime\":true,";
  jsonData += "\"timestamp\":\"" + getCurrentISO8601() + "\"";
  jsonData += "}";

  Serial.print("[HTTP] Node ");
  Serial.print(locationIndex + 1);
  Serial.print(" (");
  Serial.print(location.location);
  Serial.print(") → ");
  Serial.print(location.tempC, 1);
  Serial.println("°C");

  // Send HTTP POST request
  httpClient.beginRequest();
  httpClient.post(API_ENDPOINT);
  httpClient.sendHeader("Content-Type", "application/json");
  httpClient.sendHeader("Content-Length", jsonData.length());
  httpClient.endRequest();
  httpClient.write((uint8_t*)jsonData.c_str(), jsonData.length());

  // Read response
  int statusCode = httpClient.responseStatusCode();
  if (statusCode == 200 || statusCode == 201) {
    digitalWrite(LED_YELLOW, HIGH);
    delay(50);
    digitalWrite(LED_YELLOW, LOW);
  } else {
    Serial.print("[HTTP] Failed (");
    Serial.print(statusCode);
    Serial.println(")");
  }
}

String getCurrentISO8601() {
  // Simple ISO8601 timestamp (note: Arduino doesn't have built-in RTC in this sketch)
  // For production, use DS3231 RTC module
  unsigned long seconds = millis() / 1000;
  unsigned long minutes = seconds / 60;
  unsigned long hours = minutes / 60;
  unsigned long days = hours / 24;

  char buffer[30];
  snprintf(buffer, sizeof(buffer), "2026-05-05T%02lu:%02lu:%02luZ",
           hours % 24, minutes % 60, seconds % 60);
  return String(buffer);
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_YELLOW, OUTPUT);
  clearStatusLeds();

  delay(2000);
  Serial.println("\n\n================================================");
  Serial.println("Smart Farm - 5-Node Multi-Location Simulator");
  Serial.println("Staggered Publishing (1s offset per location)");
  Serial.println("================================================");

  ledSelfTest();

  Serial.println("[INIT] Starting WiFi connection...");
  connectWiFi();
}

void loop() {
  // Reconnect WiFi if needed
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Connection lost, reconnecting...");
    connectWiFi();
  }

  // Publish data from each location at different intervals (staggered)
  // Location 0 (Las Piñas): 0s offset
  // Location 1 (Tondo II): 1s offset
  // Location 2 (Tondo I): 2s offset
  // Location 3 (Makati): 3s offset
  // Location 4 (Rizal): 4s offset

  unsigned long now = millis();

  for (size_t i = 0; i < LOCATION_COUNT; i++) {
    unsigned long offset = i * 1000UL; // Stagger by 1 second each
    unsigned long baseInterval = READ_INTERVAL_MS * LOCATION_COUNT; // Total cycle: 25s for 5 nodes
    unsigned long nodeLastPub = (lastPublishAt / baseInterval) * baseInterval + offset;
    
    if (now >= nodeLastPub + READ_INTERVAL_MS) {
      publishSensorDataForLocation(i);
      lastPublishAt = now;
      break; // Publish one location per loop iteration
    }
  }

  delay(100);
}
