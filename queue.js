const express = require('express');
const router = express.Router();
const Queue = require('../models/Queue');

// Get current queue status
router.get('/status', async (req, res) => {
  try {
    const waitingCount = await Queue.countDocuments({ status: 'waiting' });
    const currentQueue = await Queue.find({ status: 'waiting' })
      .sort({ tokenNumber: 1 })
      .limit(10);
    
    res.json({
      waitingCount,
      currentQueue
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Join queue
router.post('/join', async (req, res) => {
  try {
    // Get the last token number
    const lastToken = await Queue.findOne().sort({ tokenNumber: -1 });
    const nextTokenNumber = lastToken ? lastToken.tokenNumber + 1 : 1;

    const newToken = new Queue({
      tokenNumber: nextTokenNumber,
      status: 'waiting'
    });

    const savedToken = await newToken.save();
    res.status(201).json(savedToken);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Mark as served (Admin only)
router.put('/serve/:tokenNumber', async (req, res) => {
  try {
    const token = await Queue.findOne({ tokenNumber: req.params.tokenNumber });
    if (!token) {
      return res.status(404).json({ message: 'Token not found' });
    }

    token.status = 'served';
    token.servedAt = new Date();
    await token.save();

    res.json(token);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Reset queue (Admin only)
router.delete('/reset', async (req, res) => {
  try {
    await Queue.deleteMany({});
    res.json({ message: 'Queue reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 