# Smart Agriculture IoT Backend API Documentation

**Server:** `http://192.168.1.100:3000`  
**Version:** 1.0.0  
**Architecture:** Star Topology (5 Arduino Nodes → 1 Central Server)

---

## API Endpoints Overview

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---|
| POST | /api/sensors/data | Receive sensor data from Arduino | No |
| GET | /api/sensors | List all registered sensors | No |
| GET | /api/sensors/{sensor_id}/data | Fetch historical data | No |
| GET | /api/health | System health check | No |
| GET | /api/docs | API documentation | No |

---

## Endpoint: POST /api/sensors/data

**Purpose:** Accept sensor data from Arduino nodes and store in database  
**Called by:** Arduino nodes (all 5 nodes send to same endpoint)  
**Frequency:** Every 5 seconds (daytime only, due to edge computing)  
**Auth:** Not required for MVP

### Request

```http
POST /api/sensors/data HTTP/1.1
Host: 192.168.1.100:3000
Content-Type: application/json

{
  "sensor_id": "001",
  "location": "North_Field",
  "temperature": 24.5,
  "humidity": 65,
  "light_level": 850,
  "is_daytime": true,
  "timestamp": "2026-03-31T14:23:00Z"
}
```

### Request Fields

| Field | Type | Range | Required | Description |
|-------|------|-------|----------|-------------|
| sensor_id | string | 001-999 | Yes | 3-digit unique identifier |
| location | string | 3-100 chars | Yes | Farm location name |
| temperature | number | -10 to 60 | Yes | Temperature in Celsius |
| humidity | number | 0 to 100 | Yes | Relative humidity percentage |
| light_level | number | 0 to 100000 | Yes | Raw ADC or LUX reading |
| is_daytime | boolean | true/false | Yes | Daytime flag from edge computing |
| timestamp | string | ISO 8601 | Yes | UTC timestamp (format: YYYY-MM-DDTHH:mm:ssZ) |

### Response: Success (200 OK)

```json
{
  "status": "success",
  "message": "Data received and stored",
  "record_id": "001",
  "timestamp": "2026-03-31T14:23:00Z",
  "data": {
    "temperature": 24.5,
    "humidity": 65,
    "light_level": 850,
    "is_daytime": true
  }
}
```

### Response: Validation Error (400 Bad Request)

```json
{
  "status": "error",
  "message": "temperature must be >= -10°C; humidity must be <= 100%"
}
```

### Response: Sensor Not Registered (404 Not Found)

```json
{
  "status": "error",
  "message": "Sensor '006' not registered in system"
}
```

### Response: Server Error (500 Internal Server Error)

```json
{
  "status": "error",
  "message": "Failed to store sensor data",
  "error": "database connection failed"
}
```

### cURL Example

```bash
curl -X POST http://192.168.1.100:3000/api/sensors/data \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id": "001",
    "location": "North_Field",
    "temperature": 24.5,
    "humidity": 65,
    "light_level": 850,
    "is_daytime": true,
    "timestamp": "2026-03-31T14:23:00Z"
  }'
```

---

## Endpoint: GET /api/sensors

**Purpose:** List all registered sensors with metadata  
**Called by:** Frontend Dashboard  
**Frequency:** On page load, every 10 seconds for refresh  
**Auth:** Not required

### Request

```http
GET /api/sensors?limit=100&online_only=false HTTP/1.1
Host: 192.168.1.100:3000
```

### Query Parameters (Optional)

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| limit | integer | 100 | 1000 | Maximum sensors to return |
| online_only | boolean | false | — | Return only sensors with recent data |

### Response: Success (200 OK)

```json
{
  "sensors": [
    {
      "id": "001",
      "location": "North_Field",
      "online": true,
      "last_transmission": "2026-03-31T14:23:00Z",
      "created_at": "2026-01-01T00:00:00Z",
      "total_transmissions": 8752
    },
    {
      "id": "002",
      "location": "Tomato_Greenhouse",
      "online": true,
      "last_transmission": "2026-03-31T14:22:45Z",
      "created_at": "2026-01-01T00:00:00Z",
      "total_transmissions": 8634
    },
    {
      "id": "003",
      "location": "East_Garage",
      "online": false,
      "last_transmission": "2026-03-31T10:15:00Z",
      "created_at": "2026-01-01T00:00:00Z",
      "total_transmissions": 8512
    },
    {
      "id": "004",
      "location": "South_Storage",
      "online": true,
      "last_transmission": "2026-03-31T14:19:30Z",
      "created_at": "2026-01-01T00:00:00Z",
      "total_transmissions": 8421
    },
    {
      "id": "005",
      "location": "West_Shed",
      "online": false,
      "last_transmission": "2026-03-30T18:45:00Z",
      "created_at": "2026-01-01T00:00:00Z",
      "total_transmissions": 7963
    }
  ],
  "total_count": 5
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| id | string | Sensor ID (001-005) |
| location | string | Farm location name |
| online | boolean | true if data received in last 30 minutes |
| last_transmission | string | ISO 8601 timestamp of last data |
| created_at | string | ISO 8601 timestamp of sensor registration |
| total_transmissions | integer | Cumulative count of successful transmissions |

### cURL Example

```bash
# Get all sensors
curl http://192.168.1.100:3000/api/sensors

