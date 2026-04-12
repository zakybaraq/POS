import { verifyToken } from '../utils/jwt';
import { getLoggerWithRequestId } from '../utils/logger-with-context';

export function authenticateSocket(socket: any, next: any) {
  const logger = getLoggerWithRequestId();
  const token = socket.handshake.query.token as string;
  
  if (!token) {
    logger.warn({ socketId: socket.id }, 'WebSocket connection rejected: no token');
    return next(new Error('Authentication required'));
  }
  
  try {
    const payload = verifyToken(token);
    socket.user = payload;
    logger.info({ userId: payload.userId, role: payload.role }, 'WebSocket authenticated');
    next();
  } catch (err) {
    logger.warn({ socketId: socket.id, error: err }, 'WebSocket connection rejected: invalid token');
    next(new Error('Invalid token'));
  }
}
