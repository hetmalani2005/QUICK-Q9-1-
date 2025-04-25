const mongoose = require('mongoose');
const Queue = require('./models/Queue');

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quickq';

// Sample queue data
const sampleQueueData = [
  {
    tokenNumber: 1,
    status: 'served',
    createdAt: new Date(Date.now() - 3600000), // 1 hour ago
    servedAt: new Date(Date.now() - 3000000) // 50 minutes ago
  },
  {
    tokenNumber: 2,
    status: 'waiting',
    createdAt: new Date(Date.now() - 1800000) // 30 minutes ago
  },
  {
    tokenNumber: 3,
    status: 'waiting',
    createdAt: new Date(Date.now() - 900000) // 15 minutes ago
  },
  {
    tokenNumber: 4,
    status: 'cancelled',
    createdAt: new Date(Date.now() - 600000) // 10 minutes ago
  },
  {
    tokenNumber: 5,
    status: 'waiting',
    createdAt: new Date() // current time
  }
];

// Function to initialize database with sample data
async function initializeDb() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB successfully');

    // Clear existing queue data
    await Queue.deleteMany({});
    console.log('Cleared existing queue data');

    // Insert sample data
    const result = await Queue.insertMany(sampleQueueData);
    console.log(`Added ${result.length} sample queue entries`);

    console.log('Database initialization completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeDb(); 