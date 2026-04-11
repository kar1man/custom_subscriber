# Backend Developer 2: Data Pipeline & Analytics

## Architecture Overview: STAR TOPOLOGY DATA PROCESSING

**YOUR ROLE:** Process real-time data from **ONE Backend server** that receives feeds from ALL **5 Arduino sensor nodes** and trigger intelligent alerts based on anomaly detection.

```
All 5 Arduino Nodes
(001: North_Field, 002: Tomato_Greenhouse, 003: East_Garage,
 004: South_Storage, 005: West_Shed)
           │
           ▼  POST sensor data every 5 seconds
    ┌──────────────────────┐
    │  Backend API Server  │  (Backend Dev 1)
    │  192.168.1.100:3000  │
    │  (Single server)     │
    └──────┬───────────────┘
           │
           ▼  Raw data stored
    ┌──────────────────────┐
    │  PostgreSQL Database │  (ONE centralized database)
    │  sensor_data table   │
    └──────┬───────────────┘
           │
           ▼  Real-time monitoring
    ┌──────────────────────┐
    │ YOUR PIPELINE        │
    │ (Real-time Processor)│  ← YOU WORK HERE
    │                      │
    │ • Validate rules     │
    │ • Detect anomalies   │
    │ • Trigger alerts     │
    │ • Aggregate data     │
    └──────┬───────────────┘
           │
           ▼  WebSocket alert stream
    ┌──────────────────────┐
    │  Frontend Dashboard  │  (displays all 5 nodes)
    │  + Email/SMS alerts  │
    └──────────────────────┘
```

**KEY POINT:** You process data from ONE consolidated database that contains sensor readings from ALL 5 Arduino nodes.

## Role Overview
You are the **data processor and monitoring engineer**. While Backend Developer 1 focuses on receiving and storing raw sensor data from all **5 Arduino nodes** into **ONE database**, your responsibility is to process that data in real-time, detect anomalies, trigger alerts, and perform analysis. You will work closely with Backend Dev 1 (shared database access) and feed alert events to the Frontend in real-time.

---

## Your Responsibilities

### 1. **Data Ingestion & Processing Pipeline**
Once Backend Dev 1 has raw sensor data in the `sensor_data` table, you build a processor that:
- Monitors incoming data continuously
- Validates data against edge computing rules (daytime filtering)
- Detects anomalies (temperature spikes, sensor disconnections)
- Generates alerts and events
- Aggregates data for historical trends

#### Data Flow
```
Arduino Sensors
    ↓
Backend Dev 1 API (POST /api/sensors/data)
    ↓
PostgreSQL sensor_data table
    ↓
[YOUR PIPELINE: Real-time data processor]
    ├→ Validate edge computing rules
    ├→ Check for anomalies
    ├→ Trigger alerts
    ├→ Aggregate metrics
    ├→ Log to event stream
    ↓
Alert Notification System (WebSocket/REST)
    ↓
Frontend Dashboard & Email/SMS
```

### 2. **Edge Computing Validation**
Verify that the Arduino is correctly implementing daytime-only transmission:

```python
def validate_edge_computing_rules(sensor_data):
    """
    Verify sensor is not transmitting at night.
    If LDR shows nighttime (low light) but data is transmitted, flag as error.
    """
    sensor_id = sensor_data['sensor_id']
    is_daytime = sensor_data['is_daytime']
    light_level = sensor_data['light_level']
    timestamp = sensor_data['timestamp']
    
    # Rule 1: If is_daytime=true, light_level should be > threshold (e.g., 200)
    if is_daytime and light_level < 200:
        log_warning(f"Sensor {sensor_id}: marked daytime but low light {light_level}")
        return False
    
    # Rule 2: If is_daytime=false, light_level should be < threshold
    if not is_daytime and light_level > 700:
        log_warning(f"Sensor {sensor_id}: marked nighttime but high light {light_level}")
        return False
    
    # Rule 3: No transmissions expected between 20:00 - 06:00 (adjust for location timezone)
    hour = timestamp.hour
    if 20 <= hour or hour < 6:  # 8 PM to 6 AM
        if is_daytime and light_level > 500:
            log_warning(f"Sensor {sensor_id}: daytime data outside expected hours")
            return False
    
    return True
```

### 3. **Anomaly Detection & Alerts**
Monitor sensor data for abnormal conditions and trigger alerts:

#### Alert Types

