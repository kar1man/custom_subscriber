#include <Arduino.h>
#include <WiFiS3.h>
#include <math.h>
#include "Adafruit_MQTT.h"
#include "Adafruit_MQTT_Client.h"

// =========================
// Hardware pins
// =========================
#define LED_YELLOW 4

// =========================
// Timing
// =========================
#define NODE_INTERVAL_MS 5000UL
#define STAGGER_MS 1000UL
#define MQTT_RETRY_MS 5000UL
#define WIFI_CONNECT_TIMEOUT_MS 15000UL

// =========================
// WiFi credentials
// =========================
const char* WIFI_SSID = "StarLink_2.4GHz_Py2X";
const char* WIFI_PASS = "WifiNiJoessie!";

// =========================
// Adafruit IO credentials
// =========================
const char* IO_USERNAME = "accerina";
const char* IO_KEY = "YOUR_ADAFRUIT_IO_KEY_HERE";

// =========================
// Node identity
// =========================
const char* SENSOR_ID = "001";
const char* LOCATION_NAME = "Metro Manila Multi-Site Simulator";

// =========================
// Adafruit IO MQTT endpoint
// =========================
const char* AIO_SERVER = "io.adafruit.com";
const uint16_t AIO_SERVERPORT = 1883;

const char* FEED_TEMP_LAS_PINAS = "accerina/feeds/smartfarm-temp-las-pinas";
const char* FEED_TEMP_TONDO_II = "accerina/feeds/smartfarm-temp-tondo-ii";
const char* FEED_TEMP_TONDO_I = "accerina/feeds/smartfarm-temp-tondo-i";
const char* FEED_TEMP_MAKATI = "accerina/feeds/smartfarm-temp-makati";
const char* FEED_TEMP_RIZAL = "accerina/feeds/smartfarm-temp-rizal";

WiFiClient wifiClient;
Adafruit_MQTT_Client mqtt(&wifiClient, AIO_SERVER, AIO_SERVERPORT, IO_USERNAME, IO_KEY);

Adafruit_MQTT_Publish feedLasPinas(&mqtt, FEED_TEMP_LAS_PINAS);
Adafruit_MQTT_Publish feedTondoII(&mqtt, FEED_TEMP_TONDO_II);
Adafruit_MQTT_Publish feedTondoI(&mqtt, FEED_TEMP_TONDO_I);
Adafruit_MQTT_Publish feedMakati(&mqtt, FEED_TEMP_MAKATI);
Adafruit_MQTT_Publish feedRizal(&mqtt, FEED_TEMP_RIZAL);

struct LocationProfile {
  const char* owner;
  const char* location;
  float baselineC;
  float minC;
  float maxC;
  float tempC;
  float driftDir;
  Adafruit_MQTT_Publish* feed;
};

LocationProfile locations[] = {
  {"axl", "Las Pinas", 30.8f, 29.8f, 33.9f, 30.8f, 0.06f, &feedLasPinas},
  {"aljun", "Tondo II", 33.4f, 31.7f, 36.4f, 33.4f, 0.14f, &feedTondoII},
  {"lenard", "Tondo I", 31.5f, 30.4f, 35.0f, 31.5f, 0.10f, &feedTondoI},
  {"vandre", "Makati", 31.0f, 29.9f, 34.4f, 31.0f, 0.07f, &feedMakati},
  {"cj", "Rizal", 30.6f, 29.6f, 34.0f, 30.6f, 0.08f, &feedRizal},
};

const size_t LOCATION_COUNT = sizeof(locations) / sizeof(locations[0]);
unsigned long nextPublishAt[LOCATION_COUNT];

void clearStatusLeds() {
  digitalWrite(LED_YELLOW, LOW);
}

bool connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  Serial.print("[WIFI] Connecting to: ");
  Serial.println(WIFI_SSID);

  unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED) {
    WiFi.begin(WIFI_SSID, WIFI_PASS);

    unsigned long tryStart = millis();
    while (WiFi.status() != WL_CONNECTED && (millis() - tryStart) < 3000UL) {
      delay(200);
      Serial.print('.');
    }
    Serial.println();

    if (millis() - startedAt > WIFI_CONNECT_TIMEOUT_MS) {
      Serial.println("[WIFI] Timeout");
      return false;
    }
  }

  Serial.print("[WIFI] Connected. IP: ");
  Serial.println(WiFi.localIP());
  return true;
}

