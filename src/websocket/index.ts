import { Elysia } from 'elysia';
import { Server } from 'socket.io';
import { authenticateSocket } from './auth';
import { setupRooms } from './rooms';
import { setSocketIO } from '../services/notifications';

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
        });

        io.use(authenticateSocket);
        setupRooms(io);
        setSocketIO(io);
        
        console.log('WebSocket server initialized');
      }
    });
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

export type SocketServer = Server;
