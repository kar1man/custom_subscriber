#include <Arduino.h>
#include <WiFiS3.h>
#include <math.h>
#include "Adafruit_MQTT.h"
#include "Adafruit_MQTT_Client.h"

// =========================
// Hardware pins
// =========================
#define DHTPIN 2
#define DHTTYPE DHT11
#define LDRPIN A0
#define LED_YELLOW 4
#define LED_BLUE 5

// Adjust after testing your room/farm lighting.
#define LIGHT_THRESHOLD 260

// LED actuator thresholds for simulated sensor values.
#define TEMP_THRESHOLD_C 28.0
#define HUMIDITY_THRESHOLD_PCT 65.0

// =========================
// Timing
// =========================
#define READ_INTERVAL_MS 10000
#define MQTT_RETRY_MS 5000

// =========================
// WiFi placeholders
// Replace these with each teammate's local network values later.
// =========================
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// =========================
// Adafruit IO placeholders
// Paste your Adafruit username and active key here.
// =========================
const char* IO_USERNAME = "accerina";
const char* IO_KEY = "PASTE_YOUR_ADAFRUIT_ACTIVE_KEY_HERE";

// =========================
// Node identity
// =========================
const char* SENSOR_ID = "001";
const char* LOCATION_NAME = "North_Field";

// =========================
// Adafruit IO MQTT endpoint
// =========================
const char* AIO_SERVER = "io.adafruit.com";
const uint16_t AIO_SERVERPORT = 1883;

const char* TEMP_TOPIC = "accerina/feeds/smartfarm-temperature";
const char* HUMIDITY_TOPIC = "accerina/feeds/smartfarm-humidity";
const char* STATUS_TOPIC = "accerina/feeds/smartfarm-status";

WiFiClient wifiClient;
Adafruit_MQTT_Client mqtt(&wifiClient, AIO_SERVER, AIO_SERVERPORT, IO_USERNAME, IO_KEY);

Adafruit_MQTT_Publish temperatureFeed(&mqtt, TEMP_TOPIC);
Adafruit_MQTT_Publish humidityFeed(&mqtt, HUMIDITY_TOPIC);
Adafruit_MQTT_Publish statusFeed(&mqtt, STATUS_TOPIC);

// DHT dht(DHTPIN, DHTTYPE);  // Commented out - using simulated data instead

unsigned long lastPublishAt = 0;

// ========================
// Simulation parameters
// ========================
unsigned long simulationStartTime = 0;
const float tempSwing = 2.0;         // Threshold ±2C to force ON/OFF checks.
const float humiditySwing = 6.0;     // Threshold ±6% to force ON/OFF checks.
const float simulationPeriodMs = 40000.0;  // Full up/down cycle every 40 seconds.

void clearIndicatorLeds() {
  digitalWrite(LED_YELLOW, LOW);
  digitalWrite(LED_BLUE, LOW);
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  while (WiFi.status() != WL_CONNECTED) {
    WiFi.begin(WIFI_SSID, WIFI_PASS);

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
      delay(250);
      Serial.print('.');
    }

    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
      break;
    }

    Serial.println("WiFi retrying...");
    delay(1000);
  }

  Serial.println("WiFi connected.");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void MQTT_connect() {
  if (mqtt.connected()) {
    return;
  }

  int8_t ret;
  uint8_t retries = 3;

  while ((ret = mqtt.connect()) != 0) {
    Serial.print("MQTT connection failed: ");
    Serial.println(mqtt.connectErrorString(ret));

    mqtt.disconnect();
    delay(MQTT_RETRY_MS);

    if (--retries == 0) {
      Serial.println("MQTT giving up for now.");
      return;
    }
  }

  Serial.println("MQTT connected.");
}

const char* getStatusLabel(bool isDaytime) {
  return isDaytime ? "DAY" : "NIGHT";
}

// ========================
// Simulated sensor data
// ========================
void getSimulatedSensorData(float &temperature, float &humidity, int &lightLevel) {
  unsigned long elapsed = millis() - simulationStartTime;

  // Force simulated values to cross actuator thresholds repeatedly for easier validation.
  float phase = ((elapsed % (unsigned long)simulationPeriodMs) * 2.0 * PI) / simulationPeriodMs;

  temperature = TEMP_THRESHOLD_C + (tempSwing * sin(phase));
  temperature += random(-15, 15) / 100.0;  // Small jitter for realistic readings.

  humidity = HUMIDITY_THRESHOLD_PCT + (humiditySwing * sin(phase + PI));
  humidity += random(-20, 20) / 100.0;

  if (humidity < 0.0) {
    humidity = 0.0;
  }
  if (humidity > 100.0) {
    humidity = 100.0;
  }

  // Keep status feed cycling by tying light level to simulation phase.
  bool isDaySimulation = sin(phase) > 0;
  lightLevel = isDaySimulation ? (900 + random(0, 100)) : (50 + random(0, 50));
}

