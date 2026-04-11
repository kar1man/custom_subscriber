# Frontend Developer: Smart Agriculture IoT Dashboard

## Architecture Overview: STAR TOPOLOGY DASHBOARD

**YOUR ROLE:** Build a **single unified dashboard** that displays data from all **5 Arduino sensor nodes** connected to **ONE central Backend server**.

```
Windows/Mac/Linux Browser
           │
           ▼
    ┌──────────────┐
    │   Frontend   │
    │  Dashboard   │     Displays data from:
    │  (React/Vue/ │     • Node 001 (North_Field)
    │   Angular)   │     • Node 002 (Tomato_Greenhouse)
    │              │     • Node 003 (East_Garage)
    └──────┬───────┘     • Node 004 (South_Storage)
           │             • Node 005 (West_Shed)
    Uses  │ GET /api endpoints
   REST API
           ▼
    ┌──────────────────┐
    │  Backend Server  │
    │  192.168.1.100   │
    │  port 3000       │
    │                  │
    │  Receives from   │
    │  ALL 5 Arduinos  │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────┐
    │   Database   │
    │  (ONE DB)    │
    │  Consolidated
    │  data from   │
    │  5 locations │
    └──────────────┘
```

## Role Overview
You are building the **web-based monitoring dashboard** for the smart farm network. Your responsibility is to create a real-time, responsive interface where farm operators can view sensor data (temperature, humidity, light levels) from **all 5 field locations** in one place and understand the health of the crop ecosystem.

The dashboard receives data from **ONE Backend server** that consolidates inputs from all **5 Arduino nodes** deployed across the farm.

---

## Your Responsibilities

### 1. **Dashboard UI / UX Design**
- **Responsive Layout:** Works on desktop, tablet, and mobile browsers
- **Sensor Node Status Board:**
  - Display all active sensor nodes with their **unique IDs** and **Location Names** (e.g., "North_Field", "East_Greenhouse", "Tomato_Greenhouse")
  - Show online/offline status indicator (green = online, red = offline, gray = no recent transmission)
  - Last data transmission timestamp (e.g., "2 minutes ago")
  - Signal strength or connection quality indicator

- **Real-Time Data Visualization:**
  - Temperature chart: line graph showing last 24 hours with scrolling (one chart per location)
  - Humidity gauge or line graph
  - Light level indicator (shows if sensor detects daytime or nighttime)
  - Current readings displayed prominently with units (°C, %, LUX)

- **Alert Notifications:**
  - Display temperature out-of-range warnings (e.g., "Tomato_Greenhouse temp > 35°C")
  - Show sensor offline alerts
  - Notification history panel

- **Filtering & Navigation:**
  - Filter by location (multi-select dropdown or toggle buttons)
  - Date range picker for historical data review
  - Real-time toggle: switch between live streaming and historical view

### 2. **Backend API Integration**
You will consume REST APIs provided by **Backend Developer 1**. Required endpoints:

```
GET /api/sensors
  Response: [
    { id: "001", location: "North_Field", online: true, last_transmission: "2026-03-31T14:23:00Z" },
    { id: "002", location: "Tomato_Greenhouse", online: true, last_transmission: "2026-03-31T14:22:45Z" },
    ...
  ]

GET /api/sensors/{sensor_id}/data?start_time=&end_time=&limit=100
  Response: [
    { timestamp: "2026-03-31T14:23:00Z", temperature: 24.5, humidity: 65, light_level: 800, is_daytime: true },
    { timestamp: "2026-03-31T14:18:00Z", temperature: 24.3, humidity: 64, light_level: 750, is_daytime: true },
    ...
  ]

GET /api/sensors/metadata
  Response: { locations: ["North_Field", "Tomato_Greenhouse"], sensor_count: 5, network_status: "healthy" }

WS /api/events (or GET /api/events/stream for long-polling)
  Real-time alerts: { event_type: "temperature_alert", sensor_id: "001", value: 36.2, threshold: 35, timestamp: "..." }
```

You are responsible for:
- HTTP GET requests to fetch sensor list and historical data
- WebSocket OR polling connection to receive alerts in real-time
- Error handling: network timeouts, 404 responses, invalid JSON
- Request/response interceptor for debugging (log all API calls)

### 3. **Mock Data Development**
While Backend Developers are building their server, you should develop with **mock data** to avoid blocking:
- Create JavaScript/JSON fixtures for sensor nodes and time-series data
- Simulate real-time updates by pushing mock data every 5 seconds
- Use a state management library (Redux, Zustand, Vuex) to manage mock data like a real API would

