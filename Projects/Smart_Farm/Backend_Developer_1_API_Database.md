# Backend Developer 1: REST API & Database Design

## Architecture Overview: STAR TOPOLOGY

```
                  ╔═══════════════════════════════════════╗
                  ║   CENTRAL BACKEND SERVER              ║
                  ║   (PostgreSQL + REST API)             ║
                  ║   IP: 192.168.1.100:3000              ║
                  ║   Receives data from ALL 5 nodes      ║
                  ║   Stores in ONE database              ║
                  ╚═══════════════════════════════════════╝
                     ▲     ▲     ▲     ▲     ▲
                     │     │     │     │     │
        ┌────────────┼─────┼─────┼─────┼─────┼──────────┐
        │            │     │     │     │     │          │
   ┌────┴────┐  ┌────┴────┐ ┌────┴────┐ ┌────┴────┐ ┌───┴─────┐
   │ Arduino  │  │ Arduino │ │ Arduino │ │ Arduino │ │ Arduino │
   │  Node 1  │  │  Node 2 │ │  Node 3 │ │  Node 4 │ │ Node 5  │
   │          │  │         │ │         │ │         │ │         │
   │  Sensor  │  │ Sensor  │ │ Sensor  │ │ Sensor  │ │ Sensor  │
   │  ID: 001 │  │ ID: 002 │ │ ID: 003 │ │ ID: 004 │ │ ID: 005 │
   │          │  │         │ │         │ │         │ │         │
   │North_    │  │Tomato_  │ │ East_   │ │ South_  │ │ West_   │
   │Field     │  │Green-   │ │ Garage  │ │Storage  │ │ Shed    │
   │          │  │house    │ │         │ │         │ │         │
   └────┬─────┘  └────┬────┘ └────┬────┘ └────┬────┘ └───┬─────┘
        │             │           │           │          │
        └─ HTTP POST ─┴─ HTTP POST ──┬─ HTTP POST ─ HTTP POST ─┘
                                     │
                  POST /api/sensors/data (JSON payload)
                  from ALL 5 Arduinos send to SAME server
                                     │
                              ┌──────┴──────┐
                              │  Database   │
                              │  (ONE DB)   │
                              │  All data   │
                              │  consolidated
                              └─────────────┘
```

**KEY ARCHITECTURE POINTS:**
- **Single Backend Server:** All 5 Arduino nodes connect to **ONE central server** (not distributed)
- **Same IP:Port:** All Arduinos configured with identical server IP (192.168.1.100) and port (3000)
- **Centralized Database:** All sensor data from 5 locations stored in **ONE PostgreSQL database**
- **Star Topology:** Each node connects only to the center hub (Backend server), NO direct node-to-node communication
- **Data Hub:** Backend server is the single point where all farm data converges

---

## Role Overview
You are the **backend infrastructure architect**. Your responsibility is to build the **ONE central farm server** that receives sensor data from all **5 Arduino nodes**, stores it in a time-series database, and exposes REST API endpoints for the Frontend to consume. You are the first backend member to start; your database schema and API contract will unblock **Backend Developer 2**, **Frontend Developer**, and indirectly **Arduino IDE Developer**.

---

## Your Responsibilities

### 1. **REST API Server Design**
You will build a server (Node.js, Python Flask/FastAPI, or Java Spring) that listens for HTTP POST requests from Arduino nodes and serves GET requests for the Dashboard.

#### Core API Endpoints

**1.1: Receive Sensor Data (Arduino → Backend)**
```
POST /api/sensors/data

Request Body (from Arduino):
{
  "sensor_id": "001",
  "location": "North_Field",
  "temperature": 24.5,
  "humidity": 65,
  "light_level": 850,
  "is_daytime": true,
  "timestamp": "2026-03-31T14:23:00Z"
}

Response: 
{
  "status": "success",
  "message": "Data received and stored",
  "record_id": "uuid-12345"
}

Status Codes:
- 200 OK: Data stored successfully
- 400 Bad Request: Missing required fields (sensor_id, temperature, humidity)
- 401 Unauthorized: Invalid or missing API key (if auth required)
- 500 Server Error: Database write failed
```

