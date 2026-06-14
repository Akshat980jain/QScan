const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  keyHash: {
    type: String,
    required: true
  },
  prefix: {
    type: String,
    required: true
  },
  lastUsedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ApiKey', apiKeySchema);
