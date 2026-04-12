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
    
    socket.on('disconnect', (reason: string) => {
      logger.info({ userId, socketId: socket.id, reason }, 'User disconnected');
    });
    
    socket.on('error', (error: any) => {
      logger.error({ userId, socketId: socket.id, error }, 'Socket error');
    });
  });
}
