const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
  tokenNumber: {
    type: Number,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['waiting', 'served', 'cancelled'],
    default: 'waiting'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  servedAt: {
    type: Date
  }
});

module.exports = mongoose.model('Queue', queueSchema); 