# Backend Setup Guide

**Quick start guide for Backend Developer 1 to set up the Smart Agriculture IoT Backend Server**

---

## Prerequisites

- **Operating System:** Windows, macOS, or Linux
- **Node.js:** Version 16+ (download from [nodejs.org](https://nodejs.org))
- **PostgreSQL:** Version 13+ (download from [postgresql.org](https://postgresql.org))
- **Git:** (optional, for version control)

### Verify Installation

```bash
node --version        # Should be v16+
npm --version         # Should be v8+
psql --version        # Should be 13+
```

---

## Step 1: Database Setup

### 1.1: Install PostgreSQL

**Windows:**
1. Download PostgreSQL installer from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
2. Run installer, follow prompts
3. Remember the password you set for `postgres` user (e.g., "postgres")
4. Accept default port: 5432

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 1.2: Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Inside psql console, run:
CREATE DATABASE smart_farm_dev;
CREATE USER smart_farm_user WITH PASSWORD 'your_secure_password';
ALTER ROLE smart_farm_user SET client_encoding TO 'utf8';
ALTER ROLE smart_farm_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE smart_farm_user SET default_transaction_deferrable TO on;
ALTER ROLE smart_farm_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE smart_farm_dev TO smart_farm_user;
\q
```

### 1.3: Load Schema

```bash
# From the backend directory
psql -U postgres -d smart_farm_dev -f schema.sql

# Verify tables created
psql -U postgres -d smart_farm_dev -c "\dt"
```

Expected output:
```
          List of relations
 Schema |        Name        | Type  | Owner
--------+--------------------+-------+--------
 public | data_validation_log | table | postgres
 public | sensor_data        | table | postgres
 public | sensors            | table | postgres
```

### 1.4: Seed Data

```bash
psql -U postgres -d smart_farm_dev -f seed.sql
```

Verify 5 sensors created:
```bash
psql -U postgres -d smart_farm_dev -c "SELECT * FROM sensors;"
```

Expected output (5 rows):
```
 sensor_id |      location      | is_active
-----------+--------------------+----------
 001       | North_Field        | t
 002       | Tomato_Greenhouse  | t
 003       | East_Garage        | t
 004       | South_Storage      | t
 005       | West_Shed          | t
```

---

## Step 2: Node.js Server Setup

### 2.1: Install Dependencies

```bash
# Navigate to backend directory
cd Projects/Smar_Farm/backend

# Install npm packages
npm install
```

This installs:
- **express** - Web server framework
- **pg** - PostgreSQL driver
- **cors** - Cross-Origin Resource Sharing
- **dotenv** - Environment variables
- **joi** - Data validation
- **nodemon** - Auto-restart during development

### 2.2: Configure Environment Variables

```bash
# Copy example to actual config
cp .env.example .env

# Edit .env file with proper database credentials
nano .env
# (or use your preferred editor)
```

**Contents of `.env`:**
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smart_farm_dev
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=smart_farm_dev
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

PORT=3000
NODE_ENV=development

API_KEY_REQUIRED=false
LOG_LEVEL=info
ENABLE_VALIDATION_LOG=true
CONNECTION_POOL_SIZE=20
```

> **Security Note:** For production, use strong passwords and keep `.env` file secret. Add `.env` to `.gitignore`.

---

## Step 3: Test Database Connection

```bash
# Test connection from Node.js
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/smart_farm_dev'
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('Connection failed:', err.message);
  else console.log('✓ Database connection successful:', res.rows[0].now);
  pool.end();
});
"
```

Expected output:
```
✓ Database connection successful: 2026-03-31 14:23:00.123456+00
```

---

## Step 4: Start the Server

### Option A: Development Mode (with auto-restart)

```bash
npm run dev
```

Expected output:
```
╔════════════════════════════════════════════════════════╗
║  Smart Agriculture IoT Backend Server                 ║
║  ────────────────────────────────────────────────────  ║
║  Status:        ✓ Running                             ║
║  Server:        0.0.0.0:3000                           ║
║  IP Address:    192.168.1.100:3000                     ║
║  Architecture:  Star Topology (5 Nodes)               ║
║  Database:      PostgreSQL smart_farm_dev             ║
║  API Docs:      http://localhost:3000/api/docs        ║
║  Health Check:  http://localhost:3000/api/health      ║
╚════════════════════════════════════════════════════════╝
```

### Option B: Production Mode

```bash
npm start
```

---

## Step 5: Test the Server

### 5.1: Health Check

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "server": "running",
  "database": "connected",
  "total_sensors": 5,
  "online_sensors": 5,
  "last_data_received": "2026-03-31T14:23:00.000Z"
}
```

### 5.2: List Sensors

```bash
curl http://localhost:3000/api/sensors
```

Expected response:
```json
{
  "sensors": [
    {
      "id": "001",
      "location": "North_Field",
      "online": true,
      "last_transmission": "2026-03-31T14:23:00.000Z",
      "created_at": "2026-01-01T00:00:00.000Z",
      "total_transmissions": 10
    },
    ...
  ],
  "total_count": 5
}
```

### 5.3: Send Test Data (Simulate Arduino)

```bash
curl -X POST http://localhost:3000/api/sensors/data \
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

Expected response:
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

### 5.4: Fetch Sensor Data

```bash
curl "http://localhost:3000/api/sensors/001/data?start_time=2026-03-31T00:00:00Z&end_time=2026-03-31T23:59:59Z"
```

---

## Step 6: Configure Network (Star Topology)

For all 5 Arduino nodes to reach the backend server, configure network access:

### 6.1: Find Your Server IP

```bash
# Linux/macOS:
ifconfig | grep "inet "

# Windows:
ipconfig | grep "IPv4"
```

Look for IP address like `192.168.1.100` or `10.0.0.50`

### 6.2: Configure Firewall

**Windows:**
1. Windows Defender Firewall → Advanced Settings
2. Inbound Rules → New Rule
3. Port: 3000, Protocol: TCP, Action: Allow

**Linux:**
```bash
sudo ufw allow 3000
```

**macOS:**
```bash
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off
# or use System Preferences → Security & Privacy → Firewall
```

### 6.3: Update Arduino Configuration

In Arduino firmware, set:
```cpp
const char* serverIP = "192.168.1.100";  // your server IP
const int serverPort = 3000;
```

---

## Step 7: Verify End-to-End

### 7.1: Insert Test Data

```bash
# Simulate multiple Arduino nodes sending data
for i in 1 2 3 4 5; do
  curl -X POST http://localhost:3000/api/sensors/data \
    -H "Content-Type: application/json" \
    -d "{
      \"sensor_id\": \"00$i\",
      \"location\": \"TestLocation_$i\",
      \"temperature\": $((20 + $i)),
      \"humidity\": $((50 + $i * 5)),
      \"light_level\": $((500 + $i * 100)),
      \"is_daytime\": true,
      \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }"
done
```

### 7.2: Check Database

```bash
psql -U postgres -d smart_farm_dev -c "SELECT COUNT(*) as total_records FROM sensor_data;"
psql -U postgres -d smart_farm_dev -c "SELECT * FROM sensors WHERE last_transmission IS NOT NULL;"
```

---

## Troubleshooting

### Issue: "Error: connect ECONNREFUSED 127.0.0.1:5432"

**Solution:** PostgreSQL service not running
```bash
# Start PostgreSQL
postgres -D /usr/local/var/postgres    # macOS
sudo systemctl start postgresql         # Linux
# Windows: Use Services app to start PostgreSQL service
```

### Issue: "FATAL: password authentication failed for user 'postgres'"

**Solution:** Wrong password in `.env` file
```bash
# Reset PostgreSQL password
psql -U postgres -c "ALTER USER postgres PASSWORD 'newpassword';"
# Update .env file with new password
```

### Issue: "database 'smart_farm_dev' does not exist"

**Solution:** Database not created
```bash
psql -U postgres -c "CREATE DATABASE smart_farm_dev;"
psql -U postgres -d smart_farm_dev -f schema.sql
```

### Issue: "Error: listen EADDRINUSE :::3000"

**Solution:** Port 3000 already in use
```bash
# Kill process using port 3000
lsof -i :3000        # macOS/Linux
netstat -ano | grep 3000  # Windows
kill -9 <PID>            # Kill process

# Or change PORT in .env file to 3001, 3002, etc.
```

### Issue: API returns 404 for sensor

**Solution:** Sensor not registered
```bash
# Verify seed.sql ran correctly
psql -U postgres -d smart_farm_dev -c "SELECT * FROM sensors;"

# Reseed if needed
psql -U postgres -d smart_farm_dev -f seed.sql
```

---

## Development Commands

```bash
# Start with auto-reload
npm run dev

# Run tests (when tests are written)
npm test

# Running in production
NODE_ENV=production npm start

# Check logs
tail -f backend.log  # if logging to file

# Manually seed database
npm run seed
```

---

## Monitoring & Logs

### Console Logs
The server prints logs to console:
```
[DB] Query executed in 45ms
✓ Data received from sensor 001 (North_Field): 24.5°C, 65%
[ERROR] POST /api/sensors/data: Validation failed
```

### Database Queries
For detailed query information, enable extended logging in PostgreSQL:
```sql
-- Connect to database
psql -U postgres -d smart_farm_dev

-- Show recent queries
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

### Health Monitoring
```bash
# Check server health every 10 seconds
watch -n 10 'curl -s http://localhost:3000/api/health | jq'
```

---

## Load Testing

Test server with simulated 5 nodes sending data simultaneously:

```bash
# Using Apache Bench (install: apt install apache2-utils)
ab -n 1200 -c 5 -p payload.json http://localhost:3000/api/sensors/data
```

Create `payload.json`:
```json
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

Expected results:
- **Requests completed:** 1200 (all succeeded)
- **Response time:** < 500ms average
- **Throughput:** > 10 requests/second
- **Database:** No errors or connection issues

---

## Handoff Checklist

When Backend Dev 1 work is complete, provide this info to team:

- [ ] Server IP address and port (e.g., 192.168.1.100:3000)
- [ ] Database credentials (host, port, username, password)
- [ ] API endpoints documentation (API.md)
- [ ] Sample test data (5 pre-registered sensors)
- [ ] Server health status (curl /api/health returns healthy)
- [ ] Database schema exported (`pg_dump` or schema.sql copy)
- [ ] Environment variables template (.env.example)
- [ ] Installation instructions (this file)

---

## Next Steps

1. **Arduino IDE Developer** → Uses endpoint from API.md to program firmware
2. **Frontend Developer** → Uses API.md to build dashboard
3. **Backend Developer 2** → Gets database credentials to write data processor
4. **Arduino Assembler** → Tests end-to-end with this backend

---

## Support

For issues:
1. Check Troubleshooting section above
2. Review API.md for endpoint details
3. Check PostgreSQL logs: `tail -f /var/log/postgresql/postgresql.log`
4. Check Node.js logs: Console output or `journalctl -u smart-farm-backend`

