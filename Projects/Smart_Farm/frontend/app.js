const API_BASE = window.SMART_FARM_API_BASE || window.location.origin;

const state = {
  sensors: [],
  history: [],
  selectedSensorId: null,
  backendOnline: false,
  connectedCount: 0,
  totalCount: 0,
  trendRange: '24h',
  selectedSnapshot: null,
};

const RANGE_CONFIG = {
  '15m': {
    label: '15 minute trend',
    ms: 15 * 60 * 1000,
    granularity: 'raw',
  },
  '1h': {
    label: '1 hour trend',
    ms: 60 * 60 * 1000,
    granularity: '1min',
  },
  '6h': {
    label: '6 hour trend',
    ms: 6 * 60 * 60 * 1000,
    granularity: '1min',
  },
  '24h': {
    label: '24 hour trend',
    ms: 24 * 60 * 60 * 1000,
    granularity: '1hour',
  },
};

// Temporary demo fallback: set to false when node 5 real analytics are available.
const ENABLE_NODE_5_MOCK_ANALYTICS = true;

function mockNode5History(sensor, range, endTime = new Date()) {
  const pointCountByRange = {
    '15m': 15,
    '1h': 30,
    '6h': 36,
    '24h': 48,
  };

  const count = pointCountByRange[state.trendRange] || 24;
  const stepMs = Math.max(1000, Math.floor(range.ms / count));
  const baseTemp = Number(sensor?.latest?.temperature ?? 29.5);
  const baseHumidity = Number(sensor?.latest?.humidity ?? 58);
  const baseLight = Number(sensor?.latest?.light_level ?? 560);

  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin(index / 3);
    const drift = Math.cos(index / 7);
    return {
      time: new Date(endTime.getTime() - (count - 1 - index) * stepMs).toISOString(),
      temperature: Number((baseTemp + wave * 0.7 + drift * 0.2).toFixed(2)),
      humidity: Number((baseHumidity + wave * 2.1 - drift * 1.2).toFixed(2)),
      light_level: Math.max(0, Math.round(baseLight + wave * 25 + drift * 12)),
      is_daytime: true,
      mocked: true,
    };
  });
}

function formatDateTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeAgo(value) {
  if (!value) return '--';
  const diffMs = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diffMs)) return '--';
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hr ago`;
}

function currentSensor() {
  return state.sensors.find((sensor) => sensor.id === state.selectedSensorId) || state.sensors[0] || null;
}

function sensorModeLabel(sensor) {
  if (!sensor) return '--';
  if (sensor.latest?.is_daytime === true) return 'Day';
  if (sensor.latest?.is_daytime === false) return 'Night';
  return '--';
}

function fetchJson(url, options = {}) {
  return fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  });
}

async function loadHealth() {
  try {
    const health = await fetchJson(`${API_BASE}/api/health`);
    state.backendOnline = true;
    state.connectedCount = Number(health.connected_sensors || health.online_sensors || 0);
    state.totalCount = Number(health.total_sensors || 0);
    return health;
  } catch (error) {
    state.backendOnline = false;
    state.connectedCount = 0;
    state.totalCount = 0;
    return null;
  }
}

async function loadSensors() {
  try {
    const payload = await fetchJson(`${API_BASE}/api/sensors?limit=20`);
    state.sensors = Array.isArray(payload.sensors) ? payload.sensors : [];
    state.totalCount = Number(payload.total_sensor_count || payload.total_count || state.sensors.length || 0);
    state.connectedCount = state.sensors.filter((sensor) => Boolean(sensor.online)).length;
    state.backendOnline = true;
    if (!state.selectedSensorId || !state.sensors.some((sensor) => sensor.id === state.selectedSensorId)) {
      state.selectedSensorId = state.sensors[0]?.id || null;
    }
    return true;
  } catch (error) {
    state.sensors = [];
    state.selectedSensorId = null;
    state.backendOnline = false;
    state.connectedCount = 0;
    state.totalCount = 0;
    return false;
  }
}

async function loadSelectedHistory(sensorId) {
  if (!sensorId) {
    state.history = [];
    return false;
  }

  try {
    const range = RANGE_CONFIG[state.trendRange] || RANGE_CONFIG['24h'];
    const end = new Date();
    const start = new Date(Date.now() - range.ms);
    const payload = await fetchJson(
      `${API_BASE}/api/sensors/${sensorId}/data?start_time=${encodeURIComponent(start.toISOString())}&end_time=${encodeURIComponent(end.toISOString())}&limit=400&granularity=${range.granularity}`
    );
    state.history = Array.isArray(payload.data) ? payload.data : [];

    if (
      ENABLE_NODE_5_MOCK_ANALYTICS &&
      sensorId === '005' &&
      state.history.length === 0
    ) {
      const sensor = state.sensors.find((item) => item.id === sensorId) || null;
      state.history = mockNode5History(sensor, range, end);
    }

    return true;
  } catch (error) {
    state.history = [];

    if (ENABLE_NODE_5_MOCK_ANALYTICS && sensorId === '005') {
      const range = RANGE_CONFIG[state.trendRange] || RANGE_CONFIG['24h'];
      const sensor = state.sensors.find((item) => item.id === sensorId) || null;
      state.history = mockNode5History(sensor, range, new Date());
    }

    return false;
  }
}

function computeMetrics() {
  const sensors = state.sensors;
  const connectedSensors = sensors.filter((sensor) => sensor.online);
  const activeSensors = sensors.length;

  const numericLatest = sensors
    .map((sensor) => sensor.latest)
    .filter(Boolean);

  const avgTemp = numericLatest.length > 0
    ? numericLatest.reduce((sum, reading) => sum + Number(reading.temperature || 0), 0) / numericLatest.length
    : null;
  const avgHumidity = numericLatest.length > 0
    ? numericLatest.reduce((sum, reading) => sum + Number(reading.humidity || 0), 0) / numericLatest.length
    : null;
  const avgLight = numericLatest.length > 0
    ? numericLatest.reduce((sum, reading) => sum + Number(reading.light_level || 0), 0) / numericLatest.length
    : null;

  document.getElementById('activeSensors').textContent = activeSensors;
  document.getElementById('onlineSensors').textContent = state.connectedCount;
  document.getElementById('avgTemp').textContent = avgTemp === null ? '--' : `${avgTemp.toFixed(1)}°C`;
  document.getElementById('avgHumidity').textContent = avgHumidity === null ? '--' : `${avgHumidity.toFixed(0)}%`;
  document.getElementById('avgLight').textContent = avgLight === null ? '--' : `${Math.round(avgLight)}`;
  document.getElementById('selectedNodeLabel').textContent = currentSensor() ? `NODE-${currentSensor().id}` : 'Waiting';
  return connectedSensors.length;
}

function renderConnectionChip() {
  const chip = document.getElementById('connectionChip');
  chip.classList.remove('online', 'offline');

  if (state.backendOnline) {
    chip.classList.add('online');
    chip.textContent = `Live data · ${state.connectedCount}/${state.totalCount || 5} sensors connected`;
  } else {
    chip.classList.add('offline');
    chip.textContent = 'Backend offline';
  }
}

function renderSensors() {
  const sensorList = document.getElementById('sensorList');
  sensorList.innerHTML = '';

  if (state.sensors.length === 0) {
    sensorList.innerHTML = `
      <article class="sensor-card empty-state">
        <div class="sensor-name">
          <strong>No live sensor data yet</strong>
          <span>Waiting for Arduino nodes to post readings to the backend.</span>
        </div>
      </article>
    `;
    return;
  }

  state.sensors.forEach((sensor) => {
    const latest = sensor.latest || {};
    const card = document.createElement('article');
    card.className = `sensor-card ${sensor.id === state.selectedSensorId ? 'active' : ''}`;
    card.innerHTML = `
      <div class="sensor-top">
        <div class="sensor-name">
          <strong>NODE-${sensor.id}</strong>
          <span>${sensor.location}</span>
        </div>
        <span class="badge ${sensor.online ? '' : 'muted'}">${sensor.online ? 'Connected' : 'Waiting'}</span>
      </div>
      <div class="sensor-readings">
        <div class="reading-pill"><span>Temp</span><strong>${latest.temperature !== undefined ? `${Number(latest.temperature).toFixed(1)}°C` : '--'}</strong></div>
        <div class="reading-pill"><span>Humidity</span><strong>${latest.humidity !== undefined ? `${Number(latest.humidity).toFixed(0)}%` : '--'}</strong></div>
        <div class="reading-pill"><span>Light</span><strong>${latest.light_level !== undefined ? Math.round(Number(latest.light_level)) : '--'}</strong></div>
        <div class="reading-pill"><span>Mode</span><strong>${sensorModeLabel(sensor)}</strong></div>
      </div>
      <div class="sensor-meta">
        Last transmission ${formatTimeAgo(sensor.last_transmission)} · ${formatDateTime(sensor.last_transmission)}
      </div>
    `;
    card.addEventListener('click', async () => {
      state.selectedSensorId = sensor.id;
      await refreshSelectedSensor();
    });
    sensorList.appendChild(card);
  });
}

function scalePoints(points, width, height, key) {
  const values = points.map((point) => Number(point[key] ?? 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const step = width / Math.max(1, points.length - 1);

  return points.map((point, index) => ({
    x: index * step,
    y: height - ((Number(point[key] ?? 0) - min) / range) * height,
  }));
}

function pathFromPoints(points) {
  if (points.length === 0) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
}

function fillPathFromPoints(points, width, height) {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${pathFromPoints(points)} L ${last.x.toFixed(1)} ${height} L ${first.x.toFixed(1)} ${height} Z`;
}

