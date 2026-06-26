import express from 'express';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';

const router = express.Router();

// GET all messages for a specific chat
router.get('/:chatId', async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate('sender', 'name avatar email')
      .populate('chat')
      .sort({ createdAt: 1 });

    const formattedMessages = messages.map(msg => ({
      id: msg._id.toString(),
      chatId: msg.chat._id.toString(),
      senderId: msg.sender._id.toString(),
      content: msg.content,
      timestamp: msg.createdAt,
      type: 'text',
      status: 'sent'
    }));

    res.json(formattedMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST a new message
router.post('/', async (req, res) => {
  const { content, chatId, userId } = req.body;

  if (!content || !chatId || !userId) {
    return res.status(400).json({ message: 'Invalid data passed into request' });
  }

  var newMessage = {
    sender: userId,
    content: content,
    chat: chatId,
  };

  try {
    var message = await Message.create(newMessage);
    message = await message.populate('sender', 'name avatar');
    message = await message.populate('chat');

    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

    res.json({
      id: message._id.toString(),
      chatId: message.chat._id.toString(),
      senderId: message.sender._id.toString(),
      content: message.content,
      timestamp: message.createdAt,
      type: 'text',
      status: 'sent'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