### 4. **Integration Testing**
- Unit tests for API client functions (mocked HTTP responses)
- Integration tests: verify dashboard re-renders when mock data updates
- Manual testing with Backend API once server is ready (Phase 4)
- Test with multiple simultaneous sensor nodes (5+ locations)

### 5. **Performance & UX Polish**
- Chart rendering optimization: lazy-load historical data, limit chart points to ~1000
- Debounce API requests when user filters/selects data
- Show loading spinners during API calls
- Responsive breakpoints: optimize for mobile (< 768px), tablet (768-1024px), desktop (> 1024px)
- Accessibility: ARIA labels, keyboard navigation, color contrast compliance (WCAG AA)

---

## Deliverables Checklist

- [ ] **Dashboard Component** (`Dashboard.vue` / `Dashboard.jsx` / `Dashboard.tsx`)
  - Displays all 5 sensor nodes with location names and statuses
  - Renders real-time charts (temperature, humidity, light)
  - Includes filtering/date range controls
  
- [ ] **API Client** (`apiClient.ts` / `api.js`)
  - Functions: `fetchSensors()`, `fetchSensorData(id, timeRange)`, `subscribeToAlerts(callback)`
  - Error handling and retry logic
  - Request logging for debugging

- [ ] **Mock Data Provider** (`mockData.ts` / `mockData.js`)
  - Sensor node fixtures (5 locations with unique IDs)
  - Time-series data samples (temperature ranges 15-35°C, humidity 30-90%)
  - Simulated real-time updates

- [ ] **Unit Tests** (`Dashboard.test.tsx`)
  - Test chart rendering with mock sensor data
  - Test filtering by location
  - Test API error handling (network timeout, invalid response)

- [ ] **Integration Tests** (`integration.test.ts`)
  - Test end-to-end: fetch sensors → display nodes → click filter → re-render
  - Mock HTTP responses using `jest` or `vitest`

- [ ] **README** (`FRONTEND_README.md`)
  - Setup instructions: `npm install`, `npm run dev`
  - Environment variables (Backend API URL)
  - Testing instructions
  - Known limitations and future enhancements

- [ ] **Wireframe/Design Document** (optional but recommended)
  - Low-fidelity sketches of dashboard layout
  - Color scheme (suggest: green for healthy, yellow for warning, red for critical)

---

## Tech Stack Recommendations

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | React 18+ / Vue 3+ / Angular 16+ | React: largest ecosystem; Vue: simpler learning curve; Angular: full-stack framework |
| **State Management** | Zustand / Redux Toolkit / Vuex | Manage API response caching, real-time updates, UI state |
| **Charting** | Chart.js / Recharts / ECharts | Recharts (React): easy to integrate; ECharts: highly customizable |
| **HTTP Client** | Axios / Fetch + TanStack Query | Axios: simpler; TanStack Query: automatic caching, retry, polling |
| **Styling** | Tailwind CSS / Material-UI / Bootstrap 5 | Tailwind: utility-first, lightweight; MUI: polished components |
| **Testing** | Vitest + React Testing Library | Fast execution, good API coverage |
| **Build Tool** | Vite / Next.js / Create React App | Vite: fastest build; CRA: easiest setup |

---

## Dependencies & Blockers

| Dependency | From | What You Need | When |
|---|---|---|---|
| **API Contract** | Backend Dev 1 | Exact endpoint URLs, request/response JSON schema | **Phase 1 (earliest)** — start development with mock data |
| **Sensor Metadata Schema** | Backend Dev 1 | Location names, Sensor ID format, is_daytime field meaning | **Phase 1** |
| **Alert Event Format** | Backend Dev 2 | JSON structure for real-time alerts (temperature_alert, offline_alert, etc.) | **Phase 2** |
| **Server Endpoint** | Backend Dev 1 | Live Backend API URL for Phase 4 integration testing | **Phase 3 end** |

### How to Unblock Yourself
1. **Phase 1-2:** Use mock data. Define mock API responses matching the expected Backend schema.
2. **Phase 3:** Create a `BACKEND_API_URL` environment variable. Frontend can switch between mock and live API with one env var change.
3. **Phase 4:** Backend Devs provide live server URL. Update env var, run dashboard integration tests.

---

## Integration with Other Roles

### → Backend Developer 1
**You provide:** REST API endpoints for sensor list, historical data, metadata  
**You receive:** Dashboard feedback on what fields/format are most useful (e.g., "we need a total_transmissions_today field")  
**Sync point:** Phase 1 spec meeting to finalize API contract