function renderTrendCharts() {
  const container = document.getElementById('trendCharts');
  const trendLabel = document.getElementById('trendWindowLabel');
  const range = RANGE_CONFIG[state.trendRange] || RANGE_CONFIG['24h'];
  trendLabel.textContent = range.label;
  const sensor = currentSensor();
  const history = state.history.length > 0 ? state.history : [];

  if (!sensor || history.length === 0) {
    container.innerHTML = `
      <section class="chart-row empty-state">
        <strong>No live history yet</strong>
        <span>Charts appear after the selected sensor posts data in the selected window.</span>
      </section>
    `;
    return;
  }

  const series = [
    { key: 'temperature', label: 'Temperature', unit: '°C', color: '#f4b860' },
    { key: 'humidity', label: 'Humidity', unit: '%', color: '#72b7ff' },
    { key: 'light_level', label: 'Light level', unit: '', color: '#7ee081' },
  ];

  container.innerHTML = '';

  series.forEach((entry) => {
    const width = 920;
    const height = 90;
    const points = scalePoints(history, width, height, entry.key);
    const line = pathFromPoints(points);
    const fill = fillPathFromPoints(points, width, height);
    const min = Math.min(...history.map((point) => Number(point[entry.key] ?? 0)));
    const max = Math.max(...history.map((point) => Number(point[entry.key] ?? 0)));

    const row = document.createElement('section');
    row.className = 'chart-row';
    row.innerHTML = `
      <div class="chart-row-head">
        <strong>${entry.label}</strong>
        <span>${min.toFixed(entry.key === 'light_level' ? 0 : 1)}${entry.unit} - ${max.toFixed(entry.key === 'light_level' ? 0 : 1)}${entry.unit}</span>
      </div>
      <svg class="sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="grad-${entry.key}" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="${entry.color}" stop-opacity="0.42" />
            <stop offset="100%" stop-color="${entry.color}" stop-opacity="0.03" />
          </linearGradient>
        </defs>
        <path d="${fill}" fill="url(#grad-${entry.key})"></path>
        <path d="${line}" fill="none" stroke="${entry.color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `;
    container.appendChild(row);
  });
}

