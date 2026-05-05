/**
 * MQTT Publisher Module
 * Publishes sensor data to IoT MQTT Panel App
 * 
 * Topic Structure:
 * smartfarm/sensor/{sensor_id}/temperature
 * smartfarm/sensor/{sensor_id}/humidity
 * smartfarm/sensor/{sensor_id}/light_level
 * smartfarm/sensor/{sensor_id}/all (complete JSON)
 */

const mqtt = require('mqtt');

let mqttClient = null;

const MQTT_CONFIG = {
  broker: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  username: process.env.MQTT_USERNAME || null,
  password: process.env.MQTT_PASSWORD || null,
  clientId: 'smart-farm-backend-' + Math.random().toString(16).substr(2, 8),
  reconnectPeriod: 5000,
  connectTimeout: 10000,
};

/**
 * Initialize MQTT connection
 */
async function initMqttConnection() {
  return new Promise((resolve, reject) => {
    try {
      console.log('[MQTT] Initializing connection to:', MQTT_CONFIG.broker);

      mqttClient = mqtt.connect(MQTT_CONFIG.broker, MQTT_CONFIG);

      mqttClient.on('connect', () => {
        console.log('[MQTT] ✓ Connected to broker');
        resolve(true);
      });

      mqttClient.on('error', (err) => {
        console.error('[MQTT] Connection error:', err.message);
        // Don't reject, allow backend to work even if MQTT is down
        resolve(false);
      });

      mqttClient.on('disconnect', () => {
        console.log('[MQTT] Disconnected from broker');
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!mqttClient?.connected) {
          console.warn('[MQTT] Connection timeout - proceeding without MQTT');
          resolve(false);
        }
      }, 10000);
    } catch (err) {
      console.error('[MQTT] Init failed:', err);
      resolve(false);
    }
  });
}

/**
 * Publish individual sensor metric
 */
function publishMetric(sensor_id, metric_name, value) {
  if (!mqttClient?.connected) {
    return false;
  }

  const topic = `smartfarm/sensor/${sensor_id}/${metric_name}`;
  mqttClient.publish(topic, String(value), { qos: 1 }, (err) => {
    if (err) {
      console.error(`[MQTT] Publish failed for ${topic}:`, err);
    } else {
      console.log(`[MQTT] Published ${topic} = ${value}`);
    }
  });
  return true;
}

/**
 * Publish complete sensor data as JSON
 */
function publishSensorData(sensorData) {
  if (!mqttClient?.connected) {
    return false;
  }

  const { sensor_id, temperature, humidity, light_level, location, timestamp } = sensorData;

  // Publish individual metrics
  publishMetric(sensor_id, 'temperature', temperature);
  publishMetric(sensor_id, 'humidity', humidity);
  publishMetric(sensor_id, 'light_level', light_level);

  // Publish complete JSON
  const topic = `smartfarm/sensor/${sensor_id}/all`;
  const payload = JSON.stringify({
    sensor_id,
    location,
    temperature,
    humidity,
    light_level,
    timestamp,
  });

  mqttClient.publish(topic, payload, { qos: 1 }, (err) => {
    if (err) {
      console.error(`[MQTT] Publish failed for ${topic}:`, err);
    } else {
      console.log(`[MQTT] Published complete data for sensor ${sensor_id}`);
    }
  });

  return true;
}

/**
 * Subscribe to topic (for future two-way communication)
 */
function subscribe(topic) {
  if (!mqttClient?.connected) {
    console.warn(`[MQTT] Not connected, cannot subscribe to ${topic}`);
    return false;
  }

  mqttClient.subscribe(topic, (err) => {
    if (err) {
      console.error(`[MQTT] Subscribe failed for ${topic}:`, err);
    } else {
      console.log(`[MQTT] Subscribed to ${topic}`);
    }
  });
  return true;
}

/**
 * Set up message handler (for incoming MQTT messages)
 */
function onMessage(callback) {
  if (!mqttClient) {
    return;
  }
  mqttClient.on('message', callback);
}

/**
 * Disconnect from MQTT broker
 */
async function disconnect() {
  return new Promise((resolve) => {
    if (!mqttClient) {
      resolve();
      return;
    }

    mqttClient.end(true, () => {
      console.log('[MQTT] Disconnected');
      mqttClient = null;
      resolve();
    });
  });
}

/**
 * Get connection status
 */
function isConnected() {
  return mqttClient?.connected || false;
}

module.exports = {
  initMqttConnection,
  publishSensorData,
  publishMetric,
  subscribe,
  onMessage,
  disconnect,
  isConnected,
};
