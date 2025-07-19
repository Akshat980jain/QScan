const mongoose = require('mongoose');

const qrCodeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  name: {
    type: String,
    required: [true, 'QR code name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  type: {
    type: String,
    required: [true, 'QR code type is required'],
    enum: ['text', 'url', 'wifi', 'contact', 'email', 'phone', 'sms'],
    lowercase: true
  },
  content: {
    type: String,
    required: [true, 'QR code content is required'],
    maxlength: [2000, 'Content cannot exceed 2000 characters']
  },
  image: {
    type: String,
    required: [true, 'QR code image is required']
  },
  metadata: {
    // For WiFi QR codes
    ssid: String,
    security: {
      type: String,
      enum: ['WPA', 'WEP', 'nopass']
    },
    hidden: Boolean,
    
    // For contact QR codes
    contactName: String,
    phone: String,
    email: String,
    organization: String,
    
    // For URL QR codes
    domain: String,
    
    // General metadata
    description: String,
    tags: [String]
  },
  scanCount: {
    type: Number,
    default: 0
  },
  lastScanned: {
    type: Date,
    default: null
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
qrCodeSchema.index({ userId: 1, createdAt: -1 });
qrCodeSchema.index({ userId: 1, type: 1 });
qrCodeSchema.index({ userId: 1, name: 'text' });

// Virtual for formatted creation date
qrCodeSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Method to increment scan count
qrCodeSchema.methods.incrementScanCount = function() {
  this.scanCount += 1;
  this.lastScanned = new Date();
  return this.save();
};

module.exports = mongoose.model('QRCode', qrCodeSchema);