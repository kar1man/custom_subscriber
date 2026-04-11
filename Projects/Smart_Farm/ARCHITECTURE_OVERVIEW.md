# Smart Agriculture IoT Network: Architecture Overview

## Executive Summary: Star Topology Network

**This project implements a STAR TOPOLOGY IoT network:**
- **5 Arduino IoT devices** at 5 different farm locations (sensors)
- **1 Central Backend Server** (data hub and processing center)
- **1 Frontend Dashboard** (unified monitoring interface)

**Data Flow:** 5 Sensors → 1 Server → 1 Dashboard

---

## Network Architecture

### High-Level Diagram

```
                         INTERNET/GATEWAY
                                │
                    ┌───────────┴───────────┐
                    │                       │
        ┌───────────────────┐     ┌──────────────────────┐
        │  WiFi Router      │     │  Backend Server      │
        │  (Farm Network)   │     │  192.168.1.100:3000  │
        │                   │     │                      │
        │  Connected to:    │     │  PostgreSQL Database │
        │  • All 5 Arduinos │     │  Contains all farm   │
        │  • Backend Server │     │  sensor data from    │
        └─────────┬─────────┘     │  5 locations        │
                  │               │                      │
        ┌─────────┼──────────────→│  Central hub for:    │
        │         │               │  • Data collection   │
        │ ┌───────┴───────┐       │  • Processing        │
        │ │               │       │  • Real-time alerts  │
        │ ▼               ▼       │  • API responses     │
        ┌──────┐  ┌──────┐        └──────────┬───────────┘
        │Ardui.│  │Ardui.│               ▲   │
        │ 001  │  │ 002  │               │   │ Frontend
        │North_│  │Tom._ │          REST API │ reads data
        │Field │  │Green.│               │   │
        └──┬───┘  └───┬──┘               │   │
           │          │              ┌───┴───┴────┐
        ┌──┴────┐  ┌──┴────┐         │  Frontend  │
        │Ardui. │  │Ardui. │         │ Dashboard  │
        │ 003   │  │ 004   │         │ (React/Vue)│
        │East__ │  │South_ │         │            │
        │Garage │  │Storage│         │ Shows all  │
        └───┬───┘  └───┬───┘         │ 5 locations│
            │          │             │ in one view│
            │          │             └────────────┘
         ┌──┴──┐       │
         │Ardui│       │
         │ 005 │   ────┘
         │West_│─→ HTTP POST to same Backend Server
         │Shed │   (192.168.1.100:3000)
         └─────┘
```

### Network Topology Type: **STAR**

```
Traditional Star Topology Diagram:

            Central Backend Server
                    │
        ┌───────┬───┼───┬───────┐
        │       │   │   │       │
    Node-1  Node-2 │ Node-3  Node-4
                Node-5

All nodes connect ONLY to center.
No direct node-to-node communication.
```

---

## Hardware Components

### 5 Arduino IoT Nodes (Identical Hardware, Different Locations)

Each node contains:
- **Arduino Mega 2560** (microcontroller)
- **DHT11** sensor (temperature & humidity)
- **LDR** (light sensor for daytime detection)
- **WiFi Shield** (connects to farm WiFi network)
- **5V Power Supply** (USB or solar + battery)
- **Waterproof enclosure** (IP65 rated)

### Node Locations & IDs

| Node ID | Location | Function |
|---------|----------|----------|
| 001 | North_Field | Monitor main crop field |
| 002 | Tomato_Greenhouse | Monitor controlled greenhouse |
| 003 | East_Garage | Reference climate readings |
| 004 | South_Storage | Temperature control validation |
| 005 | West_Shed | Alternative microclimate data |

### 1 Central Backend Server

**Runs on:**
- Linux/Windows/Mac machine (laptop, RaspberryPi, or cloud VM)
- **IP Address:** 192.168.1.100
- **Port:** 3000 (REST API)
- **Database:** PostgreSQL with TimescaleDB

**Responsibilities:**
- Listens for HTTP POST from all 5 Arduino nodes
- Stores all sensor data in ONE database
- Exposes REST API for Frontend Dashboard
- Triggers real-time alerts
- Processes edge computing validation

### 1 Frontend Dashboard

**Runs on:**
- Web browser (Chrome, Firefox, Safari)
- Accessible from any computer/phone on farm network
- URL: `http://192.168.1.100:3000/dashboard`

**Displays:**
- Data from **all 5 locations** in unified view
- Real-time temperature, humidity, light levels
- Sensor status (online/offline)
- Alert notifications
- Historical trends

---

## Communication Protocol

### WiFi Network Connection

**All 5 Arduino nodes:**
- Connect to same farm WiFi network (SSID: "FarmNetwork")
- Use identical login credentials
- Obtain IP addresses from DHCP (192.168.1.101-192.168.1.105)

### HTTP Communication (Arduino → Backend)

**All 5 Arduino nodes POST to SAME endpoint:**

