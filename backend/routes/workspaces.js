const express = require('express');
const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/workspaces - Create workspace
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Workspace name is required' });
    }

    const workspace = new Workspace({
      name,
      ownerId: req.user._id
    });
    await workspace.save();

    // Add owner as member
    const ownerMember = new WorkspaceMember({
      workspaceId: workspace._id,
      userId: req.user._id,
      role: 'owner'
    });
    await ownerMember.save();

    res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      workspace
    });
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ success: false, message: 'Server error during workspace creation' });
  }
});

// GET /api/workspaces - Get all workspaces for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Find all workspace memberships
    const memberships = await WorkspaceMember.find({ userId: req.user._id })
      .populate('workspaceId')
      .exec();

    // Map to list of workspaces with user's role
    const workspaces = memberships
      .filter(m => m.workspaceId !== null)
      .map(m => ({
        _id: m.workspaceId._id,
        name: m.workspaceId.name,
        ownerId: m.workspaceId.ownerId,
        role: m.role,
        createdAt: m.workspaceId.createdAt
      }));

    res.json({
      success: true,
      workspaces
    });
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching workspaces' });
  }
});

// POST /api/workspaces/:id/members - Invite/Add member by email
router.post('/:id/members', authenticateToken, async (req, res) => {
  try {
    const { email, role = 'viewer' } = req.body;
    const { id: workspaceId } = req.params;

    if (!email) {
      return res.status(400).json({ success: false, message: 'User email is required' });
    }

    // Check if current user is owner or admin in this workspace
    const currentUserMember = await WorkspaceMember.findOne({
      workspaceId,
      userId: req.user._id
    });

    if (!currentUserMember || !['owner', 'admin'].includes(currentUserMember.role)) {
      return res.status(403).json({ success: false, message: 'Unauthorized. Only workspace owners and admins can invite members.' });
    }

    // Find the user to add
    const userToAdd = await User.findOne({ email: email.toLowerCase().trim() });
    if (!userToAdd) {
      return res.status(404).json({ success: false, message: 'User not found. They must register first.' });
    }

    // Check if user is already a member
    const existingMember = await WorkspaceMember.findOne({
      workspaceId,
      userId: userToAdd._id
    });

    if (existingMember) {
      return res.status(400).json({ success: false, message: 'User is already a member of this workspace.' });
    }

    const newMember = new WorkspaceMember({
      workspaceId,
      userId: userToAdd._id,
      role
    });
    await newMember.save();

    res.status(201).json({
      success: true,
      message: 'Member added successfully',
      member: {
        userId: userToAdd._id,
        name: userToAdd.name,
        email: userToAdd.email,
        role
      }
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ success: false, message: 'Server error while adding member' });
  }
});

// GET /api/workspaces/:id/members - Get workspace members
router.get('/:id/members', authenticateToken, async (req, res) => {
  try {
    const { id: workspaceId } = req.params;

    // Check if user has access to workspace
    const hasAccess = await WorkspaceMember.findOne({
      workspaceId,
      userId: req.user._id
    });

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const members = await WorkspaceMember.find({ workspaceId })
      .populate('userId', 'name email avatar')
      .exec();

    const formattedMembers = members.map(m => ({
      userId: m.userId._id,
      name: m.userId.name,
      email: m.userId.email,
      role: m.role
    }));

    res.json({
      success: true,
      members: formattedMembers
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching members' });
  }
});

// DELETE /api/workspaces/:id/members/:userId - Remove member
router.delete('/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const { id: workspaceId, userId: memberUserId } = req.params;
    const isSelfRemove = req.user._id.toString() === memberUserId.toString();

    // Check if current user is owner or admin, or is removing themselves
    const currentUserMember = await WorkspaceMember.findOne({
      workspaceId,
      userId: req.user._id
    });

    if (!isSelfRemove) {
      if (!currentUserMember || !['owner', 'admin'].includes(currentUserMember.role)) {
        return res.status(403).json({ success: false, message: 'Unauthorized. Only owners and admins can remove other members.' });
      }
    }

    // Check if member exists
    const memberToRemove = await WorkspaceMember.findOne({
      workspaceId,
      userId: memberUserId
    });

    if (!memberToRemove) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Prevent removing the owner
    if (memberToRemove.role === 'owner') {
      return res.status(400).json({ success: false, message: 'Cannot remove the workspace owner. Transfer ownership or delete the workspace instead.' });
    }

    await WorkspaceMember.findOneAndDelete({ workspaceId, userId: memberUserId });

    res.json({
      success: true,
      message: isSelfRemove ? 'You left the workspace successfully' : 'Member removed successfully'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ success: false, message: 'Server error while removing member' });
  }
});

// DELETE /api/workspaces/:id - Delete workspace
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id: workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    // Only owner can delete
    if (workspace.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the workspace owner can delete it.' });
    }

    // Delete members
    await WorkspaceMember.deleteMany({ workspaceId });
    // Delete workspace itself
    await Workspace.findByIdAndDelete(workspaceId);

    // Set workspaceId to null for associated QRs
    const QRCode = require('../models/QRCode');
    await QRCode.updateMany({ workspaceId }, { $set: { workspaceId: null } });

    res.json({
      success: true,
      message: 'Workspace deleted successfully'
    });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting workspace' });
  }
});

module.exports = router;
