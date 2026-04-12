# Phase 6 Context - WebSocket Infrastructure & Order Notifications

**Status:** Discussion Complete | **Phase:** 6 of 10 | **Effort:** 18 hours

---

## Executive Summary

Phase 6 implements WebSocket infrastructure to enable real-time communication for the POS system. This foundation supports live order notifications, inventory alerts, and dashboard updates in subsequent phases.

**Key Decisions Made:**
- Socket.io as WebSocket library (mature, auto-reconnect, room support)
- JWT via query parameter for MVP (can enhance to headers later)
- Per-role room architecture (kitchen, cashier, admin)
- Namespaced event structure for clarity

---

## Decisions

### 1. WebSocket Library: Socket.io
**Decision:** Use Socket.io instead of Elysia WebSocket

**Rationale:**
- ✅ Auto-reconnection with exponential backoff (critical for mobile/kitchen displays)
- ✅ Built-in room management (simplifies implementation)
- ✅ Fallback to HTTP long-polling (better browser compatibility)
- ✅ Mature ecosystem with extensive documentation
- ❌ Extra dependency (~100KB) acceptable trade-off for features

**Implementation:**
```typescript
// Server setup
import { Server } from 'socket.io';
const io = new Server(server);

// Client connection
import { io } from 'socket.io-client';
const socket = io('/kitchen');
```

---

### 2. Authentication: JWT via Query Parameter
**Decision:** JWT via query param for handshake (MVP approach)

**Rationale:**
- ✅ Simpler implementation for initial release
- ✅ Works with standard Socket.io patterns
- ✅ Can upgrade to header-based auth in future enhancement
- ⚠️ Token visible in logs (acceptable for internal POS system)

**Future Enhancement:** Header-based authentication with custom middleware

**Implementation:**
```typescript
// Client
const socket = io({
  query: { token: jwtToken }
});

// Server
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  // validate JWT
});
```

---

### 3. Room Architecture: Per-Role
**Decision:** Organize rooms by user role (kitchen, cashier, admin)

**Rationale:**
- ✅ Simple and matches existing auth roles
- ✅ Easy to understand and maintain
- ✅ Sufficient for v2.0 requirements
- ❌ Less granular than feature-based (acceptable trade-off)

**Rooms:**
- `kitchen` - All kitchen staff
- `cashier` - All cashiers
- `admin` - Admin users
- `user:${userId}` - Individual user (for targeted notifications)

**Implementation:**
```typescript
// Join room on connection
socket.join(user.role);

// Broadcast to role
io.to('kitchen').emit('order:created', orderData);
```

---

### 4. Event Structure: Namespaced
**Decision:** Use namespaced event format for clarity

**Rationale:**
- ✅ Clear organization prevents event name collisions
- ✅ Easy to add versioning later (v1:orders, v2:orders)
- ✅ Better documentation and IDE autocomplete
- ❌ Slightly more verbose than flat structure

**Format:**
```typescript
{
  namespace: 'orders',      // Feature area
  event: 'created',          // Specific action
  payload: { ... },          // Data
  timestamp: '2026-04-13T10:30:00Z',
  version: '1.0'
}
```

**Event Types:**
- `order:created` - New order submitted
- `order:updated` - Order modified
- `order:status-changed` - Status transition
- `order:completed` - Order finished
- `payment:received` - Payment confirmed
- `inventory:low-stock` - Stock alert

---

## Technical Implementation Notes

### File Structure
```
src/
├── websocket/
│   ├── index.ts          # Socket.io server setup
│   ├── auth.ts           # JWT authentication middleware
│   ├── rooms.ts          # Room management utilities
│   └── events/
│       ├── order-events.ts
│       └── index.ts
├── services/
│   └── notifications.ts  # Notification service
└── index.ts              # Register WebSocket server
```

### Dependencies
```json
{
  "socket.io": "^4.7.0",
  "socket.io-client": "^4.7.0"  // for client-side
}
```

### Performance Targets
- Connection establishment: < 500ms
- Event latency: < 1 second
- Concurrent connections: 100+
- Reconnection time: < 5 seconds

### Security Considerations
- ✅ JWT validation on every connection
- ✅ Room membership verified against user role
- ✅ Rate limiting on WebSocket connections (optional)
- ⚠️ Query param auth (enhance to headers in v2.1)

---

## Success Criteria

- [ ] Socket.io server integrated with Elysia
- [ ] JWT authentication working
- [ ] Room architecture functional
- [ ] Order events broadcasting correctly
- [ ] Auto-reconnection tested
- [ ] All 78 existing tests still passing

---

## Out of Scope (v2.0)

- Redis adapter for scaling (v2.1)
- Header-based authentication (v2.1)
- Feature-based room architecture (v2.2)
- Message persistence (v2.3)

---

## Next Steps

1. Install Socket.io dependencies
2. Set up WebSocket server in src/index.ts
3. Implement JWT auth middleware
4. Create room management utilities
5. Implement order notification events
6. Test with kitchen and cashier clients

---

**Context Locked:** 2026-04-13  
**Ready for Planning:** Yes