### → Backend Developer 2
**You provide:** Alert event format (WebSocket payload structure)  
**You receive:** Real-time alert data via WebSocket  
**Sync point:** Phase 2, after Backend Dev 1 finalizes server setup

### → Arduino Developers (Independent)
You don't directly depend on their work, but you should understand:
- Sensor nodes send JSON payloads with `sensor_id`, `location`, `temperature`, `humidity`, and `is_daytime`
- Only daytime data is transmitted (edge computing), so nighttime appears as "no transmissions" in your dashboard

---

## Testing Strategy

### Phase 1-3: Local Testing with Mock Data
```javascript
// mockData.ts example
export const mockSensors = [
  { id: "001", location: "North_Field", online: true, last_transmission: "2026-03-31T14:23:00Z" },
  { id: "002", location: "Tomato_Greenhouse", online: true, last_transmission: "2026-03-31T14:22:45Z" },
  // ... 5 nodes total
];

export const mockSensorData = {
  "001": [
    { timestamp: "2026-03-31T14:23:00Z", temperature: 24.5, humidity: 65, light_level: 800, is_daytime: true },
    // ... 48 data points for 4 hours
  ]
};
```

### Phase 4: Integration Testing with Live Backend
```bash
# Set backend URL
export REACT_APP_BACKEND_URL=http://localhost:3000

# Run tests against live server
npm run test:integration
```

### Acceptance Criteria
- [ ] Dashboard loads within 3 seconds
- [ ] Real-time graphs update within 1 second of data transmission
- [ ] Filtering by location works correctly (only shows selected locations)
- [ ] Clicking a sensor node shows its full 24-hour history
- [ ] Temperature out-of-range alert appears within 2 seconds
- [ ] Mobile view usable on iPhone 12 (375px width)
- [ ] All API errors handled gracefully (user sees error message, not crash)

---

## Notes & Considerations

1. **Timezone Handling:** All timestamps from Backend should be in **UTC**. Convert to local time in your UI using `dayjs` or `date-fns` libraries.

2. **Performance:** With 5+ sensor nodes transmitting every 5 seconds (daytime only), you could see ~3000 data points per day per node. Implement historical data pagination (load only last 24 hours by default).

3. **Real-Time Strategy:** 
   - **Option A (Recommended):** WebSocket connection for alerts + polling (GET) every 5 seconds for data. Simpler and more reliable.
   - **Option B:** Pure WebSocket for all data. More efficient but requires Backend infrastructure.

4. **Daytime Data Only:** Your dashboard will show "gaps" at night (3 AM - 6 AM) when no data is transmitted. This is **expected and correct** — it's the edge computing benefit. Add a note in UI: "No transmissions detected (likely nighttime)."

5. **Future Enhancements (Out of Scope for MVP):**
   - Historical data export (CSV)
   - Custom alert threshold settings
   - Predictive analytics (recommend harvesting based on data trends)
   - Multi-user roles (admin, viewer, editor)

---

## Success Criteria (Definition of Done)

You're done when:
1. Dashboard displays 5 sensor nodes with correct location names
2. Real-time temperature/humidity graphs update smoothly with mock data
3. Filtering by location correctly shows/hides nodes
4. API client is tested (mocked HTTP responses)
5. Integration tests pass with live Backend in Phase 4
6. Mobile responsive layout verified on actual device or browser devtools
7. README documents all setup steps and known limitations
8. Code is peer-reviewed by Backend Dev 1 (API contract validation)

---

## Questions for Backend Developers

Confirm with **Backend Dev 1** before Phase 2:
1. What time interval should historical data use? (1 minute, 5 minutes, hourly aggregates?)
2. Are sensor locations fixed or can they change? (design implications for caching)
3. Should `light_level` be in LUX, percentage, or raw ADC value?
4. What format for timestamps: ISO 8601 UTC strings or Unix epoch?
5. Will you provide a GraphQL API or REST-only? (affects data fetching efficiency)

---

## Quick Start Template

```bash
# Create React + TypeScript project with Vite
npm create vite@latest smart-farm-frontend -- --template react-ts
cd smart-farm-frontend

# Install dependencies
npm install axios chart.js react-chartjs-2 tailwindcss zustand

# Start dev server
npm run dev

# Create mock API layer
touch src/services/mockApi.ts
touch src/components/Dashboard.tsx
touch src/types/sensor.ts

# Define API response types
# Start building Dashboard with mock data
```

