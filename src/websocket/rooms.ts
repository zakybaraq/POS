import { getLoggerWithRequestId } from '../utils/logger-with-context';

export function setupRooms(io: any) {
  const logger = getLoggerWithRequestId();

  io.on('connection', (socket: any) => {
    const user = socket.user;

    if (!user) {
      logger.warn({ socketId: socket.id }, 'Connection without user data');
      return;
    }

    const { role, userId } = user;

    // Join role-based room
    socket.join(role);
    logger.info({ userId, role, socketId: socket.id }, `User joined ${role} room`);

    // Join personal room for targeted notifications
    socket.join(`user:${userId}`);

    // Emit welcome event
    socket.emit('connected', {
      userId,
      role,
      timestamp: new Date().toISOString(),
    });

    // Dashboard room subscription handlers
    // Added for Phase 8 - Real-time Dashboard
    socket.on('subscribe-dashboard', () => {
      const allowedRoles = ['super_admin', 'admin_restoran', 'manager', 'kasir'];
      if (allowedRoles.includes(role)) {
        socket.join('dashboard');
        logger.info({ userId, socketId: socket.id }, 'User subscribed to dashboard');
        socket.emit('dashboard:subscribed', { success: true, timestamp: new Date().toISOString() });
      } else {
        logger.warn({ userId, role, socketId: socket.id }, 'Unauthorized dashboard subscription attempt');
        socket.emit('dashboard:subscribed', { success: false, error: 'Unauthorized' });
      }
    });

    socket.on('unsubscribe-dashboard', () => {
      socket.leave('dashboard');
      logger.info({ userId, socketId: socket.id }, 'User unsubscribed from dashboard');
      socket.emit('dashboard:unsubscribed', { success: true, timestamp: new Date().toISOString() });
    });

    // Kitchen room subscription handlers
    socket.on('subscribe-kitchen', () => {
      const allowedRoles = ['super_admin', 'admin_restoran', 'manager', 'koki'];
      if (allowedRoles.includes(role)) {
        socket.join('kitchen');
        logger.info({ userId, socketId: socket.id }, 'User subscribed to kitchen');
        socket.emit('kitchen:subscribed', { success: true, timestamp: new Date().toISOString() });
      } else {
        socket.emit('kitchen:subscribed', { success: false, error: 'Unauthorized' });
      }
    });

    socket.on('unsubscribe-kitchen', () => {
      socket.leave('kitchen');
      logger.info({ userId, socketId: socket.id }, 'User unsubscribed from kitchen');
      socket.emit('kitchen:unsubscribed', { success: true, timestamp: new Date().toISOString() });
    });

    socket.on('disconnect', (reason: string) => {
      logger.info({ userId, socketId: socket.id, reason }, 'User disconnected');
    });

    socket.on('error', (error: any) => {
      logger.error({ userId, socketId: socket.id, error }, 'Socket error');
    });
  });
}
