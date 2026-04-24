#include <Arduino.h>
#include <WiFiS3.h>
#include <DHT.h>
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

// Adjust after calibrating your environment.
#define LIGHT_THRESHOLD 260

// =========================
// Timing
// =========================
#define READ_INTERVAL_MS 5000UL
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
const char* IO_KEY = "IO KEY HERE";

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
const char* DIAG_TOPIC = "accerina/feeds/smartfarm-diagnostics";

WiFiClient wifiClient;
Adafruit_MQTT_Client mqtt(&wifiClient, AIO_SERVER, AIO_SERVERPORT, IO_USERNAME, IO_KEY);

Adafruit_MQTT_Publish temperatureFeed(&mqtt, TEMP_TOPIC);
Adafruit_MQTT_Publish humidityFeed(&mqtt, HUMIDITY_TOPIC);
Adafruit_MQTT_Publish statusFeed(&mqtt, STATUS_TOPIC);
Adafruit_MQTT_Publish diagnosticsFeed(&mqtt, DIAG_TOPIC);

DHT dht(DHTPIN, DHTTYPE);

unsigned long lastPublishAt = 0;

void clearStatusLeds() {
  digitalWrite(LED_YELLOW, LOW);
  digitalWrite(LED_BLUE, LOW);
}

void ledSelfTest() {
  Serial.println("[CHECK] LED self-test started");

  clearStatusLeds();
  digitalWrite(LED_YELLOW, HIGH);
  delay(300);
  digitalWrite(LED_YELLOW, LOW);

  digitalWrite(LED_BLUE, HIGH);
  delay(300);
  digitalWrite(LED_BLUE, LOW);

  Serial.println("[CHECK] LED self-test completed");
}

bool connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  Serial.print("[WIFI] Connecting to: ");
  Serial.println(WIFI_SSID);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - startAttempt) < WIFI_CONNECT_TIMEOUT_MS) {
    WiFi.begin(WIFI_SSID, WIFI_PASS);

    unsigned long waitStart = millis();
    while (WiFi.status() != WL_CONNECTED && (millis() - waitStart) < 3000UL) {
      delay(200);
      Serial.print('.');
    }
    Serial.println();
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[WIFI] Connected");
    Serial.print("[WIFI] IP: ");
    Serial.println(WiFi.localIP());
    return true;
  }

  Serial.println("[WIFI] Connection failed");
  return false;
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

const char* getStatusLabel(bool isDaytime) {
  return isDaytime ? "DAY" : "NIGHT";
}

bool readDhtWithRetry(float &temperature, float &humidity) {
  const uint8_t maxTries = 3;

  for (uint8_t i = 0; i < maxTries; i++) {
    humidity = dht.readHumidity();
    temperature = dht.readTemperature();

    if (!isnan(temperature) && !isnan(humidity)) {
      return true;
    }

    Serial.print("[DHT] Read failed, retry ");
    Serial.println(i + 1);
    delay(1000);
  }

  return false;
}

bool validateDhtValues(float temperature, float humidity) {
  bool tempOk = (temperature >= -10.0f && temperature <= 60.0f);
  bool humidityOk = (humidity >= 0.0f && humidity <= 100.0f);

  if (!tempOk) {
    Serial.print("[DHT] Invalid temperature: ");
    Serial.println(temperature);
  }

  if (!humidityOk) {
    Serial.print("[DHT] Invalid humidity: ");
    Serial.println(humidity);
  }

  return tempOk && humidityOk;
}

bool validateLdrValue(int lightLevel) {
  bool inRange = (lightLevel >= 0 && lightLevel <= 1023);

  if (!inRange) {
    Serial.print("[LDR] Out of range: ");
    Serial.println(lightLevel);
    return false;
  }

  // 0 or 1023 continuously often indicates wiring issues or hard short/open in simple divider setups.
  if (lightLevel <= 1 || lightLevel >= 1022) {
    Serial.print("[LDR] Edge value (check wiring/calibration): ");
    Serial.println(lightLevel);
  }

  return true;
}

void applyStatusLeds(bool isDaytime) {
  clearStatusLeds();

  if (isDaytime) {
    digitalWrite(LED_YELLOW, HIGH);
  } else {
    digitalWrite(LED_BLUE, HIGH);
  }
}

bool publishDiagnostics(const char* message) {
  if (!mqtt.connected() && !connectMQTT()) {
    return false;
  }

  bool ok = diagnosticsFeed.publish(message);
  Serial.print("[DIAG] Publish: ");
  Serial.println(ok ? "OK" : "FAIL");
  return ok;
}

