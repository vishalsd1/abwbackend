import Chat from '../models/Chat.js';
import User from '../models/User.js';

export const setupRoomHandlers = (io, socket) => {
  // Create a Room (Lobby)
  socket.on('create-room', async (data, callback) => {
    try {
      const { userId, userName } = data;
      
      // Generate a unique 6-digit PIN
      let pin;
      let isUnique = false;
      while (!isUnique) {
        pin = Math.floor(100000 + Math.random() * 900000).toString();
        const existing = await Chat.findOne({ pin });
        if (!existing) isUnique = true;
      }

      const newRoom = await Chat.create({
        chatName: `${userName}'s Room`,
        isGroupChat: true,
        groupAdmin: userId,
        users: [userId],
        pin,
        status: 'waiting'
      });

      // Join the socket room
      socket.join(newRoom._id.toString());
      
      const populatedRoom = await Chat.findById(newRoom._id).populate('users', '-password');

      callback({ success: true, room: populatedRoom });
    } catch (error) {
      console.error('Error creating room:', error);
      callback({ success: false, message: error.message });
    }
  });

  // Join a Room
  socket.on('join-room', async (data, callback) => {
    try {
      const { pin, userId } = data;
      
      const room = await Chat.findOne({ pin, status: 'waiting' });
      
      if (!room) {
        return callback({ success: false, message: 'Room not found or already started.' });
      }

      // Add user if not already in room
      const userExists = room.users.some(id => id.toString() === userId.toString());
      if (!userExists) {
        room.users.push(userId);
        await room.save();
      }

      socket.join(room._id.toString());
      
      const populatedRoom = await Chat.findById(room._id).populate('users', '-password').populate('groupAdmin', '-password');

      // Notify others in the room
      socket.to(room._id.toString()).emit('user-joined', populatedRoom);

      callback({ success: true, room: populatedRoom });
    } catch (error) {
      console.error('Error joining room:', error);
      callback({ success: false, message: error.message });
    }
  });

  // Start Room
  socket.on('start-room', async (data, callback) => {
    try {
      const { roomId, userId } = data;
      
      const room = await Chat.findById(roomId);
      if (!room) return callback({ success: false, message: 'Room not found' });
      
      if (!room.groupAdmin || room.groupAdmin.toString() !== userId.toString()) {
        return callback({ success: false, message: 'Only admin can start the room' });
      }

      room.status = 'active';
      await room.save();

      io.to(roomId).emit('room-started', room);
      callback({ success: true });
    } catch (error) {
      console.error('Error starting room:', error);
      callback({ success: false, message: error.message });
    }
  });

  // Handle new messages
  socket.on('new-message', (newMessageReceived) => {
    const chatId = newMessageReceived.chatId;
    if (!chatId) return console.log('chatId not defined on message');
    
    // Broadcast message to everyone in the room except sender
    socket.to(chatId).emit('message-received', newMessageReceived);
  });

  socket.on('join-room-chat', (roomId) => {
    if (roomId) {
      socket.join(roomId);
    }
  });

  // --- WebRTC Group Calling ---

  // When a user initiates/joins an active WebRTC call in a room
  socket.on('join-call', ({ roomId, userId, user }) => {
    // Join a specific call-room to separate chat vs call traffic if desired, 
    // but using the existing roomId is fine.
    // Broadcast to others in the room that this user joined the call
    socket.to(roomId).emit('user-joined-call', { userId, user, socketId: socket.id });
  });

  // Relay signaling data (offers, answers, ICE candidates) between peers
  socket.on('webrtc-signal', (payload) => {
    // payload: { targetSocketId, callerId, signal }
    io.to(payload.targetSocketId).emit('webrtc-signal', {
      callerId: payload.callerId,
      callerSocketId: socket.id,
      signal: payload.signal,
    });
  });

  // When a user leaves a call
  socket.on('leave-call', ({ roomId, userId }) => {
    socket.to(roomId).emit('user-left-call', { userId, socketId: socket.id });
  });
  
  // Cleanup on disconnect is handled by Socket.io, 
  // but we can broadcast a general disconnect
  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit('user-left-call', { socketId: socket.id });
      }
    }
  });
};
