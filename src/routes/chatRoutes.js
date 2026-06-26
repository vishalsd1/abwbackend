import express from 'express';
import Chat from '../models/Chat.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ message: "userId required" });

    // Find all chats/rooms where the user is a participant
    const chats = await Chat.find({ users: userId })
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .sort({ updatedAt: -1 });

    // Map MongoDB Chat objects to the Frontend's expected Chat interface
    const formattedChats = chats.map(chat => ({
      id: chat._id.toString(),
      name: chat.chatName || 'Room',
      type: chat.isGroupChat ? 'group' : 'direct',
      participants: chat.users.map(u => ({
        id: u._id.toString(),
        name: u.name,
        avatar: u.avatar,
        status: u.status
      })),
      avatar: chat.avatar,
      lastMessage: null, 
      unreadCount: 0
    }));

    res.json(formattedChats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
