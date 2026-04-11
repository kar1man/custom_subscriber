# Smart Agriculture IoT: Work Sequence & Dependencies

## Executive Summary: Who Works First?

**CORRECT ORDER TO START WORK:**

```
1️⃣  BACKEND DEVELOPER 1 (FIRST - BLOCKS EVERYONE)
      ↓ (unblocks)
2️⃣  ARDUINO IDE DEVELOPER + FRONTEND DEVELOPER (PARALLEL)
      ↓ (unblocks)
3️⃣  BACKEND DEVELOPER 2
      ↓ (all pieces ready)
4️⃣  ARDUINO ASSEMBLER (LAST)
```

---

## Why This Order? (Dependency Analysis)

### PHASE 1: Backend Developer 1 (CRITICAL PATH)

**Duration:** 2-3 days  
**Can start immediately:** YES ✅  
**Blocks:** Everyone else (3 other team members)  
**Deliverables:**
- REST API specification (endpoints, request/response format)
- Database schema (PostgreSQL tables created)
- Live server running on 192.168.1.100:3000
- Database credentials shared with team

**Why first:**
```
Everyone else needs Backend Dev 1's output before proceeding:

Arduino IDE Dev needs to know:
  └─ What HTTP endpoint to POST to? (Backend Dev 1 provides)
  └─ What exact JSON format? (Backend Dev 1 specifies)

Frontend Dev needs to know:
  └─ What API endpoints exist? (Backend Dev 1 defines)
  └─ What response format? (Backend Dev 1 designs)
  └─ What sensor fields? (Backend Dev 1 creates schema)

Backend Dev 2 needs:
  └─ Access to database (Backend Dev 1 creates it)
  └─ Table schema (Backend Dev 1 provides)
  └─ Data validation rules (Backend Dev 1 sets up)
```

**Success Criteria (Definition of Done):**
- [ ] POST /api/sensors/data endpoint accepts test JSON (returns 200)
- [ ] Database created with sensors + sensor_data tables
- [ ] 5 sensor nodes pre-registered in sensors table
- [ ] API documentation (Swagger/OpenAPI) complete
- [ ] Database connection string shared with Backend Dev 2
- [ ] Server IP + port confirmed: 192.168.1.100:3000

---

### PHASE 2: Arduino IDE Developer & Frontend Developer (PARALLEL - Can work simultaneously)

**Duration:** 2-3 days (same timeline)  
**Can start after:** Backend Dev 1 completes Phase 1  
**Blocks:** Arduino Assembler (Assembler needs firmware ready)  

#### 2A. Arduino IDE Developer

**What they need from Backend Dev 1:**
- API endpoint: `http://192.168.1.100:3000/api/sensors/data`
- JSON payload format (exact fields, data types)
- Example response format (for error handling)

**What they do NOT need to wait for:**
- ✅ Can write and test firmware locally with mock Backend server
- ✅ Can test DHT11 and LDR sensors independently
- ✅ Can create configuration framework (Sensor ID assignment)

**Can work in parallel with Backend Dev 1?** YES  
- Days 1-2: Write firmware, test with mock data, test components in isolation
- Day 3: Once Backend Dev 1 finishes, integrate with real server and verify

**Success Criteria:**
- [ ] Firmware compiles without errors
- [ ] DHT11 reads successfully (temperature, humidity valid)
- [ ] LDR detects daylight transition correctly
- [ ] Edge computing logic: transmits daytime, skips nighttime
- [ ] JSON payload construction correct (matches Backend Dev 1 spec)
- [ ] HTTP POST to Backend (with credentials from Backend Dev 1) returns 200

---

#### 2B. Frontend Developer

**What they need from Backend Dev 1:**
- API endpoints (GET /api/sensors, GET /api/sensors/{id}/data, GET /api/health)
- Response schema (JSON structure, field names, data types)
- Expected error codes (400, 404, 500)

**What they do NOT need to wait for:**
- ✅ Can build entire dashboard with MOCK data (hardcoded JSON fixtures)
- ✅ Can develop UI components, charts, filtering
- ✅ Can write unit tests with mocked API responses
- ✅ Can test on own computer without backend running

**Can work in parallel with Backend Dev 1?** YES ✅  
- Days 1-2: Build dashboard UI, mock data, unit tests (NO backend needed)
- Day 3: Once Backend Dev 1 finishes, replace mock API with live API calls

