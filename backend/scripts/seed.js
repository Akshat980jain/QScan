const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const QRCode = require('../models/QRCode');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qrvault');
    console.log('MongoDB Connected for seeding');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await QRCode.deleteMany({});
    console.log('Cleared existing data');

    // Create sample users — passwords must meet complexity requirements:
    // min 6 chars, at least one uppercase, one lowercase, one number
    const users = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        accountType: 'individual',
        subscribeToNewsletter: false,
        agreeToTerms: true
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'Password123',
        accountType: 'business',
        subscribeToNewsletter: true,
        agreeToTerms: true
      }
    ];

    const createdUsers = await User.create(users);
    console.log('Created sample users');

    // Create sample QR codes
    const sampleQRCodes = [
      {
        userId: createdUsers[0]._id,
        name: 'My Website',
        type: 'url',
        content: 'https://example.com',
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        metadata: {
          domain: 'example.com'
        }
      },
      {
        userId: createdUsers[0]._id,
        name: 'Home WiFi',
        type: 'wifi',
        content: 'WIFI:T:WPA;S:MyHomeWiFi;P:password123;H:false;;',
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        metadata: {
          ssid: 'MyHomeWiFi',
          security: 'WPA',
          hidden: false
        }
      },
      {
        userId: createdUsers[0]._id,
        name: 'Contact Info',
        type: 'contact',
        content: 'BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nTEL:+1234567890\nEMAIL:john@example.com\nORG:Example Corp\nEND:VCARD',
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        metadata: {
          contactName: 'John Doe',
          phone: '+1234567890',
          email: 'john@example.com',
          organization: 'Example Corp'
        }
      },
      {
        userId: createdUsers[1]._id,
        name: 'Simple Text',
        type: 'text',
        content: 'Hello, World!',
        image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      }
    ];

    await QRCode.create(sampleQRCodes);
    console.log('Created sample QR codes');

    console.log('✅ Database seeded successfully!');
    console.log('\nSample login credentials:');
    console.log('Email: john@example.com');
    console.log('Password: password123');
    console.log('\nEmail: jane@example.com');
    console.log('Password: password123');

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

const runSeed = async () => {
  await connectDB();
  await seedData();
};

runSeed();