**3.1: Temperature Out-of-Range Alert**
```python
def check_temperature_alert(sensor_id, temperature):
    """
    Trigger alert if temperature exceeds crop-safe range.
    Typical crops: 15-30°C optimal, 10-35°C acceptable.
    """
    TEMP_MIN = 10  # °C
    TEMP_MAX = 35  # °C
    
    if temperature < TEMP_MIN:
        alert_level = 'critical' if temperature < 5 else 'warning'
        return {
            'alert_type': 'temperature_low',
            'sensor_id': sensor_id,
            'value': temperature,
            'threshold': TEMP_MIN,
            'level': alert_level,
            'message': f'Temperature {temperature}°C below optimal range'
        }
    
    if temperature > TEMP_MAX:
        alert_level = 'critical' if temperature > 40 else 'warning'
        return {
            'alert_type': 'temperature_high',
            'sensor_id': sensor_id,
            'value': temperature,
            'threshold': TEMP_MAX,
            'level': alert_level,
            'message': f'Temperature {temperature}°C above safe range'
        }
    
    return None
```

**3.2: Humidity Alert**
```python
def check_humidity_alert(sensor_id, humidity):
    """
    Trigger alert if humidity is too high (fungal disease risk) or too low (drought risk).
    Typical crops: 40-70% optimal.
    """
    HUMIDITY_MIN = 30  # %
    HUMIDITY_MAX = 85  # %
    
    if humidity < HUMIDITY_MIN:
        return {
            'alert_type': 'humidity_low',
            'sensor_id': sensor_id,
            'value': humidity,
            'threshold': HUMIDITY_MIN,
            'level': 'warning',
            'message': f'Humidity {humidity}% low - risk of drought stress'
        }
    
    if humidity > HUMIDITY_MAX:
        return {
            'alert_type': 'humidity_high',
            'sensor_id': sensor_id,
            'value': humidity,
            'threshold': HUMIDITY_MAX,
            'level': 'warning',
            'message': f'Humidity {humidity}% high - risk of fungal diseases'
        }
    
    return None
```

**3.3: Sensor Offline Alert**
```python
def check_sensor_offline(sensor_id, last_transmission_time, now):
    """
    Trigger alert if sensor hasn't transmitted in over 30 minutes (during daytime).
    Indicates network disconnection or sensor malfunction.
    """
    time_since_last = (now - last_transmission_time).total_seconds()
    OFFLINE_THRESHOLD_SEC = 1800  # 30 minutes
    
    # Only alert during daytime (6 AM to 8 PM)
    hour = now.hour
    if 6 <= hour < 20:  # Daytime hours
        if time_since_last > OFFLINE_THRESHOLD_SEC:
            minutes_offline = time_since_last / 60
            return {
                'alert_type': 'sensor_offline',
                'sensor_id': sensor_id,
                'last_transmission': last_transmission_time,
                'level': 'critical',
                'message': f'Sensor offline for {minutes_offline:.0f} minutes'
            }
    
    return None
```

**3.4: Sensor Malfunction (Impossible Readings)**
```python
def check_sensor_malfunction(sensor_id, temp, humidity, light):
    """
    Detect sensor hardware failures: constant readings, frozen values, noise spikes.
    """
    # Check for frozen readings (same value for 10 consecutive readings)
    if is_value_frozen(sensor_id, temp, humidity, light):
        return {
            'alert_type': 'sensor_frozen',
            'sensor_id': sensor_id,
            'level': 'warning',
            'message': 'Sensor readings unchanged for 50+ minutes - possible malfunction'
        }
    
    # Check for impossible jumps (temp change > 5°C in 5 minutes)
    if has_temperature_spike(sensor_id, temp):
        return {
            'alert_type': 'temperature_spike',
            'sensor_id': sensor_id,
            'value': temp,
            'level': 'warning',
            'message': 'Sudden temperature jump - possible sensor error'
        }
    
    return None
```

### 4. **Real-Time Alert Distribution**
Stream alerts to Frontend and optionally email/SMS:

