import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import { setupRoomHandlers } from './socket/roomHandler.js';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import messageRoutes from './routes/messageRoutes.js';

dotenv.config();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST']
  }
});


// Middleware
app.use(express.json());
app.use(cors({ origin: CLIENT_ORIGIN }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Socket.IO Connection Logic
io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Initialize room handlers
  setupRoomHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log(`User Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
