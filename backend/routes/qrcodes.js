const express = require('express');
const QRCode = require('../models/QRCode');
const ScanLog = require('../models/ScanLog');
const { authenticateToken } = require('../middleware/auth');
const { validateQRCode } = require('../middleware/validation');

const router = express.Router();

// @route   POST /api/qr-codes
// @desc    Create a new QR code
// @access  Private
router.post('/', authenticateToken, validateQRCode, async (req, res) => {
  try {
    const { name, type, content, image, metadata, isDynamic, customization, workspaceId } = req.body;

    console.log('QR Code creation request received:');
    console.log('- name:', name);
    console.log('- type:', type);
    console.log('- content length:', content?.length);
    console.log('- image present:', !!image);
    console.log('- isDynamic:', isDynamic);
    console.log('- user id:', req.user._id);

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

    let finalContent = content;
    let targetUrl = req.body.targetUrl || null;
    let shortId = req.body.shortId || null;

    if (isDynamic && type === 'url') {
      const crypto = require('crypto');
      
      // If client provided a shortId, verify it is unique. If not, we will regenerate one.
      if (shortId) {
        const existing = await QRCode.findOne({ shortId });
        if (existing) {
          shortId = null; // Collision or invalid, force regeneration
        }
      }
      
      if (!shortId) {
        let isUnique = false;
        while (!isUnique) {
          shortId = crypto.randomBytes(4).toString('hex');
          const existing = await QRCode.findOne({ shortId });
          if (!existing) isUnique = true;
        }
      }
      
      // targetUrl = the actual destination website the user wants to redirect to.
      // If the client sent a targetUrl that looks like a redirect link (e.g. localhost or our own /r/ path),
      // it means the client sent the redirect URL instead of the real destination — fall back to content.
      const looksLikeRedirect = (url) =>
        url && (url.includes('/r/') || url.includes('localhost'));
      
      if (!targetUrl || looksLikeRedirect(targetUrl)) {
        // If content also looks like a redirect, leave targetUrl as null
        targetUrl = (!content || looksLikeRedirect(content)) ? null : content;
      }

      // Always rewrite content to the active backend URL for dynamic QR codes.
      // Never trust localhost URLs sent from web clients in development.
      const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
      finalContent = `${backendUrl}/r/${shortId}`;
    }

    const qrCode = new QRCode({
      userId: req.user._id,
      name,
      type,
      content: finalContent,
      image,
      metadata: processedMetadata,
      isDynamic: !!isDynamic,
      targetUrl,
      shortId,
      customization: customization || {},
      workspaceId: workspaceId || null
    });

    await qrCode.save();
    console.log('QR Code saved successfully with id:', qrCode._id);

    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const doc = qrCode.toObject();
    if (doc.isDynamic && doc.shortId) {
      doc.content = `${backendUrl}/r/${doc.shortId}`;
    }

    res.status(201).json({
      success: true,
      message: 'QR code created successfully',
      qrCode: doc
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
    const { page = 1, limit = 20, type, search, sortBy = 'createdAt', sortOrder = 'desc', workspaceId } = req.query;

    // Build query
    const query = {
      isActive: true
    };

    if (workspaceId && workspaceId !== 'personal') {
      const WorkspaceMember = require('../models/WorkspaceMember');
      const isMember = await WorkspaceMember.findOne({
        workspaceId,
        userId: req.user._id
      });
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'Access denied to this workspace' });
      }
      query.workspaceId = workspaceId;
    } else {
      query.userId = req.user._id;
      query.workspaceId = null;
    }

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

    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const mappedQrCodes = qrCodes.map(qr => {
      const doc = qr.toObject();
      if (doc.isDynamic && doc.shortId) {
        doc.content = `${backendUrl}/r/${doc.shortId}`;
      }
      return doc;
    });

    res.json({
      success: true,
      qrCodes: mappedQrCodes,
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

    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const doc = qrCode.toObject();
    if (doc.isDynamic && doc.shortId) {
      doc.content = `${backendUrl}/r/${doc.shortId}`;
    }

    res.json({
      success: true,
      qrCode: doc
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
    const { name, content, type, category, image, metadata, isPublic, customization, workspaceId } = req.body;

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

    // Update fields
    if (name) qrCode.name = name;
    if (type) qrCode.type = type;
    if (category) qrCode.category = category;
    if (image) qrCode.image = image;
    if (typeof isPublic === 'boolean') qrCode.isPublic = isPublic;
    if (customization) {
      qrCode.customization = { ...qrCode.customization, ...customization };
    }
    if (workspaceId !== undefined) {
      qrCode.workspaceId = workspaceId;
    }

    if (content) {
      if (qrCode.isDynamic && qrCode.type === 'url') {
        qrCode.targetUrl = content;
      } else {
        qrCode.content = content;
      }
    }

    if (metadata) {
      qrCode.metadata = { ...qrCode.metadata, ...metadata };
    }

    await qrCode.save();

    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const doc = qrCode.toObject();
    if (doc.isDynamic && doc.shortId) {
      doc.content = `${backendUrl}/r/${doc.shortId}`;
    }

    res.json({
      success: true,
      message: 'QR code updated successfully',
      qrCode: doc
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

    // Get favorites count
    const favoritesCount = await QRCode.countDocuments({ userId, isActive: true, isFavorite: true });

    res.json({
      success: true,
      stats: {
        totalQRCodes: totalCount,
        totalScans: scanStats[0]?.totalScans || 0,
        recentQRCodes: recentCount,
        favoritesCount: favoritesCount,
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



// @route   PATCH /api/qr-codes/:id/favorite
// @desc    Toggle favorite status of a QR code
// @access  Private
router.patch('/:id/favorite', authenticateToken, async (req, res) => {
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

    // Toggle favorite status
    qrCode.isFavorite = !qrCode.isFavorite;
    await qrCode.save();

    res.json({
      success: true,
      message: qrCode.isFavorite ? 'Added to favorites' : 'Removed from favorites',
      isFavorite: qrCode.isFavorite
    });
  } catch (error) {
    console.error('Favorite toggle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during favorite toggle'
    });
  }
});

// @route   PATCH /api/qr-codes/:id/category
// @desc    Update category of a QR code
// @access  Private
router.patch('/:id/category', authenticateToken, async (req, res) => {
  try {
    const { category } = req.body;

    if (!['general', 'work', 'personal', 'social', 'other'].includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

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

    qrCode.category = category;
    await qrCode.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      category: qrCode.category
    });
  } catch (error) {
    console.error('Category update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during category update'
    });
  }
});

// @route   GET /api/qr-codes/:id/analytics
// @desc    Get detailed scan analytics for a specific QR code
// @access  Private
router.get('/:id/analytics', authenticateToken, async (req, res) => {
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

    const qrCodeId = qrCode._id;

    // Time-series scans (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const timeSeries = await ScanLog.aggregate([
      {
        $match: {
          qrCodeId,
          scannedAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$scannedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Device breakdown
    const devices = await ScanLog.aggregate([
      { $match: { qrCodeId } },
      { $group: { _id: '$deviceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // OS breakdown
    const os = await ScanLog.aggregate([
      { $match: { qrCodeId } },
      { $group: { _id: '$os', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Browser breakdown
    const browsers = await ScanLog.aggregate([
      { $match: { qrCodeId } },
      { $group: { _id: '$browser', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Country breakdown
    const countries = await ScanLog.aggregate([
      { $match: { qrCodeId } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      analytics: {
        timeSeries,
        devices,
        os,
        browsers,
        countries
      }
    });
  } catch (error) {
    console.error('Fetch QR code analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching analytics'
    });
  }
});

// @route   POST /api/qr-codes/bulk
// @desc    Generate bulk QR codes and download as a ZIP file
// @access  Private
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { items, format = 'png' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A list of items is required'
      });
    }

    const archiver = require('archiver');
    const QRCode = require('qrcode');

    // Create a zip archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // sets the compression level
    });

    // Handle archive errors
    archive.on('error', (err) => {
      throw err;
    });

    // Set headers
    res.attachment(`qrcodes-bulk-${Date.now()}.zip`);
    res.setHeader('Content-Type', 'application/zip');

    // Pipe archive data to the response
    archive.pipe(res);

    // Generate and add each QR to the zip
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const name = item.name ? item.name.replace(/[^a-z0-9_-]/gi, '_') : `qr_${i + 1}`;
      const content = item.content;

      if (!content) continue;

      let qrBuffer;
      let fileExtension = format === 'svg' ? 'svg' : 'png';

      if (format === 'svg') {
        const svgString = await QRCode.toString(content, { type: 'svg', margin: 2 });
        qrBuffer = Buffer.from(svgString);
      } else {
        qrBuffer = await QRCode.toBuffer(content, { type: 'png', margin: 2, width: 400 });
      }

      archive.append(qrBuffer, { name: `${name}.${fileExtension}` });
    }

    // Finalize the zip
    await archive.finalize();

  } catch (error) {
    console.error('Bulk generation error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Server error during bulk generation'
      });
    }
  }
});

module.exports = router;