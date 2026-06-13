const express = require('express');
const ScanHistory = require('../models/ScanHistory');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/scan-history
// @desc    Save a scanned QR code to history
// @access  Private
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { content, type } = req.body;

        if (!content) {
            return res.status(400).json({
                success: false,
                message: 'Content is required'
            });
        }

        const scan = await ScanHistory.addScan(req.user._id, content, type || 'unknown');

        res.status(201).json({
            success: true,
            message: 'Scan saved to history',
            scan
        });
    } catch (error) {
        console.error('Save scan history error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while saving scan'
        });
    }
});

// @route   GET /api/scan-history
// @desc    Get scan history for the authenticated user
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const scans = await ScanHistory.find({ userId: req.user._id })
            .sort({ scannedAt: -1 })
            .limit(parseInt(limit));

        res.json({
            success: true,
            scans,
            count: scans.length
        });
    } catch (error) {
        console.error('Get scan history error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching scan history'
        });
    }
});

// @route   DELETE /api/scan-history/:id
// @desc    Delete a specific scan from history
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const scan = await ScanHistory.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!scan) {
            return res.status(404).json({
                success: false,
                message: 'Scan not found'
            });
        }

        res.json({
            success: true,
            message: 'Scan deleted from history'
        });
    } catch (error) {
        console.error('Delete scan error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting scan'
        });
    }
});

// @route   DELETE /api/scan-history
// @desc    Clear all scan history for the user
// @access  Private
router.delete('/', authenticateToken, async (req, res) => {
    try {
        await ScanHistory.deleteMany({ userId: req.user._id });

        res.json({
            success: true,
            message: 'Scan history cleared'
        });
    } catch (error) {
        console.error('Clear history error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while clearing history'
        });
    }
});

module.exports = router;