**1.2: Fetch Sensor Metadata (Frontend → Backend)**
```
GET /api/sensors

Query Parameters (optional):
- limit=10 (default: 100, max: 1000)
- online_only=true (default: false, return only online sensors)

Response:
{
  "sensors": [
    {
      "id": "001",
      "location": "North_Field",
      "online": true,
      "last_transmission": "2026-03-31T14:23:00Z",
      "created_at": "2026-01-01T00:00:00Z"
    },
    {
      "id": "002",
      "location": "Tomato_Greenhouse",
      "online": true,
      "last_transmission": "2026-03-31T14:22:45Z",
      "created_at": "2026-01-01T00:00:00Z"
    },
    ...
  ],
  "total_count": 5
}

Status Codes:
- 200 OK: Successful fetch
- 500 Server Error: Database query failed
```

**1.3: Fetch Historical Sensor Data (Frontend → Backend)**
```
GET /api/sensors/{sensor_id}/data

Query Parameters:
- start_time=2026-03-31T00:00:00Z (ISO 8601 UTC, required)
- end_time=2026-03-31T23:59:59Z (ISO 8601 UTC, required)
- limit=1000 (max records to return)
- granularity=raw|1min|5min|1hour (default: raw, returns all records or aggregates)

Response:
{
  "sensor_id": "001",
  "location": "North_Field",
  "data": [
    {
      "timestamp": "2026-03-31T14:23:00Z",
      "temperature": 24.5,
      "humidity": 65,
      "light_level": 850,
      "is_daytime": true
    },
    {
      "timestamp": "2026-03-31T14:18:00Z",
      "temperature": 24.3,
      "humidity": 64,
      "light_level": 800,
      "is_daytime": true
    },
    ...
  ],
  "record_count": 42
}

Status Codes:
- 200 OK: Successful fetch
- 404 Not Found: sensor_id does not exist
- 400 Bad Request: Invalid start_time/end_time format
- 500 Server Error: Database query failed
```

**1.4: Fetch All Sensor Data (Optional, for Admin Dashboard)**
```
GET /api/data/latest

Query Parameters:
- limit_per_sensor=10 (latest N records per sensor)

Response:
{
  "timestamp_generated": "2026-03-31T14:30:00Z",
  "sensors": {
    "001": [
      { timestamp: "2026-03-31T14:23:00Z", temperature: 24.5, humidity: 65, ... },
      ...
    ],
    "002": [ ... ]
  }
}
```

**1.5: Sensor Status & Health Check**
```
GET /api/health

Response:
{
  "status": "healthy",
  "database": "connected",
  "total_sensors": 5,
  "online_sensors": 4,
  "last_data_received": "2026-03-31T14:23:00Z"
}
```

### 2. **Database Schema Design**
Design a time-series database optimized for high-volume sensor data writes and historical queries.

#### Recommended Database: PostgreSQL with TimescaleDB extension (or InfluxDB, MongoDB)
**Rationale:** PostgreSQL + TimescaleDB is cost-effective, proven for IoT time-series, and provides SQL familiarity.

#### Schema Tables

**Table 1: `sensors` (Metadata)**
```sql
CREATE TABLE sensors (
  id SERIAL PRIMARY KEY,
  sensor_id VARCHAR(50) UNIQUE NOT NULL,
  location VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  
  -- For monitoring
  last_transmission TIMESTAMP,
  total_transmissions INT DEFAULT 0
);

-- Example data:
-- (1, '001', 'North_Field', '2026-01-01', true, '2026-03-31T14:23:00Z', 8752)
-- (2, '002', 'Tomato_Greenhouse', '2026-01-01', true, '2026-03-31T14:22:45Z', 8634)
-- (3, '003', 'East_Garage', '2026-01-01', true, '2026-03-31T14:20:00Z', 8512)
-- (4, '004', 'South_Storage', '2026-01-01', true, '2026-03-31T14:19:30Z', 8421)
-- (5, '005', 'West_Shed', '2026-01-01', true, '2026-03-31T14:15:00Z', 7963)
```

**Table 2: `sensor_data` (Time-Series Data - Hypertable if using TimescaleDB)**
```sql
CREATE TABLE sensor_data (
  time TIMESTAMP NOT NULL,
  sensor_id VARCHAR(50) NOT NULL,
  temperature DECIMAL(5, 2), -- -10 to 60°C
  humidity DECIMAL(5, 2),    -- 0 to 100%
  light_level INT,           -- 0 to 1023 (ADC) or 0 to 100000 (LUX)
  is_daytime BOOLEAN,
  
  -- For integrity
  PRIMARY KEY (time, sensor_id),
  FOREIGN KEY (sensor_id) REFERENCES sensors(sensor_id)
);

-- Enable TimescaleDB hypertable (for fast ingestion at scale)
SELECT create_hypertable('sensor_data', 'time', if_not_exists => TRUE);

-- Create index for queries
CREATE INDEX ON sensor_data (sensor_id, time DESC);

-- Example data:
-- ('2026-03-31T14:23:00Z', '001', 24.5, 65, 850, true)
-- ('2026-03-31T14:18:00Z', '001', 24.3, 64, 800, true)
-- ('2026-03-31T14:13:00Z', '002', 26.1, 72, 920, true)
```

