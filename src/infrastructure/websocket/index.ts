import { Elysia } from 'elysia';
import { Server } from 'socket.io';
import { authenticateSocket } from './auth';
import { setupRooms } from './rooms';
import { setSocketIO } from '../services/notifications';
import { getLoggerWithRequestId } from '../utils/logger-with-context';

let io: Server | null = null;

export function createWebSocketPlugin() {
  return new Elysia({ name: 'websocket' })
  .onStart(({ server }) => {
    if (!io && server) {
      io = new Server(server as any, {
        cors: {
          origin: '*',
          methods: ['GET', 'POST']
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['polling', 'websocket'],
      });

      io.use(authenticateSocket);
      setupRooms(io);
      setupDashboardRooms(io);
      setSocketIO(io);

      console.log('WebSocket server initialized');
    }
  });
}

export function createWebSocketServer(httpServer: any) {
  if (!io) {
    io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['polling', 'websocket'],
    });

    io.use(authenticateSocket);
    setupRooms(io);
    setupDashboardRooms(io);
    setSocketIO(io);

    console.log('WebSocket server initialized (direct)');
  }
  return io;
}

function setupDashboardRooms(io: Server) {
  const logger = getLoggerWithRequestId();

  io.on('connection', (socket) => {
    const user = (socket as any).user;

    if (!user) {
      return;
    }

    const { role } = user;

    // Handle dashboard subscription
    socket.on('subscribe-dashboard', () => {
      // Only allow dashboard access to authorized roles
      const allowedRoles = ['super_admin', 'admin_restoran', 'manager', 'kasir'];
      if (allowedRoles.includes(role)) {
        socket.join('dashboard');
        logger.info({ socketId: socket.id, role }, 'User subscribed to dashboard');
        socket.emit('dashboard:subscribed', { success: true, timestamp: new Date().toISOString() });
      } else {
        logger.warn({ socketId: socket.id, role }, 'Unauthorized dashboard subscription attempt');
        socket.emit('dashboard:subscribed', { success: false, error: 'Unauthorized' });
      }
    });

    // Handle dashboard unsubscription
    socket.on('unsubscribe-dashboard', () => {
      socket.leave('dashboard');
      logger.info({ socketId: socket.id, role }, 'User unsubscribed from dashboard');
      socket.emit('dashboard:unsubscribed', { success: true, timestamp: new Date().toISOString() });
    });

    // Handle kitchen subscription (for kitchen display)
    socket.on('subscribe-kitchen', () => {
      const allowedRoles = ['super_admin', 'admin_restoran', 'manager', 'koki'];
      if (allowedRoles.includes(role)) {
        socket.join('kitchen');
        logger.info({ socketId: socket.id, role }, 'User subscribed to kitchen');
        socket.emit('kitchen:subscribed', { success: true, timestamp: new Date().toISOString() });
      } else {
        socket.emit('kitchen:subscribed', { success: false, error: 'Unauthorized' });
      }
    });

    // Handle kitchen unsubscription
    socket.on('unsubscribe-kitchen', () => {
      socket.leave('kitchen');
      logger.info({ socketId: socket.id, role }, 'User unsubscribed from kitchen');
      socket.emit('kitchen:unsubscribed', { success: true, timestamp: new Date().toISOString() });
    });
  });
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

export type SocketServer = Server;
