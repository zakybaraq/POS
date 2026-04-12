# POS Application v2.0 Roadmap

**Status:** Planning  
**Version:** 2.0.0  
**Theme:** Real-time Notifications & Dashboard  
**Date:** 2026-04-13  
**Previous:** v1.0 Complete ✅

---

## Executive Summary

Build real-time notification system and advanced reporting dashboard to improve operational visibility and user experience. This milestone adds WebSocket capabilities for live updates and creates a comprehensive dashboard for monitoring restaurant operations in real-time.

---

## Phased Implementation Plan

### Phase 6: WebSocket Infrastructure & Order Notifications
**Priority:** HIGH | Effort: 5-6 days | Risk: Medium | **Status:** 📝 Planned

**Why:** Real-time updates improve kitchen efficiency and customer service by ensuring staff are immediately notified of order changes.

**Plans:**
- [ ] `06-01-PLAN.md` — WebSocket Server Setup with JWT Auth & Room Management
- [ ] `06-02-PLAN.md` — Order Notification Events & UI Integration

**Requirements:** WS-01, WS-02, WS-03, WS-04, WS-05, WS-06

#### 6.1 WebSocket Server Setup
**What:** Set up WebSocket server with authentication and connection management

**How:**
1. Add WebSocket dependency (Socket.io or Elysia WebSocket)
2. Configure WebSocket server in src/index.ts
3. Implement JWT authentication for connections
4. Create room/channel architecture (kitchen, cashier, admin)
5. Implement connection heartbeat/ping-pong
6. Add error handling and reconnection logic

**Files to create:**
- `src/websocket/index.ts` - WebSocket server setup
- `src/websocket/auth.ts` - JWT authentication middleware
- `src/websocket/rooms.ts` - Room management

**Files to modify:**
- `src/index.ts` - Add WebSocket registration
- `package.json` - Add WebSocket dependency

**Success Criteria:**
- WebSocket connections authenticate via JWT
- Clients can join appropriate rooms
- Connection stays alive with heartbeat
- Reconnection works on network failure

**Estimate:** 8 hours

---

#### 6.2 Order Notification Events
**What:** Broadcast order events to kitchen and cashier in real-time

**How:**
1. Create notification service in `src/services/notifications.ts`
2. Emit events on order lifecycle changes:
   - `order:created` → Kitchen room
   - `order:status-changed` → Kitchen, Cashier rooms
   - `order:completed` → Cashier room
   - `payment:received` → Cashier room
3. Include full order context in notifications
4. Add visual/audio indicator in UI

**Files to create:**
- `src/services/notifications.ts` - Notification service
- `src/websocket/events/order-events.ts` - Order event handlers

**Files to modify:**
- `src/routes/orders.ts` - Emit events on order changes
- `src/services/payment.ts` - Emit on payment completion
- `src/pages/kitchen.ts` - Subscribe to kitchen events
- `src/pages/pos.ts` - Subscribe to cashier events

**Success Criteria:**
- Kitchen receives new order notification within 1 second
- Order status updates sync across all connected clients
- Notifications include full order details
- Visual and audio alerts work in UI

**Estimate:** 10 hours

---

**Total Phase 6:** ~18 hours | Risk reduction: Medium | Feature: WebSocket infrastructure

---

### Phase 7: Inventory Alert System
**Priority:** HIGH | Effort: 3-4 days | Risk: Low

**Why:** Prevent stockouts by alerting staff when inventory falls below thresholds, ensuring continuous kitchen operations.

#### 7.1 Low Stock Threshold Configuration
**What:** Allow setting minimum stock levels per ingredient

**How:**
1. Add `minStockThreshold` field to ingredients table
2. Create settings UI for threshold configuration
3. Default thresholds based on average usage
4. Validation for reasonable threshold values

**Files to modify:**
- `src/db/schema.ts` - Add threshold field
- `src/routes/inventory.ts` - Add threshold update endpoint
- `src/pages/inventory.ts` - Add threshold settings UI

**Success Criteria:**
- Thresholds configurable per ingredient
- UI shows current threshold and suggested values
- Changes persist in database
- Validation prevents invalid values