# Get only online sensors
curl http://192.168.1.100:3000/api/sensors?online_only=true

# Get first 5 sensors
curl http://192.168.1.100:3000/api/sensors?limit=5
```

---

## Endpoint: GET /api/sensors/{sensor_id}/data

**Purpose:** Fetch historical time-series data for a specific sensor  
**Called by:** Frontend Dashboard (for charts)  
**Frequency:** On location click, every 5 minutes for updates  
**Auth:** Not required

### Request

```http
GET /api/sensors/001/data?start_time=2026-03-31T00:00:00Z&end_time=2026-03-31T23:59:59Z&limit=1000&granularity=raw HTTP/1.1
Host: 192.168.1.100:3000
```

### Query Parameters

| Parameter | Type | Required | Default | Max | Description |
|-----------|------|----------|---------|-----|-------------|
| start_time | string | Yes | — | — | Start time (ISO 8601 UTC) |
| end_time | string | Yes | — | — | End time (ISO 8601 UTC) |
| limit | integer | No | 1000 | 100000 | Max records to return |
| granularity | string | No | raw | — | Aggregation: raw, 1min, 5min, 1hour |

### Response: Success (200 OK)

```json
{
  "sensor_id": "001",
  "location": "North_Field",
  "data": [
    {
      "timestamp": "2026-03-31T14:13:00Z",
      "temperature": 24.1,
      "humidity": 63,
      "light_level": 750,
      "is_daytime": true
    },
    {
      "timestamp": "2026-03-31T14:18:00Z",
      "temperature": 24.3,
      "humidity": 64,
      "light_level": 800,
      "is_daytime": true
    },
    {
      "timestamp": "2026-03-31T14:23:00Z",
      "temperature": 24.5,
      "humidity": 65,
      "light_level": 850,
      "is_daytime": true
    }
  ],
  "record_count": 3,
  "granularity": "raw"
}
```

### Response: Sensor Not Found (404 Not Found)

```json
{
  "status": "error",
  "message": "Sensor '999' not found"
}
```

### Response: Missing Parameters (400 Bad Request)

```json
{
  "status": "error",
  "message": "start_time and end_time query parameters are required (ISO 8601 format)"
}
```

### Granularity Options

- **raw:** Return all individual readings (default)
- **1min:** Average readings per minute
- **5min:** Average readings per 5 minutes
- **1hour:** Average readings per hour

### cURL Examples

```bash
# Get last 24 hours of data (raw)
curl "http://192.168.1.100:3000/api/sensors/001/data?start_time=2026-03-30T14:23:00Z&end_time=2026-03-31T14:23:00Z"

# Get hourly aggregates (for long-term trends)
curl "http://192.168.1.100:3000/api/sensors/001/data?start_time=2026-03-01T00:00:00Z&end_time=2026-03-31T23:59:59Z&granularity=1hour"

