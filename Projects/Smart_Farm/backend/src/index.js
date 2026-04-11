/**
 * Smart Agriculture IoT Backend Server
 * Central hub for 5 Arduino sensor nodes (Star Topology)
 * 
 * Receives: HTTP POST from all 5 Arduino nodes
 * Stores: All data in ONE PostgreSQL database
 * Serves: REST API for Frontend Dashboard
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./database');
const {
  validateSensorPayload,
  validateSensorExists,
  validateTimestampRecency,
  checkPlausibleReadings
} = require('./validation');

const app = express();
const PORT = process.env.PORT || 3000;
const ONLINE_WINDOW_MS = 30 * 60 * 1000;

const SENSOR_REGISTRY = [
  { sensor_id: '001', location: 'North_Field' },
  { sensor_id: '002', location: 'Tomato_Greenhouse' },
  { sensor_id: '003', location: 'East_Garage' },
  { sensor_id: '004', location: 'South_Storage' },
  { sensor_id: '005', location: 'West_Shed' }
];

const sensorRegistry = new Map(SENSOR_REGISTRY.map(sensor => [sensor.sensor_id, sensor]));
const liveStore = {
  sensors: new Map(),
  readings: new Map()
};

function ensureLiveSensor(sensor_id) {
  if (!sensorRegistry.has(sensor_id)) {
    return null;
  }

  const registered = sensorRegistry.get(sensor_id);
  if (!liveStore.sensors.has(sensor_id)) {
    liveStore.sensors.set(sensor_id, {
      id: sensor_id,
      location: registered.location,
      latest: null,
      last_transmission: null,
      last_received_at: null,
      created_at: null,
      total_transmissions: 0,
      online: false
    });
  }

  return liveStore.sensors.get(sensor_id);
}

function isSensorOnline(sensor) {
  if (!sensor?.last_received_at) {
    return false;
  }
  return new Date(sensor.last_received_at) > new Date(Date.now() - ONLINE_WINDOW_MS);
}

function recordLiveReading({ sensor_id, location, temperature, humidity, light_level, is_daytime, timestamp }) {
  const sensor = ensureLiveSensor(sensor_id);
  if (!sensor) {
    return null;
  }

  const normalizedLocation = location || sensor.location;
  const reading = {
    time: timestamp,
    temperature,
    humidity,
    light_level,
    is_daytime
  };

  const readings = liveStore.readings.get(sensor_id) || [];
  readings.push(reading);
  while (readings.length > 2000) {
    readings.shift();
  }
  liveStore.readings.set(sensor_id, readings);

  sensor.location = normalizedLocation;
  sensor.latest = reading;
  sensor.last_transmission = timestamp;
  sensor.last_received_at = new Date().toISOString();
  sensor.total_transmissions += 1;
  sensor.online = isSensorOnline(sensor);

  return sensor;
}

function toSensorResponse(sensor_id) {
  const registered = sensorRegistry.get(sensor_id);
  const liveSensor = ensureLiveSensor(sensor_id);
  const source = liveSensor || {
    id: sensor_id,
    location: registered ? registered.location : 'Unknown',
    latest: null,
    last_transmission: null,
    last_received_at: null,
    created_at: null,
    total_transmissions: 0,
    online: false
  };

  return {
    id: source.id,
    location: source.location,
    online: isSensorOnline(source),
    last_transmission: source.last_transmission,
    last_received_at: source.last_received_at,
    created_at: source.created_at,
    total_transmissions: source.total_transmissions,
    latest: source.latest
  };
}

function getConnectedSensors() {
  return Array.from(liveStore.sensors.values()).filter(sensor => isSensorOnline(sensor));
}

function getLiveSensors({ limit = 100, onlineOnly = false } = {}) {
  const sensors = SENSOR_REGISTRY.map(({ sensor_id }) => toSensorResponse(sensor_id));
  const filtered = onlineOnly ? sensors.filter(sensor => sensor.online) : sensors;
  return filtered.slice(0, limit);
}

function bucketTimestamp(timestamp, granularity) {
  const date = new Date(timestamp);
  if (granularity === '1hour') {
    date.setMinutes(0, 0, 0);
  } else if (granularity === '5min') {
    const rounded = Math.floor(date.getMinutes() / 5) * 5;
    date.setMinutes(rounded, 0, 0);
  } else if (granularity === '1min') {
    date.setSeconds(0, 0);
  }
  return date.toISOString();
}

function aggregateReadings(readings, granularity) {
  if (granularity === 'raw') {
    return readings.slice().reverse();
  }

  const buckets = new Map();
  for (const reading of readings) {
    const bucketKey = bucketTimestamp(reading.time, granularity);
    const bucket = buckets.get(bucketKey) || {
      time: bucketKey,
      temperature: [],
      humidity: [],
      light_level: [],
      is_daytime: false
    };

    bucket.temperature.push(Number(reading.temperature));
    bucket.humidity.push(Number(reading.humidity));
    bucket.light_level.push(Number(reading.light_level));
    bucket.is_daytime = bucket.is_daytime || Boolean(reading.is_daytime);
    buckets.set(bucketKey, bucket);
  }

  return Array.from(buckets.values())
    .sort((a, b) => new Date(a.time) - new Date(b.time))
    .map(bucket => ({
      time: bucket.time,
      temperature: Number((bucket.temperature.reduce((sum, value) => sum + value, 0) / bucket.temperature.length).toFixed(2)),
      humidity: Number((bucket.humidity.reduce((sum, value) => sum + value, 0) / bucket.humidity.length).toFixed(2)),
      light_level: Math.round(bucket.light_level.reduce((sum, value) => sum + value, 0) / bucket.light_level.length),
      is_daytime: bucket.is_daytime
    }));
}

function getLiveHistory(sensor_id, { startTime, endTime, granularity = 'raw', limit = 1000 } = {}) {
  const readings = liveStore.readings.get(sensor_id) || [];
  const filtered = readings.filter(reading => {
    const readingTime = new Date(reading.time);
    return (!startTime || readingTime >= startTime) && (!endTime || readingTime <= endTime);
  });

  const aggregated = aggregateReadings(filtered, granularity);
  return aggregated.slice(-limit);
}

// ============================================
// Middleware
// ============================================

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/ui', express.static(path.join(__dirname, '..', '..', 'frontend')));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ============================================
// Route: Receive Sensor Data (Arduino → Backend)
// ============================================

/**
 * POST /api/sensors/data
 * Accept and store sensor data from Arduino nodes
 */
