require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');
const chatRoutes = require('./routes/chat');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

app.set('io', io);

connectDB();

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/chat', chatRoutes);

// Socket.io: authenticate via JWT and join a room named after the user's id
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.userId = decoded.id;

    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  socket.join(socket.userId);

  // Existing chat typing
  socket.on('typing', ({ to }) => {
    io.to(to).emit('typing', {
      from: socket.userId,
    });
  });

  // =====================================================
  // LIVE CONNECT - RANDOM MATCHMAKING
  // =====================================================

  // User Live Connect me enter karta hai
  socket.on('live-join', () => {
    // Agar already call me hai ya queue me hai
    // to duplicate entry nahi banegi
    if (socket.livePeerId || socket.liveWaiting) {
      return;
    }

    const availableUsers = [];

    // Sab connected sockets me se free users find karo
    for (const [id, otherSocket] of io.sockets.sockets) {
      if (
        id !== socket.id &&
        otherSocket.connected &&
        otherSocket.liveWaiting &&
        !otherSocket.livePeerId
      ) {
        availableUsers.push(otherSocket);
      }
    }

    // Agar koi free user mil gaya
    if (availableUsers.length > 0) {
      // Random free user select
      const peer =
        availableUsers[
          Math.floor(Math.random() * availableUsers.length)
        ];

      // Dono ko waiting se hatao
      socket.liveWaiting = false;
      peer.liveWaiting = false;

      // Dono ka peer set karo
      socket.livePeerId = peer.id;
      peer.livePeerId = socket.id;

      // Ek side WebRTC offer initiate karegi
      io.to(socket.id).emit('live-matched', {
        peerId: peer.id,
        peerUserId: peer.userId,
        initiator: true,
      });

      // Dusri side offer receive karegi
      io.to(peer.id).emit('live-matched', {
        peerId: socket.id,
        peerUserId: socket.userId,
        initiator: false,
      });

      return;
    }

    // Koi free user nahi mila
    // User waiting queue me chala jayega
    socket.liveWaiting = true;

    socket.emit('live-searching');
  });

  // =====================================================
  // WEBRTC OFFER
  // =====================================================

  socket.on('live-offer', ({ to, offer }) => {
    if (!to || !offer) return;

    const peer = io.sockets.sockets.get(to);

    if (!peer) return;

    io.to(to).emit('live-offer', {
      from: socket.id,
      offer,
    });
  });

  // =====================================================
  // WEBRTC ANSWER
  // =====================================================

  socket.on('live-answer', ({ to, answer }) => {
    if (!to || !answer) return;

    const peer = io.sockets.sockets.get(to);

    if (!peer) return;

    io.to(to).emit('live-answer', {
      from: socket.id,
      answer,
    });
  });

  // =====================================================
  // WEBRTC ICE CANDIDATE
  // =====================================================

  socket.on('live-ice-candidate', ({ to, candidate }) => {
    if (!to || !candidate) return;

    const peer = io.sockets.sockets.get(to);

    if (!peer) return;

    io.to(to).emit('live-ice-candidate', {
      from: socket.id,
      candidate,
    });
  });

  // =====================================================
  // NEXT USER
  // =====================================================

  socket.on('live-next', () => {
    const peerId = socket.livePeerId;

    // Current user ko free karo
    socket.livePeerId = null;
    socket.liveWaiting = false;

    // Current peer ko bhi free karo
    if (peerId) {
      const peer = io.sockets.sockets.get(peerId);

      if (peer) {
        peer.livePeerId = null;
        peer.liveWaiting = false;

        io.to(peerId).emit('live-ended');
      }
    }

    // Current user ko bhi call end signal
    socket.emit('live-ended');
  });

  // =====================================================
  // LEAVE LIVE CONNECT
  // =====================================================

  socket.on('live-leave', () => {
    const peerId = socket.livePeerId;

    socket.livePeerId = null;
    socket.liveWaiting = false;

    if (peerId) {
      const peer = io.sockets.sockets.get(peerId);

      if (peer) {
        peer.livePeerId = null;
        peer.liveWaiting = false;

        io.to(peerId).emit('live-ended');
      }
    }
  });

  // =====================================================
  // DISCONNECT
  // =====================================================

  socket.on('disconnect', () => {
    const peerId = socket.livePeerId;

    // Disconnect hone wale user ko queue/call se hatao
    socket.livePeerId = null;
    socket.liveWaiting = false;

    // Agar call me tha to peer ko notify karo
    if (peerId) {
      const peer = io.sockets.sockets.get(peerId);

      if (peer) {
        peer.livePeerId = null;
        peer.liveWaiting = false;

        io.to(peerId).emit('live-ended');
      }
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});