function buildSerialLog(sensor) {
  const latest = sensor?.latest;
  if (!latest) {
    return [
      '=========================================',
      '  Industrial IoT - Smart Farm Node',
      '  Waiting for live sensor transmission...',
      '=========================================',
    ].join('\n');
  }

  const lightLine = `  Light Level : ${Math.round(latest.light_level)} / 1023`;
  const tempLine = `  Temperature : ${Number(latest.temperature).toFixed(2)} C`;
  const humidityLine = `  Humidity    : ${Number(latest.humidity).toFixed(2)} %`;
  const statusLine = latest.is_daytime
    ? '  Status      : DAYTIME  [Yellow LED ON]'
    : '  Status      : NIGHTTIME [Blue LED ON]';
  const actionLine = latest.is_daytime
    ? '  >> TRANSMITTING data to farm server...'
    : '  >> Transmission suppressed. Standby mode.';

  return [
    '=========================================',
    '  Industrial IoT - Smart Farm Node',
    `  Sensor ID : NODE-${sensor.id}`,
    `  Location  : ${sensor.location}`,
    '=========================================',
    '-----------------------------------------',
    lightLine,
    tempLine,
    humidityLine,
    statusLine,
    actionLine,
    '-----------------------------------------',
  ].join('\n');
}

function renderDetailPanel() {
  const sensor = currentSensor();
  const detailTitle = document.getElementById('detailTitle');
  const detailMode = document.getElementById('detailMode');
  const detailStatus = document.getElementById('detailStatus');

  if (!sensor) {
    detailTitle.textContent = 'Waiting for live sensor data';
    detailMode.textContent = 'Night mode';
    detailStatus.textContent = 'No sensors connected';
    document.getElementById('detailTemp').textContent = '--';
    document.getElementById('detailHumidity').textContent = '--';
    document.getElementById('detailLight').textContent = '--';
    document.getElementById('detailTransmission').textContent = '--';
    document.getElementById('serialLog').textContent = buildSerialLog(null);
    return;
  }

  detailTitle.textContent = `NODE-${sensor.id} · ${sensor.location}`;
  detailMode.textContent = `${sensorModeLabel(sensor)} mode`;
  detailStatus.textContent = sensor.online ? 'Connected' : 'Waiting';
  detailStatus.className = `badge ${sensor.online ? '' : 'muted'}`;
  document.getElementById('detailTemp').textContent = sensor.latest?.temperature !== undefined ? `${Number(sensor.latest.temperature).toFixed(1)}°C` : '--';
  document.getElementById('detailHumidity').textContent = sensor.latest?.humidity !== undefined ? `${Number(sensor.latest.humidity).toFixed(0)}%` : '--';
  document.getElementById('detailLight').textContent = sensor.latest?.light_level !== undefined ? `${Math.round(Number(sensor.latest.light_level))}` : '--';
  document.getElementById('detailTransmission').textContent = sensor.last_transmission ? formatTimeAgo(sensor.last_transmission) : '--';
  document.getElementById('serialLog').textContent = buildSerialLog(sensor);
}

function updateRefreshTime() {
  document.getElementById('lastRefreshLabel').textContent = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

async function refreshSelectedSensor() {
  await loadSelectedHistory(state.selectedSensorId);
  renderSensors();
  computeMetrics();
  renderDetailPanel();
  renderTrendCharts();
  updateRefreshTime();
}

async function refreshAll() {
  await loadHealth();
  await loadSensors();
  renderConnectionChip();
  renderSensors();
  if (!state.selectedSensorId && state.sensors.length > 0) {
    state.selectedSensorId = state.sensors[0].id;
  }
  await refreshSelectedSensor();
}

async function boot() {
  document.getElementById('apiBaseLabel').textContent = API_BASE;
  document.getElementById('refreshButton').addEventListener('click', async () => {
    await refreshAll();
  });

  document.getElementById('trendRange').addEventListener('change', async (event) => {
    state.trendRange = event.target.value;
    await refreshSelectedSensor();
  });

  await refreshAll();
  setInterval(refreshAll, 10000);
}

boot().catch(() => {
  state.backendOnline = false;
  state.sensors = [];
  state.history = [];
  renderConnectionChip();
  renderSensors();
  computeMetrics();
  renderDetailPanel();
  renderTrendCharts();
});
