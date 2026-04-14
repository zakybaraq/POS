import { Elysia } from 'elysia';
import { Server } from 'socket.io';
import { routes } from './routes';
import { categoryRoutes } from './routes/categories';
import { healthRoutes } from './routes/health';
import { metricsRoutes } from './routes/metrics';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { authPages } from './pages/auth';
import { dashboardPage } from './pages/dashboard';
import { posPage } from './pages/pos';
import { adminPage } from './pages/admin';
import { menuPage } from './pages/menu';
import { categoriesPage } from './pages/categories';
import { tablesPage } from './pages/tables';
import { ordersPage } from './pages/orders';
import { productsPage } from './pages/products';
import { httpRequestsTotal, httpRequestDurationSeconds } from './metrics';
import { customersPage } from './pages/customers';
import { inventoryPage } from './pages/inventory';
import { reportsPage } from './pages/reports';
import { settingsPage } from './pages/settings';
import { suppliersPage } from './pages/suppliers';
import { purchaseOrdersPage } from './pages/purchase-orders';
import { employeesPage } from './pages/employees';
import { shiftsPage } from './pages/shifts';
import { attendancePage } from './pages/attendance';
import { kitchenPage } from './pages/kitchen';
import { seedDefaultSettings } from './repositories/settings';
import { seedDefaultCategories } from './repositories/category';
import { logger } from './logger';
import { authenticateSocket } from './websocket/auth';
import { setupRooms } from './websocket/rooms';
import { setSocketIO } from './services/notifications';
import { getLoggerWithRequestId } from './utils/logger-with-context';
import { createServer } from 'http';
import { getTokenFromCookies, verifyToken } from './utils/auth';

seedDefaultSettings().catch(err =>
  logger.error({ err }, 'Failed to seed settings')
);
seedDefaultCategories().catch(err =>
  logger.error({ err }, 'Failed to seed categories')
);

let io: Server | null = null;

function setupDashboardRooms(io: Server) {
  const dashboardLogger = getLoggerWithRequestId();
  io.on('connection', (socket) => {
    const user = (socket as any).user;
    if (!user) return;
    const { role } = user;

    socket.on('subscribe-dashboard', () => {
      const allowedRoles = ['super_admin', 'admin_restoran', 'manager', 'kasir'];
      if (allowedRoles.includes(role)) {
        socket.join('dashboard');
        dashboardLogger.info({ socketId: socket.id, role }, 'User subscribed to dashboard');
        socket.emit('dashboard:subscribed', { success: true, timestamp: new Date().toISOString() });
      } else {
        dashboardLogger.warn({ socketId: socket.id, role }, 'Unauthorized dashboard subscription attempt');
        socket.emit('dashboard:subscribed', { success: false, error: 'Unauthorized' });
      }
    });

    socket.on('unsubscribe-dashboard', () => {
      socket.leave('dashboard');
      dashboardLogger.info({ socketId: socket.id, role }, 'User unsubscribed from dashboard');
      socket.emit('dashboard:unsubscribed', { success: true, timestamp: new Date().toISOString() });
    });

    socket.on('subscribe-kitchen', () => {
      const allowedRoles = ['super_admin', 'admin_restoran', 'manager', 'koki'];
      if (allowedRoles.includes(role)) {
        socket.join('kitchen');
        dashboardLogger.info({ socketId: socket.id, role }, 'User subscribed to kitchen');
        socket.emit('kitchen:subscribed', { success: true, timestamp: new Date().toISOString() });
      } else {
        socket.emit('kitchen:subscribed', { success: false, error: 'Unauthorized' });
      }
    });

    socket.on('unsubscribe-kitchen', () => {
      socket.leave('kitchen');
      dashboardLogger.info({ socketId: socket.id, role }, 'User unsubscribed from kitchen');
      socket.emit('kitchen:unsubscribed', { success: true, timestamp: new Date().toISOString() });
    });
  });
}

const elysiaApp = new Elysia()
  .get('/', async ({ headers }) => {
    const token = getTokenFromCookies(undefined, headers);
    if (token) {
      try {
        verifyToken(token);
        return new Response(null, { status: 302, headers: { Location: '/dashboard' } });
      } catch {}
    }
    return new Response(null, { status: 302, headers: { Location: '/login' } });
  })
  .onRequest(({ request }) => {
    (request as any).startTime = Date.now();
  })
  .onAfterHandle(({ request, set }) => {
    const method = request.method;
    const status = set.status?.toString() || '200';
    const path = new URL(request.url).pathname;

    httpRequestsTotal.labels(method, status).inc();

    const startTime = (request as any).startTime;
    if (startTime) {
      httpRequestDurationSeconds.labels(method, path).observe((Date.now() - startTime) / 1000);
    }
  })
  .use(routes)
  .use(categoryRoutes)
  .use(healthRoutes)
  .use(metricsRoutes)
  .get('/styles/:path', ({ params }) => {
    const stylesDir = join(__dirname, 'public/styles');
    const filePath = join(stylesDir, params.path);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      return new Response(content, { headers: { 'Content-Type': 'text/css' } });
    }
    return new Response('Not found', { status: 404 });
  })
  .get('/pages/:path', ({ params }) => {
    const pagesDir = join(__dirname, 'pages');
    const filePath = join(pagesDir, params.path);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      return new Response(content, { headers: { 'Content-Type': 'application/javascript' } });
    }
    return new Response('Not found', { status: 404 });
  })
  .get('/socket.io/socket.io.js', () => {
    const socketIoPath = join(__dirname, '../node_modules/socket.io/client-dist/socket.io.min.js');
    if (existsSync(socketIoPath)) {
      const content = readFileSync(socketIoPath, 'utf-8');
      return new Response(content, { headers: { 'Content-Type': 'application/javascript' } });
    }
    return new Response('Socket.IO client not found', { status: 404 });
  })
  .use(authPages)
  .use(new Elysia().group('/dashboard', (app) => app.use(dashboardPage)))
  .use(posPage)
  .use(adminPage)
  .use(menuPage)
  .use(categoriesPage)
  .use(tablesPage)
  .use(ordersPage)
  .use(productsPage)
  .use(inventoryPage)
  .use(customersPage)
  .use(reportsPage)
  .use(settingsPage)
  .use(suppliersPage)
  .use(purchaseOrdersPage)
  .use(employeesPage)
  .use(shiftsPage)
  .use(attendancePage)
  .use(kitchenPage);

const port = process.env.PORT || 3000;

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name) {
      cookies[name] = decodeURIComponent(rest.join('=') || '');
    }
  });
  return cookies;
}

const httpServer = createServer(async (req, res) => {
  let body: Buffer | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks);
  }

  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  });

  const cookies = parseCookies(req.headers.cookie);

  const request = new Request(`http://localhost:${port}${req.url}`, {
    method: req.method,
    headers,
    body: body && body.length > 0 ? body : undefined,
  });

  (request as any).cookies = cookies;

  try {
    const response = await elysiaApp.fetch(request as any);
    res.statusCode = response.status;
    res.statusMessage = response.statusText || '';
    response.headers.forEach((value, key) => {
      if (key && value) {
        res.setHeader(key, value);
      }
    });
    const text = await response.text();
    res.end(text);
  } catch (error) {
    logger.error({ error }, 'Error handling request');
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['polling', 'websocket'],
});

io.use(authenticateSocket);
setupRooms(io);
setupDashboardRooms(io);
setSocketIO(io);

httpServer.listen(port, () => {
  logger.info({ port }, 'Server running with WebSocket support');
});

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

export type App = typeof elysiaApp;