**Table 3: `data_validation_log` (Optional - for debugging data quality)**
```sql
CREATE TABLE data_validation_log (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sensor_id VARCHAR(50),
  request_body JSONB,
  validation_error VARCHAR(500),
  rejected BOOLEAN
);

-- Track invalid payloads from Arduino for debugging
```

### 3. **Data Validation & Sanitization**
Before storing data, validate all incoming payloads:

```python
# Example validation function (Python)
def validate_sensor_payload(payload):
    """Validate incoming Arduino data."""
    required_fields = ['sensor_id', 'location', 'temperature', 'humidity', 'light_level', 'is_daytime', 'timestamp']
    
    # Check all required fields present
    for field in required_fields:
        if field not in payload:
            return False, f"Missing required field: {field}"
    
    # Validate data types and ranges
    try:
        temp = float(payload['temperature'])
        if not (-10 <= temp <= 60):
            return False, f"Temperature {temp} out of range [-10, 60]°C"
        
        humidity = float(payload['humidity'])
        if not (0 <= humidity <= 100):
            return False, f"Humidity {humidity} out of range [0, 100]%"
        
        light = int(payload['light_level'])
        if not (0 <= light <= 1023) and not (0 <= light <= 100000):
            return False, f"Light level {light} invalid (expected 0-1023 ADC or 0-100000 LUX)"
        
        is_daytime = bool(payload['is_daytime'])
        
        # Validate timestamp format (ISO 8601)
        datetime.fromisoformat(payload['timestamp'].replace('Z', '+00:00'))
        
    except (ValueError, TypeError) as e:
        return False, f"Data type validation failed: {str(e)}"
    
    return True, "Valid"
```

### 4. **Sensor Registration & Onboarding**
- Pre-register sensor nodes before deployment with unique IDs (001-999) and location names
- Store in `sensors` table with `is_active = true`
- Arduino firmware hardcodes its Sensor ID; on first transmission, server matches ID to location

**Sensor Registration Endpoint (Optional):**
```
POST /api/admin/sensors/register

Request Body:
{
  "sensor_id": "006",
  "location": "New_Field_North"
}

Response:
{
  "status": "registered",
  "sensor_id": "006",
  "location": "New_Field_North"
}
```

### 5. **Performance Optimization**
- **Connection Pooling:** Reuse database connections; don't create new connection per request
- **Batch Inserts:** If multiple Arduino nodes send data simultaneously, batch insert for efficiency
- **Indexing:** Create index on `(sensor_id, time DESC)` for fast historical queries
- **Caching:** Cache sensor metadata (list of locations) with 1-hour TTL; invalidate on new sensor registration
- **Pagination:** Limit historical queries to max 100K records; require `limit` parameter

### 6. **Error Handling & Logging**
- Log all invalid payloads to `data_validation_log` table or console for debugging
- Return meaningful HTTP errors: 400 (malformed), 401 (auth), 500 (server)
- Implement request/response logging: timestamp, endpoint, status, response time
- Alert Backend Dev 2 if data ingestion rate drops unexpectedly (sensor offline)

---

## Deliverables Checklist

- [ ] **Database Schema** (`schema.sql`)
  - `sensors` table with metadata
  - `sensor_data` hypertable for time-series
  - Appropriate indexes and constraints

- [ ] **Database Documentation** (`DATABASE.md`)
  - Schema diagram (ER diagram showing relationships)
  - Table definitions with column descriptions
  - Example queries: fetch last 24h data, monthly aggregates

- [ ] **REST API Server** (Node.js `index.js` / Python `app.py`)
  - Express/Flask server listening on port 3000 (or configurable)
  - Endpoints: POST /api/sensors/data, GET /api/sensors, GET /api/sensors/{id}/data, GET /api/health
  - Request validation, error handling, logging middleware

- [ ] **API Documentation** (`API.md` or OpenAPI/Swagger)
  - All endpoints, request/response schemas, status codes
  - Example cURL requests: `curl -X POST http://localhost:3000/api/sensors/data ...`
  - Authentication method (if required)