app.post('/api/sensors/data', async (req, res) => {
  try {
    const payload = req.body;

    // 1. Validate payload schema
    const validation = validateSensorPayload(payload);
    if (!validation.valid) {
      // Log validation error
      if (process.env.ENABLE_VALIDATION_LOG === 'true') {
        await db.query(
          `INSERT INTO data_validation_log (sensor_id, request_body, validation_error, rejected)
           VALUES ($1, $2, $3, true)`,
          [payload.sensor_id, JSON.stringify(payload), validation.error]
        );
      }
      return res.status(400).json({
        status: 'error',
        message: validation.error
      });
    }

    const { sensor_id, location, temperature, humidity, light_level, is_daytime, timestamp } = validation.value;

    // 2. Check if sensor is registered
    const registeredSensor = sensorRegistry.get(sensor_id);
    if (!registeredSensor) {
      if (process.env.ENABLE_VALIDATION_LOG === 'true') {
        try {
          await db.query(
            `INSERT INTO data_validation_log (sensor_id, request_body, validation_error, rejected)
             VALUES ($1, $2, $3, true)`,
            [sensor_id, JSON.stringify(payload), `sensor_id '${sensor_id}' not registered`]
          );
        } catch (logError) {
          console.warn('[WARN] Unable to write validation log:', logError.message);
        }
      }
      return res.status(404).json({
        status: 'error',
        message: `Sensor '${sensor_id}' not registered in system`
      });
    }

    // 3. Verify location matches
    if (registeredSensor.location !== location) {
      console.warn(`[WARN] Sensor ${sensor_id} sent mismatched location: '${location}' vs expected '${registeredSensor.location}'`);
    }

    // 4. Validate timestamp recency
    const timeCheck = validateTimestampRecency(timestamp);
    if (!timeCheck.valid) {
      console.warn(`[WARN] ${timeCheck.error}`);
    }

    // 5. Check for plausible readings (warnings only, doesn't block)
    const plausibility = checkPlausibleReadings(validation.value);
    if (plausibility.warnings) {
      console.warn(`[WARN] Sensor ${sensor_id}: ${plausibility.warnings.join(', ')}`);
    }

    const liveSensor = recordLiveReading(validation.value);

    // 6. Insert into sensor_data table
    let storedInDatabase = false;
    try {
      await db.query(
        `INSERT INTO sensor_data (time, sensor_id, temperature, humidity, light_level, is_daytime)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [timestamp, sensor_id, temperature, humidity, light_level, is_daytime]
      );

      await db.query(
        `UPDATE sensors 
         SET last_transmission = NOW(), total_transmissions = total_transmissions + 1
         WHERE sensor_id = $1`,
        [sensor_id]
      );

      storedInDatabase = true;
    } catch (databaseError) {
      console.warn(`[WARN] Persisting sensor ${sensor_id} to database failed, using live store: ${databaseError.message}`);
    }

    console.log(`✓ Data received from sensor ${sensor_id} (${location}): ${temperature}°C, ${humidity}%`);

    res.status(200).json({
      status: 'success',
      message: 'Data received and stored',
      record_id: sensor_id,
      timestamp: timestamp,
      connected_sensors: getConnectedSensors().length,
      total_sensors: SENSOR_REGISTRY.length,
      stored_in: storedInDatabase ? 'database' : 'memory',
      data: {
        temperature,
        humidity,
        light_level,
        is_daytime
      }
    });

  } catch (error) {
    console.error('[ERROR] POST /api/sensors/data:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to store sensor data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ============================================
// Route: Fetch Sensor Metadata (Frontend → Backend)
// ============================================

/**
 * GET /api/sensors
 * Return list of all registered sensors with metadata
 */
app.get('/api/sensors', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const onlineOnly = req.query.online_only === 'true';

    let sensors = getLiveSensors({ limit, onlineOnly });
    let totalCount = SENSOR_REGISTRY.length;

    try {
      const databaseSensors = await db.getAll('SELECT * FROM sensors ORDER BY sensor_id LIMIT $1', [limit]);
      if (databaseSensors.length > 0) {
        sensors = SENSOR_REGISTRY.map(({ sensor_id }) => {
          const liveSensor = toSensorResponse(sensor_id);
          const databaseSensor = databaseSensors.find(item => item.sensor_id === sensor_id);
          const databaseOnline = Boolean(
            databaseSensor?.last_transmission &&
            new Date(databaseSensor.last_transmission) > new Date(Date.now() - ONLINE_WINDOW_MS)
          );
          return {
            id: sensor_id,
            location: databaseSensor?.location || liveSensor.location,
            online: liveSensor.last_received_at ? liveSensor.online : databaseOnline,
            last_transmission: liveSensor.last_transmission || databaseSensor?.last_transmission || null,
            last_received_at: liveSensor.last_received_at || null,
            created_at: databaseSensor?.created_at || liveSensor.created_at,
            total_transmissions: liveSensor.total_transmissions || databaseSensor?.total_transmissions || 0,
            latest: liveSensor.latest
          };
        }).filter(sensor => !onlineOnly || sensor.online).slice(0, limit);
      }

      const totalCountRow = await db.getOne('SELECT COUNT(*) as count FROM sensors');
      totalCount = Number(totalCountRow?.count || totalCount);
    } catch (databaseError) {
      console.warn('[WARN] Using live sensor registry for /api/sensors:', databaseError.message);
    }

    res.status(200).json({
      sensors,
      total_count: totalCount,
      connected_count: sensors.filter(sensor => sensor.online).length,
      total_sensor_count: SENSOR_REGISTRY.length
    });

  } catch (error) {
    console.error('[ERROR] GET /api/sensors:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch sensors',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ============================================
// Route: Fetch Historical Sensor Data (Frontend → Backend)
// ============================================

/**
 * GET /api/sensors/:sensor_id/data
 * Return historical time-series data for a specific sensor
 */
app.get('/api/sensors/:sensor_id/data', async (req, res) => {
  try {
    const { sensor_id } = req.params;
    const { start_time, end_time, limit = 1000, granularity = 'raw' } = req.query;

    // Validate required parameters
    if (!start_time || !end_time) {
      return res.status(400).json({
        status: 'error',
        message: 'start_time and end_time query parameters are required (ISO 8601 format)'
      });
    }

    // Validate sensor exists
    const registeredSensor = sensorRegistry.get(sensor_id);

    if (!registeredSensor) {
      return res.status(404).json({
        status: 'error',
        message: `Sensor '${sensor_id}' not found`
      });
    }

    // Parse timestamps
    let startTime, endTime;
    try {
      startTime = new Date(start_time);
      endTime = new Date(end_time);
      if (isNaN(startTime) || isNaN(endTime)) throw new Error('Invalid date');
    } catch (e) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid start_time or end_time format (use ISO 8601: YYYY-MM-DDTHH:mm:ssZ)'
      });
    }

    const limitNum = Math.min(parseInt(limit) || 1000, 100000);

    if (!['raw', '1min', '5min', '1hour'].includes(granularity)) {
      return res.status(400).json({
        status: 'error',
        message: "granularity must be 'raw', '1min', '5min', or '1hour'"
      });
    }

    let data = getLiveHistory(sensor_id, {
      startTime,
      endTime,
      granularity,
      limit: limitNum
    });

    if (data.length === 0) {
      try {
        let query;
        const params = [sensor_id, startTime, endTime, limitNum];

        if (granularity === 'raw') {
          query = `
            SELECT time, temperature, humidity, light_level, is_daytime
            FROM sensor_data
            WHERE sensor_id = $1 AND time BETWEEN $2 AND $3
            ORDER BY time DESC
            LIMIT $4
          `;
        } else if (granularity === '1min') {
          query = `
            SELECT 
              DATE_TRUNC('minute', time) as time,
              AVG(temperature)::DECIMAL(5,2) as temperature,
              AVG(humidity)::DECIMAL(5,2) as humidity,
              MIN(light_level) as light_level,
              MAX(is_daytime) as is_daytime
            FROM sensor_data
            WHERE sensor_id = $1 AND time BETWEEN $2 AND $3
            GROUP BY DATE_TRUNC('minute', time)
            ORDER BY time DESC
            LIMIT $4
          `;
        } else if (granularity === '5min') {
          query = `
            SELECT 
              DATE_TRUNC('minute', time)::TIMESTAMP - (EXTRACT(MINUTE FROM time)::INTEGER % 5 || ' minute')::INTERVAL as time,
              AVG(temperature)::DECIMAL(5,2) as temperature,
              AVG(humidity)::DECIMAL(5,2) as humidity,
              MIN(light_level) as light_level,
              MAX(is_daytime) as is_daytime
            FROM sensor_data
            WHERE sensor_id = $1 AND time BETWEEN $2 AND $3
            GROUP BY DATE_TRUNC('minute', time)::TIMESTAMP - (EXTRACT(MINUTE FROM time)::INTEGER % 5 || ' minute')::INTERVAL
            ORDER BY time DESC
            LIMIT $4
          `;
        } else {
          query = `
            SELECT 
              DATE_TRUNC('hour', time) as time,
              AVG(temperature)::DECIMAL(5,2) as temperature,
              AVG(humidity)::DECIMAL(5,2) as humidity,
              MIN(light_level) as light_level,
              MAX(is_daytime) as is_daytime
            FROM sensor_data
            WHERE sensor_id = $1 AND time BETWEEN $2 AND $3
            GROUP BY DATE_TRUNC('hour', time)
            ORDER BY time DESC
            LIMIT $4
          `;
        }

        data = await db.getAll(query, params);
      } catch (databaseError) {
        console.warn('[WARN] Using live sensor history for /api/sensors/:sensor_id/data:', databaseError.message);
      }
    }

    res.status(200).json({
      sensor_id,
      location: registeredSensor.location,
      data: data.reverse(), // Return in ascending time order
      record_count: data.length,
      granularity
    });

  } catch (error) {
    console.error('[ERROR] GET /api/sensors/:sensor_id/data:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch sensor data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ============================================
// Route: Health Check
// ============================================

/**
 * GET /api/health
 * Return system health status
 */
app.get('/api/health', async (req, res) => {
  try {
    let databaseHealth = await db.healthCheck();

    let totalCount = SENSOR_REGISTRY.length;
    let onlineCount = getConnectedSensors().length;
    let lastData = null;

    try {
      const totalCountRow = await db.getOne('SELECT COUNT(*) as count FROM sensors');
      totalCount = Number(totalCountRow?.count || totalCount);

      lastData = await db.getOne(
        'SELECT MAX(time) as last_time FROM sensor_data'
      );
    } catch (databaseError) {
      console.warn('[WARN] Using live health data:', databaseError.message);
    }

    res.status(200).json({
      status: 'healthy',
      server: 'running',
      database: databaseHealth.status,
      timestamp: new Date().toISOString(),
      total_sensors: totalCount,
      online_sensors: onlineCount,
      connected_sensors: onlineCount,
      last_data_received: lastData?.last_time || null,
      database_timestamp: databaseHealth.timestamp || null,
      live_store_active: true
    });

  } catch (error) {
    console.error('[ERROR] GET /api/health:', error.message);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// ============================================
// Route: API Documentation
// ============================================

/**
 * GET /api/docs
 * Return API documentation
 */
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Smart Agriculture IoT Backend API',
    version: '1.0.0',
    description: 'Central server for 5 Arduino sensor nodes (Star Topology)',
    server_ip: '192.168.1.100',
    server_port: PORT,
    endpoints: {
      'POST /api/sensors/data': 'Receive sensor data from Arduino node',
      'GET /api/sensors': 'List all registered sensors',
      'GET /api/sensors/:sensor_id/data': 'Fetch historical data for sensor',
      'GET /api/health': 'System health check',
      'GET /api/docs': 'API documentation'
    }
  });
});

app.get('/ui', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'index.html'));
});

// ============================================
// Root route
// ============================================

app.get('/', (req, res) => {
  res.json({
    title: 'Smart Agriculture IoT Backend',
    status: 'running',
    architecture: 'Star Topology (5 Nodes → 1 Server)',
    nodes: 5,
    endpoint: `/api/health`,
    documentation: `/api/docs`
  });
});

// ============================================
// Error handling (404)
// ============================================

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    path: req.path,
    method: req.method,
    available_endpoints: '/api/docs'
  });
});

// ============================================
// Start server
// ============================================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║  Smart Agriculture IoT Backend Server                 ║
║  ────────────────────────────────────────────────────  ║
║  Status:        ✓ Running                             ║
║  Server:        0.0.0.0:${PORT}                           ║
║  IP Address:    192.168.1.100:${PORT}                     ║
║  Architecture:  Star Topology (5 Nodes)               ║
║  Database:      PostgreSQL smart_farm_dev             ║
║  API Docs:      http://localhost:${PORT}/api/docs       ║
║  Health Check:  http://localhost:${PORT}/api/health     ║
╚════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n[SHUTDOWN] Received SIGTERM signal');
  server.close(async () => {
    console.log('[SHUTDOWN] Server closed');
    await db.closePool();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\n[SHUTDOWN] Received SIGINT signal');
  server.close(async () => {
    console.log('[SHUTDOWN] Server closed');
    await db.closePool();
    process.exit(0);
  });
});

module.exports = app;
