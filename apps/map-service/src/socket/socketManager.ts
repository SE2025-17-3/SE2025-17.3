import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer;

export const initSocket = (socketIO: SocketIOServer): void => {
  io = socketIO;
  
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