- [ ] **Data Validation Module** (`validation.ts` / `validation.py`)
  - Validate temperature, humidity, light level, timestamp ranges
  - Unit tests with valid and invalid payloads

- [ ] **Unit Tests** (`api.test.ts` / `test_api.py`)
  - Test POST /api/sensors/data with valid payload (expect 200)
  - Test POST with missing fields (expect 400)
  - Test GET /api/sensors (expect 200 with array)
  - Test GET /api/sensors/invalid_id/data (expect 404)

- [ ] **Setup & Deployment Guide** (`SETUP.md`)
  - Database creation: `psql -f schema.sql`
  - Environment variables: DATABASE_URL, PORT, etc.
  - Start server: `npm start` or `python app.py`
  - Connection string example: `postgresql://user:pass@localhost/smart_farm`

- [ ] **Pre-loaded Sensor Metadata** (`seed.sql`)
  - Insert 5 sensors: "001" (North_Field), "002" (Tomato_Greenhouse), "003" (East_Garage), "004" (South_Storage), "005" (West_Shed)

- [ ] **.env Template** (`.env.example`)
  ```
  DATABASE_URL=postgresql://localhost/smart_farm_dev
  PORT=3000
  NODE_ENV=development
  API_KEY_REQUIRED=true (or false for local testing)
  ```

---

## Tech Stack Recommendations

| Component | Technology | Rationale |
|---|---|---|
| **Server** | Node.js + Express / Python + FastAPI | Node.js: fast JSON handling; Python: simpler async syntax |
| **Database** | PostgreSQL + TimescaleDB | Proven for IoT, cost-effective, SQL expertise |
| **ORM/Query** | Prisma / SQLAlchemy | Prisma: type-safe; SQLAlchemy: flexible |
| **Connection Pool** | node-postgres pg.Pool / SQLAlchemy pool | Reuse connections, handle concurrent requests |
| **Validation** | Joi / Pydantic | Express integration; automatic error messages |
| **Testing** | Jest / Pytest | Node.js/Python standards |
| **Logging** | Winston / Python logging | Structured logs for debugging |

---

## Implementation Phases

### Phase 1: Database Setup
1. Install PostgreSQL (or use Docker: `docker run -d postgres:15`)
2. Create database: `createdb smart_farm_dev`
3. Run schema.sql: `psql smart_farm_dev < schema.sql`
4. Verify tables: `\dt` in psql

### Phase 2: API Server Skeleton
1. Create Express/Flask app with basic routing
2. Implement POST /api/sensors/data endpoint (returns 200 with mock response)
3. Implement GET /api/sensors endpoint
4. Test with cURL or Postman

### Phase 3: Database Integration
1. Connect Express/Flask to PostgreSQL
2. Implement data validation function
3. Write validated data to `sensor_data` table
4. Update `sensors.last_transmission` and `total_transmissions` on each POST

### Phase 4: Error Handling & Optimization
1. Handle duplicate records (same sensor_id + timestamp = conflict)
2. Implement connection pooling
3. Add request logging middleware
4. Test with high load: 5 nodes × 1 request/5 sec = 60 requests/min

### Phase 5: Integration with Backend Dev 2
1. Share database credentials
2. Share API endpoint URL
3. Coordinate on alert triggers (temp out of range, sensor offline)

---

## Dependencies & Blockers

| Dependency | From | What You Need | When |
|---|---|---|---|
| **Payload Schema** | Arduino IDE Dev | Exact JSON structure sent by Arduino | **Phase 1 meeting** — design validation rules |
| **Alert Trigger Thresholds** | Backend Dev 2 | Temperature/humidity ranges for alerts | **Phase 4** — coordinate on monitoring rules |
| **Database Credentials** | Your Infrastructure | Server, username, password, db name | **Phase 0** — before schema setup |
| **Frontend API Expectations** | Frontend Dev | What fields/format expected in responses | **Phase 1 meeting** — finalize API contract |

### How to Unblock Yourself
1. Start with simple test data: pre-populate 5 sensors in `sensors` table
2. Launch POST endpoint accepting mock payloads; verify they insert correctly into `sensor_data`
3. Announce API contract; let Frontend and Arduino IDE Dev start their work with mock servers
4. Phase 4: Connect live Arduino nodes and verify end-to-end data flow

---

## Integration with Other Roles

