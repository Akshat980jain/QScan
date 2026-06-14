const mongoose = require('mongoose');

const scanLogSchema = new mongoose.Schema({
  qrCodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QRCode',
    required: [true, 'QRCode ID is required']
  },
  scannedAt: {
    type: Date,
    default: Date.now
  },
  ip: {
    type: String,
    default: 'unknown'
  },
  deviceType: {
    type: String,
    enum: ['mobile', 'tablet', 'desktop', 'other'],
    default: 'other'
  },
  os: {
    type: String,
    default: 'unknown'
  },
  browser: {
    type: String,
    default: 'unknown'
  },
  country: {
    type: String,
    default: 'unknown'
  },
  city: {
    type: String,
    default: 'unknown'
  }
}, {
  timestamps: true
});

// Indexes for analytical aggregation
scanLogSchema.index({ qrCodeId: 1, scannedAt: -1 });
scanLogSchema.index({ qrCodeId: 1, country: 1 });
scanLogSchema.index({ qrCodeId: 1, deviceType: 1 });

module.exports = mongoose.model('ScanLog', scanLogSchema);