```python
class AlertManager:
    def __init__(self):
        self.connected_clients = set()  # WebSocket connections
        self.alert_history = []  # In-memory or Redis cache
    
    def trigger_alert(self, alert):
        """
        Broadcast alert to all connected Frontend dashboards.
        """
        timestamp = datetime.utcnow().isoformat()
        alert['timestamp'] = timestamp
        
        # Store in alert history (for dashboard history panel)
        self.alert_history.append(alert)
        if len(self.alert_history) > 1000:
            self.alert_history.pop(0)  # Keep last 1000 alerts
        
        # Broadcast to all WebSocket clients
        message = json.dumps(alert)
        for client in self.connected_clients:
            try:
                client.send(message)
            except:
                self.connected_clients.remove(client)
        
        # Optional: Send critical alerts via email/SMS
        if alert['level'] == 'critical':
            self.send_email_alert(alert)
    
    def send_email_alert(self, alert):
        """Send critical alerts to farm manager email."""
        import smtplib
        smtp = smtplib.SMTP('smtp.gmail.com', 587)
        # TODO: Configure email credentials in .env
        # send email with alert details
```

### 5. **Time-Series Data Aggregation**
Build summary statistics for historical analysis:

```python
def aggregate_sensor_data(sensor_id, granularity='1hour'):
    """
    Aggregate raw data into hourly/daily summaries.
    Granularity: '1min', '5min', '1hour', '1day'
    """
    # Query raw sensor_data table
    # SELECT 
    #   DATE_TRUNC(granularity, time) as period,
    #   sensor_id,
    #   AVG(temperature) as avg_temp,
    #   MIN(temperature) as min_temp,
    #   MAX(temperature) as max_temp,
    #   AVG(humidity) as avg_humidity,
    #   COUNT(*) as transmission_count
    # FROM sensor_data
    # WHERE sensor_id = ? AND time > now() - interval '7 days'
    # GROUP BY period, sensor_id
    # ORDER BY period DESC
    
    return aggregated_data
```

### 6. **Data Quality Monitoring**
Track metrics about overall data flow health:

```python
class DataQualityMonitor:
    def get_health_metrics(self):
        """
        Return overall network health status.
        """
        return {
            'total_sensors': 5,
            'online_sensors': 4,  # Received data in last 30 min
            'data_points_today': 28450,
            'avg_daytime_transmission_interval': 300,  # seconds
            'data_loss_percentage': 1.2,  # missing expected transmissions
            'average_api_response_time': 145,  # ms
            'database_cpu_usage': 15,  # percent
            'database_storage_used': 2.3  # GB
        }
    
    def detect_anomalous_patterns(self):
        """
        Identify unusual network behavior (possible issues).
        """
        patterns = {
            'data_spike': False,  # 10x normal transmission rate
            'data_gap': False,    # 50% of expected transmissions missing
            'location_imbalance': False,  # one location sending much more data
            'timezone_misalignment': False  # timestamps don't match local time
        }
        return patterns
```

### 7. **Data Persistence for Alerts**
Store alert history for Frontend to query:

```sql
-- Create alerts table (Backend Dev 1 should include this in schema)
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  sensor_id VARCHAR(50),
  alert_type VARCHAR(100),  -- 'temperature_high', 'sensor_offline', etc.
  level VARCHAR(20),        -- 'warning', 'critical'
  message TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast alert history queries
CREATE INDEX ON alerts (timestamp DESC, sensor_id);
```

### 8. **Event Logging for Debugging**
Log all significant events for root cause analysis:

```python
import logging

logger = logging.getLogger(__name__)

def log_event(event_type, sensor_id, details):
    """
    Log important events for debugging.
    event_type: 'data_received', 'alert_triggered', 'edge_config_error', etc.
    """
    logger.info(f"EVENT: {event_type} | sensor={sensor_id} | details={json.dumps(details)}")

# Example: log every incoming data point
log_event('data_received', '001', {
    'temperature': 24.5,
    'humidity': 65,
    'is_daytime': True,
    'timestamp': '2026-03-31T14:23:00Z'
})

# Example: log anomaly detection
log_event('anomaly_detected', '001', {
    'anomaly_type': 'temperature_spike',
    'value': 35.2,
    'threshold': 35,
    'magnitude': 0.2
})
```

---

## Deliverables Checklist

- [ ] **Data Processing Service** (`data_processor.py` / `processor.js`)
  - Continuously monitors `sensor_data` table for new records
  - Runs validation, anomaly detection, alert generation
  - Triggers alerts in real-time

- [ ] **Alert Manager** (`alert_manager.py` / `alerts.ts`)
  - Stores alerts in database (`alerts` table)
  - Broadcasts alerts via WebSocket to Frontend
  - Sends critical alerts via email/SMS (optional)