```
HTTP POST http://192.168.1.100:3000/api/sensors/data

Request Body (identical format, different sensor_id):
{
  "sensor_id": "001",          ← Different per node
  "location": "North_Field",   ← Different per node
  "temperature": 24.5,
  "humidity": 65,
  "light_level": 850,
  "is_daytime": true,
  "timestamp": "2026-03-31T14:23:00Z"
}

Frequency: Every 5 seconds (daytime only, due to edge computing)
```

### REST API (Frontend ← Backend)

**All data from all 5 nodes served via ONE API:**

```
GET /api/sensors
Response: List of all 5 nodes with metadata

GET /api/sensors/{sensor_id}/data
Response: Historical data for specific location

GET /api/health
Response: Network health (all 5 nodes online/offline status)
```

---

## Data Flow: Complete Journey

```
TIME: 2:00 PM

┌──────────────┐
│ Arduino 001  │ Reads: temp=24.5°C, humidity=65%, light=850 (DAYTIME)
│ North_Field  │
└────────┬─────┘
         │ checks: is_daytime? YES (light > 300)
         │
         ▼ (edge computing decision: TRANSMIT)
    
    HTTP POST to 192.168.1.100:3000/api/sensors/data
         │
         ▼
    
    ┌─────────────────────────────┐
    │ Backend Server              │
    │ • Receives JSON             │
    │ • Validates data            │
    │ • Inserts into database     │
    │ • Returns 200 OK            │
    └───┬─────────────────────────┘
        │
        ▼
    
    ┌─────────────────────────────┐
    │ PostgreSQL Database         │
    │ sensor_data table:          │
    │ sensor_id  | temperature    │
    │ -----------|----------      │
    │ 001        | 24.5°C         │ ← Data from Node 001
    │ 002        | 26.1°C         │ ← Data from Node 002 
    │ 003        | 22.3°C         │ ← Data from Node 003
    │ 004        | 23.8°C         │ ← Data from Node 004
    │ 005        | 21.5°C         │ ← Data from Node 005
    │ ...        | ...            │
    └───┬─────────────────────────┘
        │
        ▼ (Backend Dev 2 processor)
    
    Real-time alert check:
    - Is temp for any node out of range? 
    - Are any nodes offline?
    
        │
        ▼
    
    ┌─────────────────────────────┐
    │ Frontend Dashboard          │
    │ • Fetches GET /api/sensors  │
    │ • Displays all 5 nodes      │
    │ • Shows temperature charts  │
    │ • Updates every 5 seconds   │
    │                             │
    │ North_Field:  24.5°C ✓      │
    │ Tomato_GH:    26.1°C ✓      │
    │ East_Garage:  22.3°C ✓      │
    │ South_Store:  23.8°C ✓      │
    │ West_Shed:    21.5°C ✓      │
    └─────────────────────────────┘
    
    All 5 locations visible on ONE dashboard!
```

---

## Edge Computing (Daytime Filtering)

**All 5 nodes implement same edge computing logic:**

```
Every 5 seconds:
  1. Read LDR (light sensor)
  2. If LDR > 300 (daytime):
     ├─ Flag: is_daytime = true
     ├─ Read DHT11
     ├─ Send HTTP POST to Backend
     └─ Log: "Data transmitted"
  
  3. If LDR ≤ 300 (nighttime):
     ├─ Flag: is_daytime = false
     ├─ Skip transmission
     └─ Log: "Skipping (nighttime)"
```

**Result:** All 5 nodes transmit during day (6 AM - 8 PM), skip at night (8 PM - 6 AM).

**Backend sees:** Only daytime data in database. Dashboard shows gaps at night (expected). No wasted bandwidth.

---

## Database Schema (ONE Centralized Database)

All 5 nodes write to same tables:

### Table: sensors (Metadata)
```
sensor_id | location | created_at | last_transmission | is_active
----------|----------|------------|-------------------|----------
001       | North_Field | 2026-01-01 | 2026-03-31 14:23 | true
002       | Tomato_Greenhouse | 2026-01-01 | 2026-03-31 14:22 | true
003       | East_Garage | 2026-01-01 | 2026-03-31 14:20 | true
004       | South_Storage | 2026-01-01 | 2026-03-31 14:19 | true
005       | West_Shed | 2026-01-01 | 2026-03-31 14:15 | true
```

### Table: sensor_data (Time-Series Data - ALL 5 NODES)
```
time | sensor_id | temperature | humidity | light_level | is_daytime
-----|-----------|-------------|----------|-------------|----------
2026-03-31 14:23 | 001 | 24.5 | 65 | 850 | true
2026-03-31 14:23 | 002 | 26.1 | 72 | 900 | true
2026-03-31 14:23 | 003 | 22.3 | 60 | 820 | true
2026-03-31 14:23 | 004 | 23.8 | 68 | 880 | true
2026-03-31 14:23 | 005 | 21.5 | 55 | 760 | true
2026-03-31 14:18 | 001 | 24.3 | 64 | 800 | true  ← Data from same node, earlier
2026-03-31 14:18 | 002 | 25.9 | 71 | 880 | true
... (thousands of rows, all 5 nodes consolidated)
```

