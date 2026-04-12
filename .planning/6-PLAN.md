# Phase 6 Plan - WebSocket Infrastructure & Order Notifications

**Status:** Ready for Execution | **Phase:** 6 of 10 | **Duration:** 18 hours  
**Context:** [6-CONTEXT.md](./6-CONTEXT.md) | **Requirements:** REQ-001, REQ-002

---

## Goal

Implement WebSocket infrastructure using Socket.io to enable real-time communication, and create order notification system for kitchen and cashier staff.

---

## Prerequisites

- [x] Phase 1-5 completed
- [x] 6-CONTEXT.md created with decisions
- [x] Socket.io library selected
- [x] Authentication strategy decided

---

## Wave 1: WebSocket Server Setup (8 hours)

### Task 1.1: Install Dependencies
**What:** Add Socket.io to project
**File:** `package.json`

```bash
bun add socket.io
bun add -d @types/socket.io
```

**Success Criteria:**
- [ ] socket.io in dependencies
- [ ] Types installed

---

### Task 1.2: Create WebSocket Server
**What:** Set up Socket.io server with Elysia integration
**File:** `src/websocket/index.ts` (new)

**Implementation:**
```typescript
import { Server } from 'socket.io';
import { createServer } from 'http';

export function setupWebSocket(app: any) {
  const server = createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' },
    pingTimeout: 60000,
    pingInterval: 25000,
  });
  
  return { server, io };
}
```

**Success Criteria:**
- [ ] Server starts without errors
- [ ] WebSocket endpoint accessible

---

### Task 1.3: JWT Authentication Middleware
**What:** Validate JWT tokens on WebSocket connections
**File:** `src/websocket/auth.ts` (new)

**Implementation:**
```typescript
import { verifyToken } from '../utils/jwt';

export function authenticateSocket(socket: any, next: any) {
  const token = socket.handshake.query.token;
  
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  try {
    const payload = verifyToken(token);
    socket.user = payload;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
}
```

**Success Criteria:**
- [ ] Rejects connections without token
- [ ] Validates JWT correctly
- [ ] Attaches user to socket

---

### Task 1.4: Room Management
**What:** Implement room joining by user role
**File:** `src/websocket/rooms.ts` (new)

**Implementation:**
```typescript
export function setupRooms(io: any) {
  io.on('connection', (socket: any) => {
    const { role, id } = socket.user;
    
    // Join role-based room
    socket.join(role);
    
    // Join personal room
    socket.join(`user:${id}`);
    
    socket.on('disconnect', () => {
      console.log(`User ${id} disconnected`);
    });
  });
}
```

**Rooms:**
- `kitchen` - Kitchen staff
- `cashier` - Cashiers
- `admin` - Admins
- `user:${id}` - Individual user

**Success Criteria:**
- [ ] Users join correct rooms
- [ ] Rooms work for broadcasting
- [ ] Disconnect handled properly

---

### Task 1.5: Integrate with Application
**What:** Register WebSocket server in main app
**File:** `src/index.ts`

**Implementation:**
```typescript
import { setupWebSocket } from './websocket';

const app = new Elysia();
const { server, io } = setupWebSocket(app);

// ... existing routes ...

server.listen(3000);
```

**Success Criteria:**
- [ ] App starts with WebSocket
- [ ] HTTP routes still work
- [ ] WebSocket connections accepted

---

### Task 1.6: Test Connections
**What:** Verify WebSocket functionality

**Test Checklist:**
- [ ] Connect with valid JWT
- [ ] Reject connection without JWT
- [ ] Join correct room
- [ ] Receive broadcasts
- [ ] Handle disconnection
- [ ] Auto-reconnection works

---

## Wave 2: Order Notification Events (10 hours)

### Task 2.1: Create Notification Service
**What:** Service to emit notification events
**File:** `src/services/notifications.ts` (new)

**Implementation:**
```typescript
import type { Server } from 'socket.io';

export class NotificationService {
  constructor(private io: Server) {}
  
  notifyKitchen(order: any) {
    this.io.to('kitchen').emit('order:created', {
      namespace: 'orders',
      event: 'created',
      payload: order,
      timestamp: new Date().toISOString(),
    });
  }
  
  notifyOrderStatusChanged(order: any) {
    this.io.to('kitchen').to('cashier').emit('order:status-changed', {
      namespace: 'orders',
      event: 'status-changed',
      payload: order,
      timestamp: new Date().toISOString(),
    });
  }
  
  notifyPaymentReceived(order: any) {
    this.io.to('cashier').emit('payment:received', {
      namespace: 'payments',
      event: 'received',
      payload: order,
      timestamp: new Date().toISOString(),
    });
  }
}
```

