const express = require('express');
const QRCode = require('../models/QRCode');
const { authenticateToken } = require('../middleware/auth');
const { validateQRCode } = require('../middleware/validation');

const router = express.Router();

// @route   POST /api/qr-codes
// @desc    Create a new QR code
// @access  Private
router.post('/', authenticateToken, validateQRCode, async (req, res) => {
  try {
    const { name, type, content, image, metadata } = req.body;

    // Process metadata based on QR type
    let processedMetadata = {};
    
    if (type === 'wifi' && metadata) {
      processedMetadata = {
        ssid: metadata.ssid,
        security: metadata.security,
        hidden: metadata.hidden || false
      };
    } else if (type === 'contact' && metadata) {
      processedMetadata = {
        contactName: metadata.contactName,
        phone: metadata.phone,
        email: metadata.email,
        organization: metadata.organization
      };
    } else if (type === 'url' && metadata) {
      try {
        const url = new URL(content);
        processedMetadata.domain = url.hostname;
      } catch (e) {
        // Invalid URL, skip domain extraction
      }
    }

    const qrCode = new QRCode({
      userId: req.user._id,
      name,
      type,
      content,
      image,
      metadata: processedMetadata
    });

    await qrCode.save();

    res.status(201).json({
      success: true,
      message: 'QR code created successfully',
      qrCode
    });
  } catch (error) {
    console.error('QR code creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during QR code creation'
    });
  }
});

// @route   GET /api/qr-codes
// @desc    Get all QR codes for the authenticated user
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build query
    const query = { 
      userId: req.user._id,
      isActive: true
    };
    
    if (type) {
      query.type = type;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const qrCodes = await QRCode.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Get total count for pagination
    const total = await QRCode.countDocuments(query);

    res.json({
      success: true,
      qrCodes,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error('Get QR codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching QR codes'
    });
  }
});

// @route   GET /api/qr-codes/:id
// @desc    Get a specific QR code
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const qrCode = await QRCode.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found'
      });
    }

    res.json({
      success: true,
      qrCode
    });
  } catch (error) {
    console.error('Get QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching QR code'
    });
  }
});

// @route   PUT /api/qr-codes/:id
// @desc    Update a QR code
// @access  Private
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, metadata, isPublic } = req.body;
    
    const qrCode = await QRCode.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found'
      });
    }

    // Update allowed fields
    if (name) qrCode.name = name;
    if (metadata) qrCode.metadata = { ...qrCode.metadata, ...metadata };
    if (typeof isPublic === 'boolean') qrCode.isPublic = isPublic;

    await qrCode.save();

    res.json({
      success: true,
      message: 'QR code updated successfully',
      qrCode
    });
  } catch (error) {
    console.error('QR code update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during QR code update'
    });
  }
});

// @route   DELETE /api/qr-codes/:id
// @desc    Delete a QR code (soft delete)
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const qrCode = await QRCode.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found'
      });
    }

    // Soft delete
    qrCode.isActive = false;
    await qrCode.save();

    res.json({
      success: true,
      message: 'QR code deleted successfully'
    });
  } catch (error) {
    console.error('QR code deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during QR code deletion'
    });
  }
});

// @route   POST /api/qr-codes/:id/scan
// @desc    Increment scan count for a QR code
// @access  Private
router.post('/:id/scan', authenticateToken, async (req, res) => {
  try {
    const qrCode = await QRCode.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR code not found'
      });
    }

    await qrCode.incrementScanCount();

    res.json({
      success: true,
      message: 'Scan count updated',
      scanCount: qrCode.scanCount
    });
  } catch (error) {
    console.error('Scan count update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during scan count update'
    });
  }
});

// @route   GET /api/qr-codes/stats/summary
// @desc    Get QR code statistics for the user
// @access  Private
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get total count
    const totalCount = await QRCode.countDocuments({ userId, isActive: true });

    // Get count by type
    const typeStats = await QRCode.aggregate([
      { $match: { userId, isActive: true } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get total scans
    const scanStats = await QRCode.aggregate([
      { $match: { userId, isActive: true } },
      { $group: { _id: null, totalScans: { $sum: '$scanCount' } } }
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentCount = await QRCode.countDocuments({
      userId,
      isActive: true,
      createdAt: { $gte: sevenDaysAgo }
    });

    res.json({
      success: true,
      stats: {
        totalQRCodes: totalCount,
        totalScans: scanStats[0]?.totalScans || 0,
        recentQRCodes: recentCount,
        typeBreakdown: typeStats
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
});

module.exports = router;