void applyTemperatureHumidityLeds(float temperature, float humidity) {
  clearIndicatorLeds();

  if (temperature >= TEMP_THRESHOLD_C) {
    digitalWrite(LED_YELLOW, HIGH);
  } else {
    digitalWrite(LED_YELLOW, LOW);
  }

  if (humidity >= HUMIDITY_THRESHOLD_PCT) {
    digitalWrite(LED_BLUE, HIGH);
  } else {
    digitalWrite(LED_BLUE, LOW);
  }
}

bool publishSensorData(float temperature, float humidity, int lightLevel, bool isDaytime) {
  if (!mqtt.connected()) {
    MQTT_connect();
  }

  if (!mqtt.connected()) {
    return false;
  }

  String temperatureText = String(temperature, 2);
  String humidityText = String(humidity, 2);

  bool tempOk = temperatureFeed.publish(temperatureText.c_str());
  bool humidityOk = humidityFeed.publish(humidityText.c_str());
  bool statusOk = statusFeed.publish(getStatusLabel(isDaytime));

  Serial.print("Publish temp: ");
  Serial.println(tempOk ? "OK" : "FAIL");
  Serial.print("Publish humidity: ");
  Serial.println(humidityOk ? "OK" : "FAIL");
  Serial.print("Publish status: ");
  Serial.println(statusOk ? "OK" : "FAIL");

  Serial.print("Sensor ID: ");
  Serial.println(SENSOR_ID);
  Serial.print("Location: ");
  Serial.println(LOCATION_NAME);
  Serial.print("Temp: ");
  Serial.println(temperatureText);
  Serial.print("Humidity: ");
  Serial.println(humidityText);
  Serial.print("Light: ");
  Serial.println(lightLevel);
  Serial.print("Status: ");
  Serial.println(getStatusLabel(isDaytime));

  return tempOk && humidityOk && statusOk;
}

void setup() {
  Serial.begin(115200);
  while (!Serial) {
    delay(10);
  }

  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_BLUE, OUTPUT);
  clearIndicatorLeds();

  // Initialize simulation timer
  simulationStartTime = millis();

  Serial.println("=========================================");
  Serial.println("  Smart Farm MQTT Node");
  Serial.print("  Sensor ID: ");
  Serial.println(SENSOR_ID);
  Serial.print("  Location : ");
  Serial.println(LOCATION_NAME);
  Serial.println("  MODE: SIMULATED DATA (Philippines temp)");
  Serial.print("  Temp LED threshold : ");
  Serial.println(TEMP_THRESHOLD_C);
  Serial.print("  Humidity threshold : ");
  Serial.println(HUMIDITY_THRESHOLD_PCT);
  Serial.println("=========================================");

  connectWiFi();
  MQTT_connect();
}

void loop() {
  connectWiFi();
  MQTT_connect();
  mqtt.processPackets(1000);

  unsigned long now = millis();
  if (now - lastPublishAt < READ_INTERVAL_MS) {
    return;
  }
  lastPublishAt = now;

  // Get simulated sensor data
  float temperature = 0;
  float humidity = 0;
  int lightLevel = 0;
  getSimulatedSensorData(temperature, humidity, lightLevel);

  Serial.println("-----------------------------------------");
  Serial.println("[SIMULATED DATA - Threshold Crossing Test]");
  Serial.print("Light level: ");
  Serial.println(lightLevel);

  bool isDaytime = lightLevel > LIGHT_THRESHOLD;
  applyTemperatureHumidityLeds(temperature, humidity);

  Serial.print("Temperature: ");
  Serial.println(temperature, 2);
  Serial.print("Humidity: ");
  Serial.println(humidity, 2);
  Serial.print("Temp LED (YELLOW pin 4): ");
  Serial.println(temperature >= TEMP_THRESHOLD_C ? "ON" : "OFF");
  Serial.print("Humidity LED (BLUE pin 5): ");
  Serial.println(humidity >= HUMIDITY_THRESHOLD_PCT ? "ON" : "OFF");
  Serial.print("Status: ");
  Serial.println(getStatusLabel(isDaytime));

  publishSensorData(temperature, humidity, lightLevel, isDaytime);
  Serial.println("-----------------------------------------");
}