**Success Criteria:**
- [ ] Service can emit events
- [ ] Events reach correct rooms
- [ ] Payload includes all required fields

---

### Task 2.2: Emit Order Events
**What:** Emit notifications on order lifecycle changes
**File:** `src/routes/orders.ts`

**Implementation:**
```typescript
import { NotificationService } from '../services/notifications';

// In order creation endpoint
.post('/', async ({ body, ... }) => {
  const order = await orderRepo.createOrder(...);
  notificationService.notifyKitchen(order);
  return order;
})

// In order status update
.patch('/:id/status', async ({ params, body }) => {
  const order = await orderRepo.updateOrderStatus(...);
  notificationService.notifyOrderStatusChanged(order);
  return order;
})
```

**Events to Emit:**
- [ ] `order:created` → Kitchen
- [ ] `order:status-changed` → Kitchen + Cashier
- [ ] `order:completed` → Cashier
- [ ] `payment:received` → Cashier

**Success Criteria:**
- [ ] Events emit on all lifecycle changes
- [ ] Kitchen receives new orders
- [ ] Cashier receives payment confirmations
- [ ] Events include full order context

---

### Task 2.3: Emit Payment Events
**What:** Emit payment notifications
**File:** `src/services/payment.ts`

**Implementation:**
```typescript
export async function processPayment(orderId: number, amountPaid: number) {
  // ... existing payment logic ...
  
  // After successful payment
  notificationService.notifyPaymentReceived(order);
  
  return result;
}
```

**Success Criteria:**
- [ ] Payment events emit correctly
- [ ] Include amount, change due
- [ ] Timestamp accurate

---

### Task 2.4: Frontend Subscription
**What:** Subscribe kitchen and cashier pages to events
**Files:** `src/pages/kitchen.ts`, `src/pages/pos.ts`

**Implementation:**
```typescript
// kitchen.ts
const socket = io({ query: { token: getToken() } });

socket.on('order:created', (data) => {
  showNotification('New order received!', data.payload);
  playSound('new-order');
});

socket.on('order:status-changed', (data) => {
  updateKitchenDisplay(data.payload);
});
```

**Success Criteria:**
- [ ] Kitchen subscribes to kitchen room
- [ ] Cashier subscribes to cashier room
- [ ] Notifications display in UI
- [ ] Audio alerts work (optional)

---

## Testing Strategy

### Unit Tests
- [ ] Authentication middleware tests
- [ ] Room management tests
- [ ] Notification service tests

### Integration Tests
- [ ] Full WebSocket connection flow
- [ ] Order notification end-to-end
- [ ] Reconnection handling

### Manual Tests
- [ ] Kitchen display receives orders
- [ ] Cashier sees payment confirmations
- [ ] Multiple clients work simultaneously
- [ ] Network interruption handling

---

## Exit Criteria

### Functional
- [ ] WebSocket server running
- [ ] JWT auth working
- [ ] Room architecture functional
- [ ] Order events broadcasting
- [ ] Frontend receiving notifications
- [ ] All 78 existing tests passing

### Performance
- [ ] Connection < 500ms
- [ ] Event latency < 1 second
- [ ] 100+ concurrent connections

### Security
- [ ] No unauthenticated connections
- [ ] Users only join authorized rooms
- [ ] Tokens validated correctly

---

## Commits

1. `feat: setup Socket.io WebSocket server with JWT auth`
2. `feat: implement room management (kitchen, cashier, admin)`
3. `feat: create notification service for order events`
4. `feat: emit order notifications on lifecycle changes`
5. `feat: subscribe frontend pages to WebSocket events`

---

## Dependencies

- socket.io
- @types/socket.io

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Token exposure in query | Document as known issue, fix in v2.1 |
| Scaling issues | Redis adapter in v2.1 |
| Browser compatibility | Socket.io fallback to polling |

---

## Next Phase

**Phase 7:** Inventory Alert System  
**Blocking:** None (can parallelize with Phase 6 testing)

---

**Created:** 2026-04-13  
**Ready for Execution:** Yes
