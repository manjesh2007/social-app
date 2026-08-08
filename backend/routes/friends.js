const express = require('express');
const mongoose = require('mongoose');
const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/friends/request/:userId - send a friend request
router.post('/request/:userId', auth, async (req, res) => {
  try {
    const toId = req.params.userId;

    if (toId === req.user._id.toString()) {
      return res.status(400).json({ message: "You can't send a friend request to yourself" });
    }

    const toUser = await User.findById(toId);
    if (!toUser) return res.status(404).json({ message: 'User not found' });

    if (req.user.friends.includes(toId)) {
      return res.status(409).json({ message: 'You are already friends' });
    }

    const existing = await FriendRequest.findOne({
      $or: [
        { from: req.user._id, to: toId },
        { from: toId, to: req.user._id },
      ],
      status: 'pending',
    });

    if (existing) {
      return res.status(409).json({ message: 'A friend request already exists between you two' });
    }

    const request = await FriendRequest.create({ from: req.user._id, to: toId });
    res.status(201).json({ request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error sending friend request' });
  }
});

// GET /api/friends/requests - list incoming pending requests
router.get('/requests', auth, async (req, res) => {
  try {
    const requests = await FriendRequest.find({ to: req.user._id, status: 'pending' })
      .populate('from', 'name photoUrl bio')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching requests' });
  }
});

// GET /api/friends/sent - list requests I've sent that are still pending
router.get('/sent', auth, async (req, res) => {
  try {
    const requests = await FriendRequest.find({ from: req.user._id, status: 'pending' })
      .populate('to', 'name photoUrl bio')
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching sent requests' });
  }
});

// POST /api/friends/respond/:requestId - accept or decline
router.post('/respond/:requestId', auth, async (req, res) => {
  try {
    const { action } = req.body; // "accept" | "decline"
    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ message: 'action must be "accept" or "decline"' });
    }

    const request = await FriendRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (request.to.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to respond to this request' });
    }

    if (request.status !== 'pending') {
      return res.status(409).json({ message: 'This request has already been handled' });
    }

    request.status = action === 'accept' ? 'accepted' : 'declined';
    await request.save();

    if (action === 'accept') {
      await User.findByIdAndUpdate(request.from, { $addToSet: { friends: request.to } });
      await User.findByIdAndUpdate(request.to, { $addToSet: { friends: request.from } });
    }

    res.json({ request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error responding to request' });
  }
});

// GET /api/friends - list my friends
router.get('/', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user._id).populate('friends', 'name photoUrl bio');
    res.json({ friends: me.friends });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching friends' });
  }
});

// DELETE /api/friends/:userId - unfriend
router.delete('/:userId', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { friends: req.params.userId } });
    await User.findByIdAndUpdate(req.params.userId, { $pull: { friends: req.user._id } });
    res.json({ message: 'Removed friend' });
  } catch (err) {
    res.status(500).json({ message: 'Server error removing friend' });
  }
});

module.exports = router;