---

## Key Characteristics of This Architecture

| Characteristic | Implementation |
|---|---|
| **Topology Type** | Star (5 edge nodes → 1 central hub) |
| **Data Collection** | Centralized (single database, one location) |
| **Processing** | Centralized (backend processes all 5 node streams) |
| **Redundancy** | None (single point of failure = backend server) |
| **Scalability** | Easy to add Node 6, 7, etc. (all connect to same server) |
| **Communication** | HTTP POST (one-way: Arduino → Backend) |
| **Latency** | Low (all nodes on local farm WiFi network) |
| **Data Sync** | Real-time (wireless, no delay) |
| **Failure Mode** | If backend fails: all 5 nodes stop sending, frontend goes offline |

---

## Deployment Map

```
Farm Layout (Bird's Eye View):

                            ┌─ WiFi Router ─┐
                            │   (Kitchen)   │
                            └────────┬──────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        │             ┌──────────────┘──────────────┐             │
        │             │                             │             │
    ┌───▼───┐    ┌────▼─────┐             ┌────────▼────┐    ┌───▼───┐
    │Node005│    │Node001    │             │   Node002   │    │Node003│
    │West   │    │North      │             │Tomato       │    │East   │
    │Shed   │    │Field      │             │Greenhouse  │    │Garage │
    └───────┘    └───────────┘             └─────────────┘    └───────┘
        │              │                             │              │
        └──────────────┼─────────────────────────────┼──────────────┘
                       │         WiFi Signal         │
                       └───────────┬──────────────────┘
                                   │
                        ┌──────────▼────────────┐
                        │  WiFi Router         │
                        │ 192.168.1.1          │
                        └──────────┬────────────┘
                                   │
                        ┌──────────▼────────────┐
                        │ Backend Server       │
                        │ 192.168.1.100:3000   │
                        │ PostgreSQL DB        │
                        └──────────┬────────────┘
                                   │
                        ┌──────────▼────────────┐
                        │ Frontend Dashboard   │
                        │ (Web browser)        │
                        │ All 5 locations      │
                        └──────────────────────┘

        ┌───▼───┐
        │Node004│
        │South  │
        │Storage│
        └───────┘

All nodes send to ONE backend server.
Backend stores ALL data.
Dashboard displays ALL 5 locations.
```

---

## Team Member Responsibilities in This Architecture

| Role | Responsibility |
|------|---|
| **Arduino IDE Dev** | Program firmware for all 5 nodes (identical code, different IDs) |
| **Arduino Assembler** | Build all 5 nodes, assign unique IDs (001-005), deploy to locations |
| **Backend Dev 1** | Build ONE central server that receives POSTs from all 5 nodes |
| **Backend Dev 2** | Process data from ONE database (all 5 nodes), trigger alerts |
| **Frontend Dev** | Build ONE dashboard that displays data from ONE backend API |

---

## Verification Checklist

- [ ] All 5 Arduinos configured with same Backend server IP (192.168.1.100)
- [ ] All 5 Arduinos configured with same Backend server port (3000)
- [ ] All 5 Arduinos have unique Sensor IDs (001-005)
- [ ] All 5 Arduinos have unique Location Names
- [ ] Central Backend server running on 192.168.1.100:3000
- [ ] PostgreSQL database contains 5 entries in sensors table
- [ ] All 5 Arduinos successfully POST to Backend
- [ ] Backend receives data from all 5 nodes
- [ ] Frontend Dashboard displays all 5 locations correctly
- [ ] No node-to-node communication (nodes only talk to Backend)
- [ ] Daytime filtering working (no nighttime transmissions visible)
- [ ] Frontend shows unified data from all 5 nodes on one page

---

## Configuration Example

### Arduino Firmware Configuration (Same Server IP:Port)

```cpp
// SAME for all 5 Arduinos:
const char* serverIP = "192.168.1.100";
const int serverPort = 3000;

// DIFFERENT per Arduino:
char SENSOR_ID[10] = "001";        // Change to 002, 003, 004, 005
char LOCATION_NAME[20] = "North_Field";  // Change per location
```

### Backend Server Configuration

```
Database: PostgreSQL
Host: localhost
Port: 5432
Database: smart_farm_dev
Sensors Table: 5 pre-registered sensors (IDs 001-005)
```

### Frontend Configuration

```
Backend API URL: http://192.168.1.100:3000
Fetch all sensors: GET /api/sensors
Fetch all data: GET /api/sensors/{id}/data
Display: All 5 locations in one unified dashboard
```

---

## Summary

✅ **This project IS a Star Topology network:**
- 5 Arduino sensor nodes at different farm locations
- 1 central backend server (single point of reference)
- 1 frontend dashboard (unified monitoring)
- All nodes connect only to the center hub
- All data consolidated in one database
- No direct node-to-node communication

✅ **All documentation reflects this architecture** with explicit callouts about:
- ONE central server
- Same IP:port for all nodes
- Centralized database
- Unified dashboard display

