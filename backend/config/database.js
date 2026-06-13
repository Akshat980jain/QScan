const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer = null;

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  gray: '\x1b[90m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

const connectDB = async () => {
  try {
    let mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qrvault';
    
    // Try to connect to the specified MongoDB URI first
    try {
      const conn = await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 5000, // 5 second timeout
      });
      
      let dbType = 'MongoDB Local';
      if (mongoURI.includes('mongodb.net') || mongoURI.includes('+srv')) {
        dbType = 'MongoDB Atlas (Cloud)';
      }
      
      const line = (content) => `  ${colors.green}│${colors.reset} ${content}`;
      
      console.log(line(''));
      console.log(line(`  ${colors.bold}${colors.green}💾 DATABASE CONNECTION${colors.reset}`));
      console.log(line(`  ${colors.gray}─────────────────────────────────────────────────${colors.reset}`));
      console.log(line(`  ${colors.bold}${colors.white}Status:   ${colors.reset}${colors.green}${colors.bold}Connected Successfully${colors.reset}`));
      console.log(line(`  ${colors.bold}${colors.white}Type:     ${colors.reset}${colors.cyan}${dbType}${colors.reset}`));
      console.log(line(`  ${colors.bold}${colors.white}Host:     ${colors.reset}${colors.cyan}${conn.connection.host}${conn.connection.port ? ':' + conn.connection.port : ''}${colors.reset}`));
      console.log(line(`  ${colors.bold}${colors.white}Database: ${colors.reset}${colors.cyan}${conn.connection.name}${colors.reset}`));
      console.log(line(''));
    } catch (initialError) {
      const line = (content) => `  ${colors.yellow}│${colors.reset} ${content}`;
      
      console.log(line(''));
      console.log(line(`  ${colors.bold}${colors.yellow}⚠️  DATABASE CONNECTION WARNING${colors.reset}`));
      console.log(line(`  ${colors.gray}─────────────────────────────────────────────────${colors.reset}`));
      console.log(line(`  ${colors.bold}${colors.white}Primary Connection: ${colors.reset}${colors.red}Failed${colors.reset}`));
      console.log(line(`  ${colors.bold}${colors.white}Action:             ${colors.reset}${colors.yellow}Starting In-Memory Fallback Server...${colors.reset}`));
      
      // Start in-memory MongoDB server as fallback
      mongoServer = await MongoMemoryServer.create();
      mongoURI = mongoServer.getUri();
      
      const conn = await mongoose.connect(mongoURI);
      console.log(line(`  ${colors.gray}─────────────────────────────────────────────────${colors.reset}`));
      console.log(line(`  ${colors.bold}${colors.white}Status:             ${colors.reset}${colors.green}${colors.bold}Connected Successfully${colors.reset}`));
      console.log(line(`  ${colors.bold}${colors.white}Type:               ${colors.reset}${colors.cyan}In-Memory Database${colors.reset}`));
      console.log(line(`  ${colors.bold}${colors.white}Host:               ${colors.reset}${colors.cyan}${conn.connection.host}${conn.connection.port ? ':' + conn.connection.port : ''}${colors.reset}`));
      console.log(line(`  ${colors.bold}${colors.white}Database:           ${colors.reset}${colors.cyan}${conn.connection.name}${colors.reset}`));
      console.log(line(`  ${colors.bold}${colors.yellow}⚠️  Data will NOT persist after restart${colors.reset}`));
      console.log(line(''));
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