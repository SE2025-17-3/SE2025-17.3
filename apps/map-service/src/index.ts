import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { PORT } from './config/constants';
import { initSocket } from './socket/socketManager';
import pixelRoutes from './routes/pixelRoutes';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, { 
  cors: { origin: '*' } 
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDatabase();

// Initialize Socket.IO handlers
initSocket(io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'map-service',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', pixelRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
});

export default app;