**Estimate:** 4 hours

---

#### 7.2 Real-time Stock Monitoring
**What:** Monitor stock levels and emit alerts when below threshold

**How:**
1. Create stock monitoring service
2. Check stock levels after each decrement operation
3. Emit `inventory:low-stock` event when below threshold
4. Deduplicate alerts (don't spam same ingredient)
5. Add alert acknowledgment system

**Files to create:**
- `src/services/inventory-monitor.ts` - Stock monitoring service
- `src/websocket/events/inventory-events.ts` - Inventory event handlers

**Files to modify:**
- `src/repositories/inventory.ts` - Check thresholds after decrement
- `src/pages/admin.ts` - Subscribe to inventory alerts
- `src/pages/kitchen.ts` - Show low stock warnings

**Success Criteria:**
- Alerts trigger immediately when stock below threshold
- No duplicate alerts for same ingredient
- Alerts show in dashboard and kitchen display
- Acknowledgment clears alert

**Estimate:** 6 hours

---

**Total Phase 7:** ~10 hours | Risk reduction: Low | Feature: Inventory alerts

---

### Phase 8: Real-time Dashboard Backend
**Priority:** MEDIUM-HIGH | Effort: 4-5 days | Risk: Medium

**Why:** Provide management with live operational metrics for better decision-making and faster response to issues.

#### 8.1 Metrics Aggregation Endpoints
**What:** Create endpoints for real-time dashboard metrics

**How:**
1. Create dashboard service in `src/services/dashboard.ts`
2. Aggregate metrics:
   - Sales today (live counter)
   - Orders today (live counter)
   - Kitchen queue (pending, cooking, ready counts)
   - Inventory status (low stock count)
   - Top selling items (real-time)
3. Cache frequently accessed data
4. Optimize queries for sub-second response

**Files to create:**
- `src/services/dashboard.ts` - Dashboard metrics service
- `src/routes/dashboard.ts` - Dashboard API endpoints

**Files to modify:**
- `src/repositories/order.ts` - Add dashboard query methods
- `src/repositories/inventory.ts` - Add low stock count method

**Success Criteria:**
- API response < 500ms
- Metrics update in real-time via WebSocket
- Caching improves performance
- All required metrics available

**Estimate:** 8 hours

---

#### 8.2 WebSocket Streaming
**What:** Stream dashboard data via WebSocket for live updates

**How:**
1. Create dashboard room in WebSocket
2. Emit metric updates on data changes
3. Subscribe dashboard clients to room
4. Batch updates to reduce network traffic
5. Handle client disconnection gracefully

**Files to create:**
- `src/websocket/events/dashboard-events.ts` - Dashboard event handlers
- `src/services/dashboard-stream.ts` - Streaming service

**Files to modify:**
- `src/services/dashboard.ts` - Emit events on metric changes
- `src/index.ts` - Start dashboard streaming

**Success Criteria:**
- Dashboard updates automatically without refresh
- Updates received within 1 second of data change
- Batching prevents network overload
- Graceful handling of disconnections

**Estimate:** 6 hours

---

**Total Phase 8:** ~14 hours | Risk reduction: Medium | Feature: Dashboard backend

---

### Phase 9: Dashboard Frontend
**Priority:** HIGH | Effort: 5-6 days | Risk: Medium

**Why:** Visual dashboard provides at-a-glance operational status and helps identify issues quickly.

#### 9.1 Dashboard Layout & Widgets
**What:** Create dashboard page with real-time widgets

**How:**
1. Create dashboard page at `/dashboard`
2. Build widget components:
   - Sales counter (big number, live update)
   - Orders counter (big number, live update)
   - Kitchen queue status (visual indicators)
   - Low stock list (scrollable list)
   - Top items (bar chart)
   - Hourly sales trend (line chart)
3. Mobile-responsive grid layout
4. Auto-reconnect on WebSocket failure

**Files to create:**
- `src/pages/dashboard.ts` - Dashboard page
- `src/pages/dashboard/widgets/` - Widget components
- `src/pages/dashboard/charts.ts` - Chart.js integration

**Files to modify:**
- `src/index.ts` - Add dashboard route
- `src/public/styles/dashboard.css` - Dashboard styles

**Success Criteria:**
- Dashboard loads < 3 seconds
- Widgets auto-update via WebSocket
- Mobile layout functional
- Charts render correctly
- Reconnection works automatically

**Estimate:** 12 hours

---

#### 9.2 Interactive Features
**What:** Add interactivity to dashboard (filters, drill-down)

**How:**
1. Date range selector (today, yesterday, custom)
2. Kitchen queue interaction (click to see orders)
3. Low stock item quick actions (view, reorder)
4. Export dashboard data (PDF, CSV)
5. Fullscreen mode

**Files to modify:**
- `src/pages/dashboard.ts` - Add interactive elements
- `src/routes/dashboard.ts` - Add filter endpoints
- `src/services/reports.ts` - Add export methods

**Success Criteria:**
- Date filters work and update widgets
- Drill-down shows detailed data
- Export generates files correctly
- Fullscreen mode works

**Estimate:** 6 hours

---

**Total Phase 9:** ~18 hours | Risk reduction: Low | Feature: Dashboard UI

---

### Phase 10: Notification Preferences
**Priority:** MEDIUM | Effort: 2-3 days | Risk: Low

**Why:** Users should control which notifications they receive to avoid alert fatigue.

#### 10.1 User Notification Settings
**What:** Allow users to customize notification preferences

**How:**
1. Add notification settings to user profile
2. Create settings UI for toggling notification types
3. Role-based defaults (kitchen gets order notifications)
4. Persist preferences in database
5. Apply filters before sending notifications

**Files to create:**
- `src/routes/users/notifications.ts` - Notification settings endpoints
- `src/pages/settings/notifications.ts` - Settings UI

**Files to modify:**
- `src/db/schema.ts` - Add notification settings column
- `src/services/notifications.ts` - Check preferences before sending
- `src/pages/settings.ts` - Add notification tab

**Success Criteria:**
- Users can toggle notification types
- Role-based defaults applied
- Changes saved to database
- Notifications respect user preferences

**Estimate:** 8 hours

---

**Total Phase 10:** ~8 hours | Risk reduction: Low | Feature: Preferences

---

## Quick Wins (0.5-1 hour each)

1. **Add WebSocket health check endpoint** - Verify WebSocket server status
2. **Dashboard favicon with unread indicator** - Show notification count
3. **Toast notifications for alerts** - Brief popup notifications
4. **Sound toggle for notifications** - Mute/unmute audio alerts

---

## Success Criteria

- [ ] WebSocket connections stable with < 1% disconnections
- [ ] Dashboard loads in < 3 seconds
- [ ] Real-time updates received within 1 second
- [ ] All 78 existing tests still passing
- [ ] Mobile dashboard functional
- [ ] No regression in existing features

---

## Technical Stack Additions

- **WebSocket:** Socket.io or Elysia WebSocket
- **Charts:** Chart.js or D3.js
- **Caching:** Redis (optional, for horizontal scaling)
- **Email:** Nodemailer (optional, for email alerts)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| WebSocket scaling issues | Implement Redis adapter for multi-instance support |
| Dashboard performance | Implement caching and optimize queries |
| Browser compatibility | Test on multiple browsers, fallback to polling |
| Network interruptions | Implement automatic reconnection with exponential backoff |

---

## Dependencies

- ✅ Phase 1-5 (v1.0) complete
- ✅ Authentication system ready
- ✅ Database optimized
- WebSocket library (to be added)
- Chart library (to be added)

---

## Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 6 | 3-4 days | Week 1 | Week 1 |
| Phase 7 | 2-3 days | Week 2 | Week 2 |
| Phase 8 | 3-4 days | Week 2 | Week 3 |
| Phase 9 | 3-4 days | Week 3 | Week 4 |
| Phase 10 | 1-2 days | Week 4 | Week 4 |
| **Total** | **~4 weeks** | | |

---

**Next:** Start with Phase 6 - WebSocket Infrastructure

**Previous Milestone:** [v1.0 ROADMAP](./milestones/v1.0-ROADMAP.md)
