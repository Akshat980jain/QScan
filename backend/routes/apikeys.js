const express = require('express');
const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper: hash a key
const hashKey = (key) => crypto.createHash('sha256').update(key).digest('hex');

// @route   POST /api/api-keys
// @desc    Generate a new API key for the authenticated user
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Key name is required' });
    }

    // Limit to 10 keys per user
    const count = await ApiKey.countDocuments({ userId: req.user._id });
    if (count >= 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 API keys allowed per account. Please revoke an existing key first.'
      });
    }

    // Generate a secure random key: prefix_<random>
    const rawKey = `qrv_live_${crypto.randomBytes(24).toString('hex')}`;
    const prefix = rawKey.substring(0, 14); // "qrv_live_" + 5 chars

    const apiKey = new ApiKey({
      userId: req.user._id,
      name: name.trim(),
      keyHash: hashKey(rawKey),
      prefix
    });

    await apiKey.save();

    res.status(201).json({
      success: true,
      message: 'API key created successfully. Store the key safely — it will not be shown again.',
      apiKey: {
        _id: apiKey._id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        createdAt: apiKey.createdAt,
        lastUsedAt: apiKey.lastUsedAt
      },
      // Return the plain key only once
      rawKey
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ success: false, message: 'Server error while creating API key' });
  }
});

// @route   GET /api/api-keys
// @desc    List all API keys for the authenticated user (hashes never returned)
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const apiKeys = await ApiKey.find({ userId: req.user._id })
      .select('-keyHash') // never expose hash
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      apiKeys,
      count: apiKeys.length
    });
  } catch (error) {
    console.error('List API keys error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching API keys' });
  }
});

// @route   DELETE /api/api-keys/:id
// @desc    Revoke (delete) an API key
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const apiKey = await ApiKey.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!apiKey) {
      return res.status(404).json({ success: false, message: 'API key not found' });
    }

    res.json({ success: true, message: 'API key revoked successfully' });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ success: false, message: 'Server error while revoking key' });
  }
});

// @route   PATCH /api/api-keys/:id/name
// @desc    Rename an API key
// @access  Private
router.patch('/:id/name', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const apiKey = await ApiKey.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { name: name.trim() },
      { new: true, select: '-keyHash' }
    );

    if (!apiKey) {
      return res.status(404).json({ success: false, message: 'API key not found' });
    }

    res.json({ success: true, message: 'API key renamed', apiKey });
  } catch (error) {
    console.error('Rename API key error:', error);
    res.status(500).json({ success: false, message: 'Server error while renaming key' });
  }
});

module.exports = router;
