const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/chat/conversations - list conversations with last message + unread count
router.get('/conversations', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user._id).populate('friends', 'name photoUrl');

    const conversations = await Promise.all(
      me.friends.map(async (friend) => {
        const conversationId = Message.conversationIdFor(req.user._id, friend._id);
        const lastMessage = await Message.findOne({ conversationId }).sort({ createdAt: -1 });
        const unreadCount = await Message.countDocuments({
          conversationId,
          recipient: req.user._id,
          readAt: null,
        });

        return {
          friend: { id: friend._id, name: friend.name, photoUrl: friend.photoUrl },
          lastMessage: lastMessage
            ? { text: lastMessage.text, createdAt: lastMessage.createdAt, sender: lastMessage.sender }
            : null,
          unreadCount,
        };
      })
    );

    conversations.sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    res.json({ conversations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching conversations' });
  }
});

// GET /api/chat/:userId - message history with a specific friend
router.get('/:userId', auth, async (req, res) => {
  try {
    const conversationId = Message.conversationIdFor(req.user._id, req.params.userId);
    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 }).limit(200);

    // Mark incoming messages as read
    await Message.updateMany(
      { conversationId, recipient: req.user._id, readAt: null },
      { $set: { readAt: new Date() } }
    );

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching messages' });
  }
});

// POST /api/chat/:userId - send a message (also emitted via socket.io in server.js)
router.post('/:userId', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    if (!req.user.friends.map((f) => f.toString()).includes(req.params.userId)) {
      return res.status(403).json({ message: 'You can only message your friends' });
    }

    const conversationId = Message.conversationIdFor(req.user._id, req.params.userId);
    const message = await Message.create({
      conversationId,
      sender: req.user._id,
      recipient: req.params.userId,
      text: text.trim(),
    });

    const io = req.app.get('io');
    if (io) {
      io.to(req.params.userId).emit('message:new', message);
    }

    res.status(201).json({ message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error sending message' });
  }
});

module.exports = router;
