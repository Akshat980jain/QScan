const mongoose = require('mongoose');

const workspaceMemberSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: [true, 'Workspace ID is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'editor', 'viewer'],
    default: 'viewer'
  }
}, {
  timestamps: true
});

// Ensure a user can only be added to a workspace once
workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('WorkspaceMember', workspaceMemberSchema);
