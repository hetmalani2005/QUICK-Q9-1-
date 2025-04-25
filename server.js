const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const Queue = require('./models/Queue');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickq')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Queue Routes
app.get('/api/queue/status', async (req, res) => {
  try {
    const waitingCount = await Queue.countDocuments({ status: 'waiting' });
    const currentQueue = await Queue.find({ status: 'waiting' })
      .sort({ tokenNumber: 1 })
      .limit(10);
    res.json({ waitingCount, currentQueue });
  } catch (error) {
    console.error('Error fetching queue status:', error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/queue/join', async (req, res) => {
  try {
    const lastToken = await Queue.findOne().sort({ tokenNumber: -1 });
    const nextTokenNumber = lastToken ? lastToken.tokenNumber + 1 : 1;

    const newToken = new Queue({
      tokenNumber: nextTokenNumber,
      status: 'waiting'
    });

    const savedToken = await newToken.save();
    
    // Emit queue update to all clients
    const updatedQueue = await Queue.find({ status: 'waiting' })
      .sort({ tokenNumber: 1 })
      .limit(10);
    const waitingCount = await Queue.countDocuments({ status: 'waiting' });
    io.emit('queueUpdate', { waitingCount, currentQueue: updatedQueue });
    
    res.status(201).json(savedToken);
  } catch (error) {
    console.error('Error joining queue:', error);
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/queue/serve/:tokenNumber', async (req, res) => {
  try {
    const token = await Queue.findOneAndUpdate(
      { tokenNumber: parseInt(req.params.tokenNumber) },
      { status: 'served', servedAt: new Date() },
      { new: true }
    );

    if (!token) {
      return res.status(404).json({ message: 'Token not found' });
    }

    // Emit queue update to all clients
    const updatedQueue = await Queue.find({ status: 'waiting' })
      .sort({ tokenNumber: 1 })
      .limit(10);
    const waitingCount = await Queue.countDocuments({ status: 'waiting' });
    io.emit('queueUpdate', { waitingCount, currentQueue: updatedQueue });

    res.json(token);
  } catch (error) {
    console.error('Error serving token:', error);
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/queue/reset', async (req, res) => {
  try {
    await Queue.deleteMany({});
    io.emit('queueUpdate', { waitingCount: 0, currentQueue: [] });
    res.json({ message: 'Queue reset successfully' });
  } catch (error) {
    console.error('Error resetting queue:', error);
    res.status(500).json({ message: error.message });
  }
});

// Socket.IO Connection Handling
io.on('connection', (socket) => {
  console.log('Client connected');

  // Send initial queue data when client connects
  const sendQueueUpdate = async () => {
    try {
      const waitingCount = await Queue.countDocuments({ status: 'waiting' });
      const currentQueue = await Queue.find({ status: 'waiting' })
        .sort({ tokenNumber: 1 })
        .limit(10);
      socket.emit('queueUpdate', { waitingCount, currentQueue });
    } catch (error) {
      console.error('Error sending queue update:', error);
    }
  };

  sendQueueUpdate();

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Daily Queue Reset (at midnight)
const scheduleDailyReset = () => {
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0, 0, 0
  );
  const msToMidnight = night.getTime() - now.getTime();

  setTimeout(async () => {
    try {
      await Queue.deleteMany({});
      io.emit('queueUpdate', { waitingCount: 0, currentQueue: [] });
      console.log('Daily queue reset completed');
      scheduleDailyReset(); // Schedule next reset
    } catch (error) {
      console.error('Error in daily queue reset:', error);
    }
  }, msToMidnight);
};

scheduleDailyReset();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 