# Limit results to 500 records
curl "http://192.168.1.100:3000/api/sensors/001/data?start_time=2026-03-31T00:00:00Z&end_time=2026-03-31T23:59:59Z&limit=500"
```

---

## Endpoint: GET /api/health

**Purpose:** System health check (database, sensors, recent data)  
**Called by:** Frontend Dashboard status indicator, monitoring systems  
**Frequency:** Every 30 seconds  
**Auth:** Not required

### Request

```http
GET /api/health HTTP/1.1
Host: 192.168.1.100:3000
```

### Response: Healthy (200 OK)

```json
{
  "status": "healthy",
  "server": "running",
  "database": "connected",
  "timestamp": "2026-03-31T14:23:00Z",
  "total_sensors": 5,
  "online_sensors": 4,
  "last_data_received": "2026-03-31T14:23:00Z",
  "database_timestamp": "2026-03-31T14:23:00Z"
}
```

### Response: Unhealthy (503 Service Unavailable)

```json
{
  "status": "unhealthy",
  "error": "Connection refused"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| status | string | healthy / unhealthy |
| server | string | running / stopped |
| database | string | connected / disconnected |
| timestamp | string | Current server time (ISO 8601) |
| total_sensors | integer | Total registered sensors (should be 5) |
| online_sensors | integer | Sensors with data in last 30 minutes |
| last_data_received | string | Most recent timestamp in sensor_data table |
| database_timestamp | string | Database server time (ISO 8601) |

### cURL Example

```bash
curl http://192.168.1.100:3000/api/health
```

---

## Endpoint: GET /api/docs

**Purpose:** API documentation endpoint  
**Called by:** Developers, API browsers  
**Auth:** Not required

### Response

```json
{
  "title": "Smart Agriculture IoT Backend API",
  "version": "1.0.0",
  "description": "Central server for 5 Arduino sensor nodes (Star Topology)",
  "server_ip": "192.168.1.100",
  "server_port": 3000,
  "endpoints": {
    "POST /api/sensors/data": "Receive sensor data from Arduino node",
    "GET /api/sensors": "List all registered sensors",
    "GET /api/sensors/:sensor_id/data": "Fetch historical data for sensor",
    "GET /api/health": "System health check",
    "GET /api/docs": "API documentation"
  }
}
```

---

## Error Codes

| Code | Status | Meaning | Example |
|------|--------|---------|---------|
| 200 | OK | Request succeeded | Data stored, sensor list returned |
| 400 | Bad Request | Invalid input | Missing required field, invalid format |
| 404 | Not Found | Resource doesn't exist | Sensor ID not registered |
| 500 | Internal Server Error | Server error | Database connection failed |
| 503 | Service Unavailable | Database offline | Health check failed |

---

## Data Validation Rules

### Sensor ID
- Format: 3 digits (001-999)
- Examples: 001, 002, 003, 004, 005

### Temperature
- Range: -10°C to 60°C
- Type: Float with 1 decimal place
- Example: 24.5

### Humidity
- Range: 0% to 100%
- Type: Float with 1 decimal place
- Example: 65.2

### Light Level
- Range: 0 to 1023 (ADC) or 0 to 100000 (LUX)
- Type: Integer
- Example: 850

### Timestamp
- Format: ISO 8601 UTC (YYYY-MM-DDTHH:mm:ssZ)
- Timezone: UTC always
- Example: 2026-03-31T14:23:00Z

---

## Rate Limiting

Current MVP: **No rate limiting**

Production recommendations:
- Arduino nodes: 1 POST per 5 seconds (12 per minute)
- Frontend: 1 GET per 5 seconds for data updates
- Health checks: 1 GET per 30 seconds

---

## Example: Complete Arduino Data Flow

### 1. Arduino reads sensors
```cpp
temperature = 24.5;
humidity = 65;
light_level = 850;
is_daytime = (light_level > 300);
timestamp = "2026-03-31T14:23:00Z";
```

### 2. Arduino POSTs to Backend
```
POST /api/sensors/data HTTP/1.1
Host: 192.168.1.100:3000
Content-Type: application/json

{
  "sensor_id": "001",
  "location": "North_Field",
  "temperature": 24.5,
  "humidity": 65,
  "light_level": 850,
  "is_daytime": true,
  "timestamp": "2026-03-31T14:23:00Z"
}
```

### 3. Backend validates and stores
```sql
INSERT INTO sensor_data (time, sensor_id, temperature, humidity, light_level, is_daytime)
VALUES ('2026-03-31T14:23:00Z', '001', 24.5, 65, 850, true);

UPDATE sensors SET last_transmission = NOW(), total_transmissions = total_transmissions + 1
WHERE sensor_id = '001';
```

### 4. Frontend fetches via GET
```
GET /api/sensors HTTP/1.1
GET /api/sensors/001/data?start_time=2026-03-31T00:00:00Z&end_time=2026-03-31T23:59:59Z
```

### 5. Frontend displays data
```
North_Field: 24.5°C ✓ (last 2 min ago)
```

---

## Testing the API

### Test with Postman

1. Import these requests into Postman
2. Set variable: `{{base_url}}` = `http://192.168.1.100:3000`
3. Run requests in order

### Test with curl

```bash
# 1. Check server health
curl http://192.168.1.100:3000/api/health

# 2. Get all sensors
curl http://192.168.1.100:3000/api/sensors

# 3. Send test data (as Arduino would)
curl -X POST http://192.168.1.100:3000/api/sensors/data \
  -H "Content-Type: application/json" \
  -d '{
    "sensor_id": "001",
    "location": "North_Field",
    "temperature": 24.5,
    "humidity": 65,
    "light_level": 850,
    "is_daytime": true,
    "timestamp": "2026-03-31T14:23:00Z"
  }'

# 4. Fetch historical data
curl "http://192.168.1.100:3000/api/sensors/001/data?start_time=2026-03-31T00:00:00Z&end_time=2026-03-31T23:59:59Z"
```

---

## Integration Notes

### For Arduino IDE Developer
- Use HTTP library to POST to `/api/sensors/data`
- Ensure timestamp is in ISO 8601 UTC format
- Expect 200 response if successful
- Handle 400 errors (invalid data) and 404 (sensor not registered)

### For Frontend Developer
- Poll GET `/api/sensors` every 10 seconds for updated sensor list
- Poll GET `/api/sensors/{id}/data` every 5 seconds for chart refresh
- Poll GET `/api/health` every 30 seconds for status indicator
- Cache responses locally to reduce API calls

### For Backend Developer 2
- Access PostgreSQL database directly (credentials from Backend Dev 1)
- Query `sensor_data` table for anomaly detection
- Access `sensors` table for metadata
- Insert alerts into `alerts` table (when created)

