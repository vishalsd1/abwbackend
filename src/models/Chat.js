import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  chatName: { type: String, trim: true },
  isGroupChat: { type: Boolean, default: false },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  latestMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  avatar: { type: String },
  pin: { type: String, unique: true, sparse: true },
  status: { type: String, enum: ['waiting', 'active', 'ended'], default: 'active' }
}, {
  timestamps: true
});

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;
