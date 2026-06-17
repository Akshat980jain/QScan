const mongoose = require('mongoose');
require('dotenv').config();
const QRCode = require('../models/QRCode');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

const checkData = async () => {
  try {
    const qrs = await QRCode.find({ name: { $regex: 'CLINCH', $options: 'i' } });
    console.log(`Found ${qrs.length} matching CLINCH QR codes:`);
    for (const qr of qrs) {
      console.log('---');
      console.log('ID:', qr._id);
      console.log('Name:', qr.name);
      console.log('Type:', qr.type);
      console.log('Content:', qr.content);
      console.log('isDynamic:', qr.isDynamic);
      console.log('targetUrl:', qr.targetUrl);
      console.log('shortId:', qr.shortId);
      console.log('image length:', qr.image ? qr.image.length : 0);
    }

    console.log('\nLast 5 QR codes in DB:');
    const lastQrs = await QRCode.find({}).sort({ createdAt: -1 }).limit(5);
    for (const qr of lastQrs) {
      console.log('---');
      console.log('ID:', qr._id);
      console.log('Name:', qr.name);
      console.log('Type:', qr.type);
      console.log('Content:', qr.content);
      console.log('isDynamic:', qr.isDynamic);
      console.log('targetUrl:', qr.targetUrl);
      console.log('shortId:', qr.shortId);
    }
  } catch (error) {
    console.error('Query failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

const run = async () => {
  await connectDB();
  await checkData();
};

run();