bool connectMQTT() {
  if (mqtt.connected()) {
    return true;
  }

  Serial.println("[MQTT] Connecting...");

  int8_t ret;
  uint8_t retries = 3;

  while ((ret = mqtt.connect()) != 0) {
    Serial.print("[MQTT] Failed: ");
    Serial.println(mqtt.connectErrorString(ret));
    mqtt.disconnect();

    if (--retries == 0) {
      Serial.println("[MQTT] No retries left");
      return false;
    }

    delay(MQTT_RETRY_MS);
  }

  Serial.println("[MQTT] Connected");
  return true;
}

float clampf(float value, float minValue, float maxValue) {
  if (value < minValue) {
    return minValue;
  }
  if (value > maxValue) {
    return maxValue;
  }
  return value;
}

void generateLocationTemperature(LocationProfile &profile) {
  float randomJitter = ((float)random(-15, 16)) * 0.03f;
  float driftJitter = ((float)random(-2, 3)) * 0.01f;

  profile.tempC += profile.driftDir + randomJitter;
  profile.driftDir += driftJitter;
  profile.driftDir = clampf(profile.driftDir, -0.20f, 0.20f);

  if (profile.tempC <= profile.minC + 0.25f) {
    profile.driftDir = fabs(profile.driftDir);
  } else if (profile.tempC >= profile.maxC - 0.25f) {
    profile.driftDir = -fabs(profile.driftDir);
  }

  float reboundToBaseline = (profile.baselineC - profile.tempC) * 0.04f;
  profile.tempC += reboundToBaseline;
  profile.tempC = clampf(profile.tempC, profile.minC, profile.maxC);
}

bool publishOneLocation(size_t index) {
  if (index >= LOCATION_COUNT) {
    return false;
  }

  if (!connectWiFi() || !connectMQTT()) {
    return false;
  }

  generateLocationTemperature(locations[index]);

  char temperatureText[16];
  dtostrf(locations[index].tempC, 0, 2, temperatureText);
  bool ok = locations[index].feed->publish(temperatureText);

  Serial.print("[PUB] ");
  Serial.print(index + 1);
  Serial.print(" | ");
  Serial.print(locations[index].location);
  Serial.print(" | Temp C: ");
  Serial.print(temperatureText);
  Serial.print(" | Feed: ");
  Serial.println(ok ? "OK" : "FAIL");

  digitalWrite(LED_YELLOW, ok ? HIGH : LOW);
  delay(50);
  digitalWrite(LED_YELLOW, LOW);

  return ok;
}

void setup() {
  Serial.begin(115200);
  while (!Serial) {
    delay(10);
  }

  pinMode(LED_YELLOW, OUTPUT);
  clearStatusLeds();

  randomSeed((unsigned long)(micros() ^ analogRead(A0) ^ analogRead(A1)));

  Serial.println("=========================================");
  Serial.println(" Smart Farm - 5 Node Staggered Publisher");
  Serial.print(" Sensor ID: ");
  Serial.println(SENSOR_ID);
  Serial.print(" Location : ");
  Serial.println(LOCATION_NAME);
  Serial.println("=========================================");

  Serial.println("[FEEDS] smartfarm-temp-las-pinas");
  Serial.println("[FEEDS] smartfarm-temp-tondo-ii");
  Serial.println("[FEEDS] smartfarm-temp-tondo-i");
  Serial.println("[FEEDS] smartfarm-temp-makati");
  Serial.println("[FEEDS] smartfarm-temp-rizal");

  connectWiFi();
  connectMQTT();

  unsigned long now = millis();
  for (size_t i = 0; i < LOCATION_COUNT; i++) {
    nextPublishAt[i] = now + (i * STAGGER_MS);
  }
}

void loop() {
  connectWiFi();
  connectMQTT();
  mqtt.processPackets(1000);

  unsigned long now = millis();
  for (size_t i = 0; i < LOCATION_COUNT; i++) {
    if (now >= nextPublishAt[i]) {
      publishOneLocation(i);
      nextPublishAt[i] = now + NODE_INTERVAL_MS;
    }
  }
}