bool runStartupChecks() {
  Serial.println("=========================================");
  Serial.println("[CHECK] Running startup validation");

  ledSelfTest();

  int ldr = analogRead(LDRPIN);
  bool ldrOk = validateLdrValue(ldr);
  Serial.print("[CHECK] LDR initial read: ");
  Serial.println(ldr);

  float temp = 0.0f;
  float hum = 0.0f;
  bool dhtReadOk = readDhtWithRetry(temp, hum);
  bool dhtValueOk = dhtReadOk && validateDhtValues(temp, hum);

  if (dhtReadOk) {
    Serial.print("[CHECK] DHT temp: ");
    Serial.println(temp, 2);
    Serial.print("[CHECK] DHT humidity: ");
    Serial.println(hum, 2);
  } else {
    Serial.println("[CHECK] DHT read failed");
  }

  bool wifiOk = connectWiFi();
  bool mqttOk = wifiOk && connectMQTT();

  bool allOk = ldrOk && dhtValueOk && wifiOk && mqttOk;

  if (allOk) {
    Serial.println("[CHECK] All startup checks PASSED");
    publishDiagnostics("BOOT_OK");
  } else {
    Serial.println("[CHECK] Startup checks FAILED");
    publishDiagnostics("BOOT_FAIL");
  }

  Serial.println("=========================================");
  return allOk;
}

bool publishSensorData(float temperature, float humidity, int lightLevel, bool isDaytime) {
  if (!connectWiFi()) {
    return false;
  }

  if (!connectMQTT()) {
    return false;
  }

  char temperatureText[16];
  char humidityText[16];
  dtostrf(temperature, 0, 2, temperatureText);
  dtostrf(humidity, 0, 2, humidityText);

  bool tempOk = temperatureFeed.publish(temperatureText);
  bool humidityOk = humidityFeed.publish(humidityText);
  bool statusOk = statusFeed.publish(getStatusLabel(isDaytime));

  Serial.print("[PUB] Temp: ");
  Serial.println(tempOk ? "OK" : "FAIL");
  Serial.print("[PUB] Humidity: ");
  Serial.println(humidityOk ? "OK" : "FAIL");
  Serial.print("[PUB] Status: ");
  Serial.println(statusOk ? "OK" : "FAIL");

  if (!(tempOk && humidityOk && statusOk)) {
    publishDiagnostics("PUBLISH_FAIL");
  }

  Serial.print("[DATA] Sensor ID: ");
  Serial.println(SENSOR_ID);
  Serial.print("[DATA] Location : ");
  Serial.println(LOCATION_NAME);
  Serial.print("[DATA] Temp C   : ");
  Serial.println(temperatureText);
  Serial.print("[DATA] Humidity : ");
  Serial.println(humidityText);
  Serial.print("[DATA] Light    : ");
  Serial.println(lightLevel);
  Serial.print("[DATA] Status   : ");
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
  pinMode(LDRPIN, INPUT);

  clearStatusLeds();
  dht.begin();

  Serial.println("=========================================");
  Serial.println("  Smart Farm MQTT Node (Validated)");
  Serial.print("  Sensor ID: ");
  Serial.println(SENSOR_ID);
  Serial.print("  Location : ");
  Serial.println(LOCATION_NAME);
  Serial.println("=========================================");

  runStartupChecks();
}

void loop() {
  connectWiFi();
  connectMQTT();
  mqtt.processPackets(1000);

  unsigned long now = millis();
  if (now - lastPublishAt < READ_INTERVAL_MS) {
    return;
  }
  lastPublishAt = now;

  float temperature = 0.0f;
  float humidity = 0.0f;
  int lightLevel = analogRead(LDRPIN);

  bool dhtReadOk = readDhtWithRetry(temperature, humidity);
  bool dhtValueOk = dhtReadOk && validateDhtValues(temperature, humidity);
  bool ldrOk = validateLdrValue(lightLevel);

  Serial.println("-----------------------------------------");

  if (!dhtReadOk) {
    Serial.println("[LOOP] DHT read failed; skipping publish");
    publishDiagnostics("DHT_READ_FAIL");
    Serial.println("-----------------------------------------");
    return;
  }

  if (!dhtValueOk) {
    Serial.println("[LOOP] DHT value validation failed; skipping publish");
    publishDiagnostics("DHT_VALUE_FAIL");
    Serial.println("-----------------------------------------");
    return;
  }

  if (!ldrOk) {
    Serial.println("[LOOP] LDR validation failed; skipping publish");
    publishDiagnostics("LDR_VALUE_FAIL");
    Serial.println("-----------------------------------------");
    return;
  }

  bool isDaytime = lightLevel > LIGHT_THRESHOLD;
  applyStatusLeds(isDaytime);

  Serial.print("[LOOP] Temperature: ");
  Serial.println(temperature, 2);
  Serial.print("[LOOP] Humidity   : ");
  Serial.println(humidity, 2);
  Serial.print("[LOOP] Light level: ");
  Serial.println(lightLevel);
  Serial.print("[LOOP] Status     : ");
  Serial.println(getStatusLabel(isDaytime));

  bool publishOk = publishSensorData(temperature, humidity, lightLevel, isDaytime);
  if (!publishOk) {
    Serial.println("[LOOP] Publish failed");
  }

  Serial.println("-----------------------------------------");
}