### ← Arduino IDE Developer
**Arduino IDE Dev sends:** HTTP POST requests with sensor data payload  
**You provide:** Endpoint URL and expected JSON schema  
**Sync point:** Phase 1 spec meeting to finalize payload format and auth method

### ← Backend Developer 2
**Backend Dev 2 consumes:** Direct database access (shared `sensor_data` table)  
**You provide:** Database credentials, schema documentation, query examples  
**Sync point:** Phase 3 — after database is ready

### ← Frontend Developer
**Frontend consumes:** Your REST API endpoints (GET /api/sensors, GET /api/sensors/{id}/data)  
**You provide:** API documentation, response schema, live endpoint URL  
**Sync point:** Phase 1 spec meeting; Phase 4 integration testing

---

## Testing Strategy

### Unit Tests
```javascript
// api.test.js example
const request = require('supertest');
const app = require('../app');

describe('POST /api/sensors/data', () => {
  it('should store valid sensor data and return 200', async () => {
    const payload = {
      sensor_id: '001',
      location: 'North_Field',
      temperature: 24.5,
      humidity: 65,
      light_level: 850,
      is_daytime: true,
      timestamp: '2026-03-31T14:23:00Z'
    };
    
    const response = await request(app)
      .post('/api/sensors/data')
      .send(payload);
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
  });
  
  it('should reject payload with missing temperature', async () => {
    const payload = {
      sensor_id: '001',
      location: 'North_Field',
      humidity: 65,
      // missing temperature
    };
    
    const response = await request(app)
      .post('/api/sensors/data')
      .send(payload);
    
    expect(response.status).toBe(400);
    expect(response.body.message).toContain('temperature');
  });
});
```

### Integration Tests (Phase 4)
```bash
# With live database and Backend Dev 2
1. Insert test sensor: psql smart_farm_dev -c "INSERT INTO sensors VALUES (99, '999', 'Test_Field', NOW(), true);"
2. POST test data via API
3. Query database to verify insert
4. GET data via API endpoint; verify response matches database
5. Test with Backend Dev 2: verify alert triggers correctly
```

### Load Testing
```bash
# Simulate 5 nodes sending 1 request every 5 seconds for 10 minutes
ab -n 1200 -c 5 -p payload.json http://localhost:3000/api/sensors/data
# Verify: no data loss, response time < 500ms, database handles volume
```

---

## Acceptance Criteria (Definition of Done)

You're done when:
1. ✅ Database schema created with `sensors` and `sensor_data` tables
2. ✅ POST /api/sensors/data accepts Arduino payload, validates, and stores in DB (200 response)
3. ✅ GET /api/sensors returns list of 5 sensors with metadata (200 response)
4. ✅ GET /api/sensors/{sensor_id}/data returns historical data in correct time order (200 response)
5. ✅ Invalid payloads rejected with 400 status and meaningful error messages
6. ✅ Unit tests pass (70%+ coverage on validation and endpoints)
7. ✅ API documentation complete with example requests and responses
8. ✅ Database credentials and connection string provided to Backend Dev 2 and Frontend Dev
9. ✅ Server tested with simultaneous requests (5 nodes × 12 requests/min = 60 req/min)
10. ✅ Code peer-reviewed by Backend Dev 2 for data schema consistency

---

## Success Signals

- Arduino IDE Dev confirms payload format matches expectations
- Frontend Dev successfully integrates API and displays sensor list
- Backend Dev 2 can query sensor_data table directly and build alerts
- Database handles 5+ days of data without slowdown
- No data loss during high-frequency updates

---

## Questions to Ask

Before starting implementation, confirm with team:
1. **Communication Protocol:** HTTP only, or support MQTT later?
2. **Authentication:** API key required for Arduino? (recommend yes for production, no for local testing)
3. **Database Choice:** PostgreSQL + TimescaleDB, or InfluxDB, or MongoDB?
4. **Time Granularity:** Store all Arduino transmissions, or aggregate to 5-minute buckets?
5. **Data Retention:** How long to keep historical data (1 month, 1 year, indefinite)?
6. **Redundancy:** Single database instance, or backup/replication required?

---

## Quick Start Template

```bash
# Create Node.js + Express project
mkdir smart-farm-backend
cd smart-farm-backend
npm init -y
npm install express pg cors dotenv

# Create folder structure
mkdir src
touch src/index.js
touch src/database.js
touch src/validation.js
touch .env
touch schema.sql

# Database setup
createdb smart_farm_dev
psql smart_farm_dev < schema.sql

# Start server
npm start
# Logger: "Server running on http://localhost:3000"
```