**Success Criteria:**
- [ ] Dashboard displays 5 sensor nodes with location names and statuses
- [ ] Charts render temperature, humidity, light levels
- [ ] Filtering by location works
- [ ] Real-time update mechanism ready (polling or WebSocket)
- [ ] Mock data tests passing
- [ ] Can switch to live Backend API with environment variable

---

### PHASE 3: Backend Developer 2 (After Backend Dev 1)

**Duration:** 2-3 days  
**Can start after:** Backend Dev 1 creates database schema  
**Needs:** Direct database access from Backend Dev 1  
**Blocks:** Nothing (independent work, feeds into Backend Dev 1's health endpoint)  

**What they need from Backend Dev 1:**
- Database credentials (user, password, host, database name)
- Schema documentation (sensors table, sensor_data table, column names)
- Sample query examples (how to retrieve time-series data)

**What they can do in parallel with Backend Dev 1:**
- ✅ Write alert logic code (temperature checks, offline detection)
- ✅ Write aggregation queries (not yet executed)
- ✅ Write unit tests (with mocked database)
- ✅ Design alert JSON schema

**Can work in parallel with Backend Dev 1?** MOSTLY  
- Days 1-2: Write and unit test processing logic, design alert format (NO live DB needed)
- Days 2-3: Once Backend Dev 1 provides DB credentials, integrate and test with live data

**Success Criteria:**
- [ ] Data processor reads from sensor_data table successfully
- [ ] Temperature alert triggers when temp > 35°C
- [ ] Offline alert triggers when last_transmission > 30 min (daytime)
- [ ] Hourly aggregation job runs without errors
- [ ] Alerts persisted in database
- [ ] WebSocket broadcasts alerts to Frontend in real-time
- [ ] Health metrics endpoint returns accurate data

---

### PHASE 4: Arduino Assembler (LAST - All pieces must be ready)

**Duration:** 3-5 days (1-2 hours per node)  
**Can start after:** Arduino IDE Dev + Backend Dev 1 complete  
**Blocks:** Deployment  
**Needs:**
- Firmware from Arduino IDE Developer (ready to flash)
- Backend server running from Backend Developer 1
- Confirmed API endpoint + port

**What they cannot start until:**
- ❌ Firmware is final (can't assemble hardware for untested firmware)
- ❌ Backend server is running (need to test data transmission)
- ❌ Backend is confirmed operational

**Can do in advance:**
- ✅ Procure hardware components (BOM ordering)
- ✅ Prepare workspace (tools, breadboards, multimeters)
- ✅ Review wiring diagrams and assembly instructions
- ✅ Prepare waterproof enclosures

**Success Criteria:**
- [ ] All 5 nodes assembled with correct wiring
- [ ] All 5 nodes programmed with unique IDs (001-005)
- [ ] All 5 nodes boot successfully
- [ ] All 5 nodes connect to farm WiFi
- [ ] All 5 nodes successfully transmit to Backend
- [ ] Backend Dashboard shows all 5 locations online
- [ ] Frontend displays all 5 locations with live data
- [ ] Daytime filtering verified (nighttime gaps visible)
- [ ] 30-minute stability test passes

---

## Detailed Work Sequence Chart

```
Week 1:

DAY 1-2: BACKEND DEV 1 (Lead)
├─ Set up PostgreSQL + TimescaleDB
├─ Create schema (sensors + sensor_data tables)
├─ Build Express/Flask server with /api/sensors/data endpoint
├─ Test with Postman or curl
└─ → UNBLOCKS everyone else

DAY 1-2: ARDUINO IDE DEV (Parallel, can start immediately)
├─ Read Backend Dev 1's initial spec (what will the API look like?)
├─ Create mock (fake) Backend server for local testing
├─ Write firmware with DHT11 + LDR drivers
├─ Test sensors in isolation (no WiFi needed yet)
└─ → Waiting for Backend Dev 1 to finish Phase 1

DAY 1-2: FRONTEND DEV (Parallel, can start immediately)
├─ Read Backend Dev 1's initial API spec
├─ Create mock API data (hardcoded JSON fixtures)
├─ Build React/Vue dashboard UI component
├─ Render test charts with mock data
├─ Unit test dashboard component
└─ → Waiting for Backend Dev 1 to provide live API URL

DAY 3: BACKEND DEV 1 (Final touches)
├─ Complete error handling
├─ Add request logging
├─ Document API (Swagger)
├─ Share server IP:3000 with team
└─ → READY FOR PHASES 2B, 3, 4

DAY 3: ARDUINO IDE DEV (Integration)
├─ Receive live server URL from Backend Dev 1
├─ Update firmware with actual endpoint IP:port
├─ Test real HTTP POST to Backend server
├─ Verify Backend receives valid JSON
├─ → FIRMWARE READY FOR ASSEMBLER

DAY 3: FRONTEND DEV (Integration)
├─ Receive live API endpoint from Backend Dev 1
├─ Replace mock API with real HTTP calls
├─ Integration test: fetch real sensors from Backend
├─ Verify charts update with live data
├─ → DASHBOARD READY FOR END-TO-END TESTING

DAY 4-5: BACKEND DEV 2 (Independent)
├─ Receive database credentials from Backend Dev 1
├─ Write alert processing logic
├─ Connect to live sensor_data table
├─ Test anomaly detection (temp alerts, offline alerts)
├─ Set up WebSocket for real-time alerts
└─ → ALERTS READY, FEEDS INTO FRONTEND

DAY 5-7: ARDUINO ASSEMBLER (Final assembly + testing)
├─ Receive firmware from Arduino IDE Dev
├─ Build 5 nodes (1-2 hours each)
├─ Flash each with unique Sensor ID
├─ Test each node's WiFi + Backend transmission
├─ Deploy to farm locations
└─ → SYSTEM LIVE
```

---

## Critical Path (What Cannot Be Delayed)

```
Must complete IN SEQUENCE:

Backend Dev 1 Phase 1 ────→ ┬─→ Arduino IDE Dev (firmware ready)
                            ├─→ Frontend Dev (API calls working)
                            ├─→ Backend Dev 2 (database access)
                            └─→ Arduino Assembler (all 5 nodes tested)
```

**If Backend Dev 1 is delayed by 1 day:**
- Arduino IDE Developer 1-day delay
- Frontend Developer can still work (using mock data, but will delay integration)
- Backend Developer 2 is delayed
- Arduino Assembler is delayed
- **Total project delay: 1+ days**

**If Arduino IDE Developer is delayed by 1 day:**
- Arduino Assembler is delayed (needs firmware)
- Frontend can still be tested without firmware
- **Total project delay: 1 day**

**If Frontend Developer is delayed by 1 day:**
- No impact (assembler and backend don't need frontend)
- End-to-end testing delayed, but not critical path
- **Total project delay: 0 days** (parallel work)

---

## Parallel Work Opportunities

### Can start WITHOUT waiting:

| Person | Can Start Without | What To Do First |
|--------|-------------------|-----------------|
| Arduino IDE Dev | Backend Dev 1 finish | Write firmware with mock data, test sensors locally |
| Frontend Dev | Backend Dev 1 finish | Build UI with mock JSON, unit tests |
| Backend Dev 2 | Backend Dev 1 finish | Write alert logic, unit tests with mocked DB |
| Assembler | Arduino IDE Dev finish | Procure components, review diagrams, prepare workspace |

### Should wait for:

| Person | Blocks On | Reason |
|--------|-----------|--------|
| Arduino IDE Dev | Backend Dev 1 API spec | Need endpoint URL, payload format |
| Frontend Dev | Backend Dev 1 API spec | Need endpoint definitions, response schema |
| Backend Dev 2 | Backend Dev 1 DB | Need live credentials, schema documentation |
| Assembler | Arduino IDE Dev firmware | Need final .ino file to flash |
| Assembler | Backend Dev 1 server | Need to verify data transmission works |

---

## Daily Standup Checklist

### Day 1-2 (Backend Dev 1 + Parallel)

**Backend Dev 1:**
- [ ] PostgreSQL database created
- [ ] sensors table created (5 rows pre-populated)
- [ ] sensor_data hypertable created (TimescaleDB indexed)
- [ ] Express/Flask server boots, responses to curl requests
- [ ] Can insert test data via HTTP POST (returns 200)

**Arduino IDE Dev (Parallel - can work independently):**
- [ ] Firmware compiles without errors
- [ ] DHT11 library installed, test sketch working
- [ ] LDR threshold calibrated (300 for daytime)
- [ ] Edge computing logic in code
- [ ] Mock HTTP POST test working locally

**Frontend Dev (Parallel - can work independently):**
- [ ] Dashboard component created, renders
- [ ] Mock sensor data defined (5 nodes)
- [ ] Charts render with mock data
- [ ] Filtering UI works
- [ ] Unit tests written and passing

### Day 3 (Integration Points)

**Backend Dev 1:**
- [ ] Server IP:port finalized (192.168.1.100:3000)
- [ ] API documentation complete
- [ ] Database credentials shared with Backend Dev 2
- [ ] Error handling working (400, 404, 500)

**Arduino IDE Dev:**
- [ ] Firmware accepts Backend server IP as parameter
- [ ] Real HTTP POST to Backend Dev 1's server returns 200
- [ ] Backend Dev 1 confirms data in database
- [ ] Ready to hand off to Assembler

**Frontend Dev:**
- [ ] API client updated with live Backend URL
- [ ] Fetch /api/sensors return 5 nodes
- [ ] Charts update with real data
- [ ] WebSocket connection for alerts (or polling fallback)
- [ ] Ready for full testing

**Backend Dev 2:**
- [ ] Alert logic unit tests passing
- [ ] Schema queries working
- [ ] Aggregation jobs scheduled

### Day 4-5 (Assembly & E2E)

**Arduino Assembler:**
- [ ] All 5 nodes physically assembled
- [ ] Each node has unique Sensor ID (001-005)
- [ ] Each node boots and connects to WiFi
- [ ] Each node transmits data to Backend
- [ ] ✅ Backend dashboard shows all 5 nodes online
- [ ] ✅ Frontend displays all 5 locations correctly
- [ ] ✅ Nodes deployed to farm locations

---

## Handoff Checklist: Backend Dev 1 → Others

**When Backend Dev 1 completes, they must provide:**

- [ ] API endpoint URL: `http://192.168.1.100:3000`
- [ ] API documentation (Swagger or markdown)
- [ ] Example curl commands for each endpoint
- [ ] Expected response JSON (all fields, data types)
- [ ] Database credentials: username, password, host, port, database name
- [ ] Schema SQL file (can be re-run for verification)
- [ ] Sample test data (5 pre-configured sensors)
- [ ] Server status check: `curl http://192.168.1.100:3000/api/health`

**Verification before handoff:**
- [ ] Server is running (endpoint responds)
- [ ] Database connected (tables accessible)
- [ ] Test POST works (data inserts correctly)
- [ ] All 5 sensors visible: `curl http://192.168.1.100:3000/api/sensors`

---

## What Each Person Should Do TODAY

### If you are **Backend Developer 1:** START NOW ✅
1. Create PostgreSQL database
2. Write schema.sql
3. Start Express/Flask server
4. Implement POST /api/sensors/data endpoint
5. Test with Postman

### If you are **Arduino IDE Developer:** START WITH MOCK DATA ✅
1. Read Backend Dev 1's INITIAL spec (what fields will you need?)
2. Create mock HTTP server on your laptop (simple Node.js or Python)
3. Write firmware with DHT11 + LDR drivers
4. Implement JSON payload construction
5. Test POST requests to YOUR mock server

### If you are **Frontend Developer:** START WITH MOCK DATA ✅
1. Read Backend Dev 1's INITIAL spec (what endpoints will exist?)
2. Create hardcoded mock JSON fixtures (5 nodes with sample data)
3. Build React/Vue Dashboard component
4. Implement charts, filtering, real-time updates
5. Write unit tests (mocked API responses)

### If you are **Backend Developer 2:** START WITH LOGIC ✅
1. Read Backend Dev 1's database schema (when available)
2. Design alert detection rules (temperature ranges, offline thresholds)
3. Write alert logic functions (with unit tests, mocked DB)
4. Design WebSocket message format
5. Plan aggregation job structure

### If you are **Arduino Assembler:** PREPARE NOW ✅
1. Order components from BOM (1-2 week lead time)
2. Prepare workspace (tools, breadboards, multimeters)
3. Read the Arduino_Assembler.md documentation
4. Review wiring diagrams
5. Download latest Arduino IDE on your machine

---

## Summary: Work Sequence

```
FIRST:   Backend Developer 1 (ALL OTHERS WAIT)
         ↓ (unblocks after 2-3 days)

SECOND:  Arduino IDE Dev + Frontend Dev + Backend Dev 2 (PARALLEL)
         ↓ (all ready after 3-5 days)

THIRD:   Arduino Assembler (LAST, uses outputs from all 3 above)
         ↓ (assembly + testing 3-5 days)

RESULT:  5 Nodes Online + Dashboard Live + Data Flowing (Week 1-2)
```

