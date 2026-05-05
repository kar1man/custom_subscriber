(function(){
  const userInput = document.getElementById('username');
  const passInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const connectBtn = document.getElementById('connect');
  const disconnectBtn = document.getElementById('disconnect');
  const status = document.getElementById('status');

  // Adafruit IO secure WebSocket endpoint for browser clients
  const ADAFRUIT_BROKER = 'wss://io.adafruit.com/mqtt';

  // 5 nodes configuration
  const NODES = [
    { id: '001', location: 'Las Piñas', feed: 'smartfarm-temp-las-pinas' },
    { id: '002', location: 'Tondo II', feed: 'smartfarm-temp-tondo-ii' },
    { id: '003', location: 'Tondo I', feed: 'smartfarm-temp-tondo-i' },
    { id: '004', location: 'Makati', feed: 'smartfarm-temp-makati' },
    { id: '005', location: 'Rizal', feed: 'smartfarm-temp-rizal' }
  ];

  let client = null;

  function setStatus(text, ok){
    status.textContent = text;
    status.className = ok ? 'status ok' : 'status';
  }

  function updateNodeDisplay(nodeId, value){
    const card = document.getElementById('node-' + nodeId);
    if(!card) return;
    const valueEl = card.querySelector('.sensor-value');
    const updateEl = card.querySelector('.last-update');
    if(valueEl) valueEl.textContent = value + '°C';
    if(updateEl) updateEl.textContent = 'Updated: ' + new Date().toLocaleTimeString();
    card.classList.add('active');
  }

  if(togglePasswordBtn && passInput){
    togglePasswordBtn.addEventListener('click', () => {
      const showing = passInput.type === 'text';
      passInput.type = showing ? 'password' : 'text';
      togglePasswordBtn.textContent = showing ? 'Show' : 'Hide';
      togglePasswordBtn.setAttribute('aria-pressed', String(!showing));
      togglePasswordBtn.setAttribute('aria-label', showing ? 'Show API key' : 'Hide API key');
    });
  }

  connectBtn.addEventListener('click', () => {
    const username = userInput.value.trim();
    const password = passInput.value.trim();

    if(!username){ alert('Enter Adafruit IO username'); return; }
    if(!password){ alert('Enter Adafruit IO API key'); return; }

    const options = {
      username: username,
      password: password,
      reconnectPeriod: 3000,
      clientId: 'web-dashboard-' + Math.random().toString(16).substr(2, 8)
    };

    setStatus('Connecting to Adafruit IO...', false);
    try {
      client = mqtt.connect(ADAFRUIT_BROKER, options);
    } catch(e){
      setStatus('Connection failed', false);
      console.error('Connection error:', e.message);
      return;
    }

    client.on('connect', () => {
      setStatus('Connected — Subscribing to 5 feeds...', true);
      connectBtn.disabled = true;
      disconnectBtn.disabled = false;

      // Subscribe to all 5 feeds
      NODES.forEach((node, idx) => {
        const topic = username + '/feeds/' + node.feed;
        setTimeout(() => {
          client.subscribe(topic, { qos: 1 }, (err) => {
            if(err) console.error('Subscribe failed for', node.location, ':', err);
            else console.log('Subscribed to', node.location);
          });
        }, idx * 500); // Stagger subscriptions
      });

      setTimeout(() => {
        setStatus('Connected • Monitoring 5 locations', true);
      }, 3000);
    });

    client.on('reconnect', () => setStatus('Reconnecting...', false));

    client.on('close', () => {
      setStatus('Disconnected', false);
      connectBtn.disabled = false;
      disconnectBtn.disabled = true;
      // Clear all node displays
      NODES.forEach(node => {
        const card = document.getElementById('node-' + node.id);
        if(card){
          card.classList.remove('active');
          card.querySelector('.sensor-value').textContent = '—';
          card.querySelector('.last-update').textContent = 'Never';
        }
      });
    });

    client.on('error', (err) => {
      const reason = (err && err.message) ? err.message : 'Unknown error';
      setStatus('Connection error: ' + reason, false);
      console.error('MQTT error:', err);
    });

    client.on('message', (topic, payload) => {
      const value = payload.toString();
      // Extract location from topic to find matching node
      NODES.forEach(node => {
        if(topic.includes(node.feed)){
          updateNodeDisplay(node.id, parseFloat(value).toFixed(2));
        }
      });
    });
  });

  disconnectBtn.addEventListener('click', () => {
    if(client){
      client.end(true);
      client = null;
      setStatus('Disconnected', false);
      connectBtn.disabled = false;
      disconnectBtn.disabled = true;
    }
  });
})();