- [ ] **Alert Rules Configuration** (`alert_rules.json` or database table)
  - Define temperature, humidity, offline thresholds
  - Configurable per location (different crops may have different thresholds)
  - Example: Tomato_Greenhouse (temp 15-28°C), North_Field (temp 10-30°C)

- [ ] **Aggregation Jobs** (`aggregation_job.py`)
  - Hourly job to generate hourly summaries
  - Daily job to generate daily summaries
  - Store aggregates in separate `sensor_data_1hour` and `sensor_data_1day` tables

- [ ] **Health Monitoring Dashboard** (`GET /api/health` endpoint)
  - Return total sensors, online count, data quality metrics
  - Exposed to Backend Dev 1's API server

- [ ] **Unit Tests** (`test_processor.py` / `processor.test.ts`)
  - Test temperature alert with value above/below threshold
  - Test offline alert when last_transmission exceeds threshold
  - Test edge computing validation (daytime flag vs light level)

- [ ] **Event Log Viewer** (optional Vue/React component)
  - Show recent events: data received, alerts triggered, errors
  - Filter by event type, sensor, timestamp
  - Export logs for debugging

- [ ] **Documentation** (`PIPELINE_README.md`)
  - Architecture diagram: data flow from Arduino → database → alerts
  - Alert trigger thresholds and logic
  - How to adjust thresholds for different crops
  - Troubleshooting guide

- [ ] **Configuration File** (`.env` or `alert_config.json`)
  ```json
  {
    "temperature": {
      "min": 10,
      "max": 35,
      "alert_level": "warning"
    },
    "humidity": {
      "min": 30,
      "max": 85,
      "alert_level": "warning"
    },
    "offline_threshold_minutes": 30,
    "email_alerts_enabled": false,
    "email_recipient": "farm_manager@example.com"
  }
  ```

---

## Tech Stack Recommendations

| Component | Technology | Rationale |
|---|---|---|
| **Stream Processing** | Python Celery + Redis / Node.js Bull | Celery: proven for data pipelines; Bull: simpler setup |
| **Database** | PostgreSQL (same as Backend Dev 1) | Direct table access, shared schema |
| **Real-time Messaging** | WebSocket (Flask-SocketIO / Node.js ws) | Native browser support, low latency |
| **Job Scheduler** | APScheduler / node-schedule | Hourly/daily aggregation jobs |
| **Email** | smtplib (Python) / Nodemailer (Node.js) | Optional alert notifications |
| **Logging** | Python logging / Winston | Structured, queryable logs |
| **Testing** | Pytest / Vitest | Standard test frameworks |

---

## Implementation Phases

### Phase 1: Setup
1. Clone Backend Dev 1's database schema
2. Create `alerts` table in same database
3. Set up connection to PostgreSQL

### Phase 2: Core Processing Logic
1. Build data validation functions (temperature range, humidity, offline check)
2. Build anomaly detection (spikes, frozen values, impossible readings)
3. Build alert generation (return alert object with type, level, message)
4. Test with mock/historical data

### Phase 3: Real-Time Integration
1. Build alert persistence (insert into `alerts` table)
2. Build WebSocket server to broadcast alerts to Frontend
3. Test with live data from Backend Dev 1

