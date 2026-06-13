const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer = null;

const connectDB = async () => {
  try {
    let mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qrvault';
    
    // Try to connect to the specified MongoDB URI first
    try {
      const conn = await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 5000, // 5 second timeout
      });
      console.log(`MongoDB Connected: ${conn.connection.host}:${conn.connection.port}`);
      console.log(`Database: ${conn.connection.name}`);
    } catch (initialError) {
      console.log('Primary MongoDB connection failed, starting in-memory MongoDB server...');
      
      // Start in-memory MongoDB server as fallback
      mongoServer = await MongoMemoryServer.create();
      mongoURI = mongoServer.getUri();
      
      const conn = await mongoose.connect(mongoURI);
      console.log(`MongoDB Memory Server Connected: ${conn.connection.host}:${conn.connection.port}`);
      console.log(`Database: ${conn.connection.name}`);
      console.log('⚠️  Using in-memory database - data will not persist after restart');
    }
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      if (mongoServer) {
        await mongoServer.stop();
      }
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;