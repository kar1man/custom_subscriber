# Remote Broker (HiveMQ Cloud) Quick Steps

1. Create HiveMQ Cloud account: https://www.hivemq.com/cloud/
2. Create a free cluster; note the host and ports (TLS: 8883, non-TLS: 1883). HiveMQ provides a WebSocket TLS endpoint too (wss).
3. Add an MQTT user and password for your cluster (or use the generated credentials).
4. Update your backend `.env` with:

```
MQTT_BROKER_URL=mqtts://<cluster-host>:8883
MQTT_USERNAME=<user>
MQTT_PASSWORD=<password>
```

5. Deploy backend to a public host (Render, Railway) or run locally for testing.
6. In IoT MQTT Panel (remote device), add new connection:
   - Host: `<cluster-host>`
   - Port: `8883`
   - TLS: enabled
   - Username/password: as configured
   - Client ID: any unique string
7. Optional: In your frontend (GitHub Pages), use MQTT over WebSocket (wss) to subscribe directly from the browser.

---

## Frontend WebSocket snippet (example)

Use the MQTT.js browser bundle via CDN in your `index.html`:

```html
<script src="https://unpkg.com/mqtt/dist/mqtt.min.js"></script>
<script>
  const client = mqtt.connect('wss://<cluster-host>:8883/mqtt', {
    username: '<user>',
    password: '<password>',
    rejectUnauthorized: false
  });

  client.on('connect', () => {
    console.log('Connected to HiveMQ via WebSocket');
    client.subscribe('smartfarm/sensor/+/all', { qos: 1 });
  });

  client.on('message', (topic, message) => {
    console.log('MQTT', topic, message.toString());
    // update UI accordingly
  });
</script>
```