### Phase 4: Aggregation & Health
1. Build hourly aggregation job
2. Build health metrics endpoint (expose to Backend Dev 1's API)
3. Test with multi-day data

### Phase 5: Production Hardening
1. Error handling and retry logic
2. Performance optimization (batch alert processing)
3. Load testing (simulate 5+ sensors sending frequently)

---

## Integration Points

### ← Backend Developer 1
**You consume:** PostgreSQL database tables (`sensor_data`, `sensors`)  
**Backend Dev 1 provides:** Database credentials, schema documentation, live data  
**Sync point:** After Backend Dev 1 completes DB schema (Phase 2)

### → Backend Developer 1
**Backend Dev 1 consumes:** Your `/api/health` endpoint (optional)  
**You provide:** Health metrics, data quality status  
**Sync point:** Phase 4 — coordinate on what metrics to expose

### → Frontend Developer
**Frontend consumes:** WebSocket alerts from your alert manager; Optional: `/api/alerts/history` endpoint  
**You provide:** Alert JSON schema, WebSocket event format  
**Sync point:** Phase 2 — define alert message format

### → Arduino Developers (Indirect)
You validate their edge computing implementation by checking for nighttime transmissions that shouldn't occur.

---

## Testing Strategy

### Unit Tests
```python
# test_processor.py
import pytest
from processor import check_temperature_alert, check_sensor_offline

def test_temperature_alert_above_max():
    alert = check_temperature_alert('001', 36)
    assert alert is not None
    assert alert['alert_type'] == 'temperature_high'
    assert alert['level'] == 'warning'

def test_temperature_alert_below_min():
    alert = check_temperature_alert('001', 8)
    assert alert is not None
    assert alert['alert_type'] == 'temperature_low'
    assert alert['level'] == 'critical'

def test_temperature_within_range():
    alert = check_temperature_alert('001', 24)
    assert alert is None

def test_sensor_offline_alert():
    now = datetime.utcnow()
    last_transmission = now - timedelta(minutes=45)  # 45 min ago
    alert = check_sensor_offline('001', last_transmission, now)
    assert alert is not None
    assert alert['alert_type'] == 'sensor_offline'
```

### Integration Tests (Phase 4)
1. Receive data from Backend Dev 1's API
2. Process through anomaly detection
3. Verify alert inserted in `alerts` table
4. Verify alert broadcasted to Frontend via WebSocket

### Load Testing
```bash
# Simulate 5 sensors sending 1 request/5sec for 1 hour
# Monitor: alert generation rate, database insert latency, WebSocket delivery time
locust -f locustfile.py --host=http://localhost:3000
```

---

## Acceptance Criteria (Definition of Done)

You're done when:
1. ✅ Data processor continuously reads new records from `sensor_data` table
2. ✅ Temperature alert triggers when value exceeds configured threshold (unit test passing)
3. ✅ Offline alert triggers when `last_transmission` > 30 minutes (daytime only)
4. ✅ Edge computing validation detects impossible readings (daytime flag vs light level mismatch)
5. ✅ Alerts persisted in `alerts` table with timestamp, sensor_id, alert_type, message
6. ✅ WebSocket endpoint broadcasts alerts to Frontend in real-time (< 1 sec latency)
7. ✅ Hourly/daily aggregation jobs run successfully without errors
8. ✅ Health metrics endpoint returns accurate sensor counts and network status
9. ✅ All unit tests pass (70%+ code coverage)
10. ✅ End-to-end: Arduino sends data → Backend Dev 1 stores → Your processor detects alert → Frontend receives alert within 2 seconds

---

## Success Signals

- Frontend dashboard displays real-time alerts from your WebSocket
- Temperature spike at 2:00 PM triggers alert within 1 second
- Sensor offline for 35 minutes triggers offline alert (daytime)
- No alerts at 3:00 AM (nighttime, expected no transmissions)
- Health metrics show all 5 sensors online and receiving daytime transmissions regularly
- Database query performance stays < 100ms even with 7 days of data

---

## Configuration Examples

### Alert Thresholds by Crop Type

```json
{
  "crop_types": {
    "tomato": {
      "temperature": { "min": 15, "max": 28, "alert_level": "warning" },
      "humidity": { "min": 40, "max": 75, "alert_level": "warning" }
    },
    "lettuce": {
      "temperature": { "min": 10, "max": 22, "alert_level": "warning" },
      "humidity": { "min": 50, "max": 85, "alert_level": "warning" }
    },
    "general": {
      "temperature": { "min": 10, "max": 35, "alert_level": "warning" },
      "humidity": { "min": 20, "max": 90, "alert_level": "info" }
    }
  }
}
```

### Sample Alert Event (WebSocket)

```json
{
  "timestamp": "2026-03-31T14:35:00Z",
  "alert_id": 12841,
  "sensor_id": "002",
  "location": "Tomato_Greenhouse",
  "alert_type": "temperature_high",
  "level": "warning",
  "value": 31.5,
  "threshold": 28,
  "message": "Tomato_Greenhouse temperature 31.5°C exceeds safe range (max 28°C)",
  "action_suggested": "Check ventilation system, verify greenhouse cooling"
}
```

---

## Quick Start Template

```bash
# Create Python project for data processor
mkdir smart-farm-processor
cd smart-farm-processor
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install psycopg2 python-socketio flask celery redis apscheduler

# Create files
touch app.py
touch processor.py
touch alert_manager.py
touch config.json

# Start processor
python app.py
# Logger: "Data processor listening for new sensor data..."
```

