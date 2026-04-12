import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { authenticateSocket } from './auth';
import { setupRooms } from './rooms';

export function setupWebSocket(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use(authenticateSocket);
  setupRooms(io);

  return io;
}

export type SocketServer = Server;
