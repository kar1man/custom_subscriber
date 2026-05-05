// Quick test script to publish a sample message to configured MQTT broker
const mqtt = require('mqtt');
require('dotenv').config();

const broker = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const username = process.env.MQTT_USERNAME || null;
const password = process.env.MQTT_PASSWORD || null;

const options = {
  username: username || undefined,
  password: password || undefined,
  rejectUnauthorized: false,
};

console.log('[MQTT_TEST] Broker:', broker);
const client = mqtt.connect(broker, options);

client.on('connect', () => {
  console.log('[MQTT_TEST] Connected to broker');
  const topic = 'smartfarm/test/connection';
  const payload = JSON.stringify({ ts: new Date().toISOString(), ok: true });
  client.publish(topic, payload, { qos: 1 }, (err) => {
    if (err) console.error('[MQTT_TEST] Publish error:', err);
    else console.log('[MQTT_TEST] Published to', topic, payload);
    client.end();
  });
});

client.on('error', (err) => {
  console.error('[MQTT_TEST] Connection error:', err.message);
  client.end();
});
