const express = require('express');
const QRCode = require('../models/QRCode');
const ScanLog = require('../models/ScanLog');
const parseUA = require('../utils/parseUA');

const router = express.Router();

const simulatedLocations = [
  { country: 'United States', city: 'New York' },
  { country: 'United Kingdom', city: 'London' },
  { country: 'India', city: 'New Delhi' },
  { country: 'Germany', city: 'Berlin' },
  { country: 'Canada', city: 'Toronto' },
  { country: 'Australia', city: 'Sydney' },
  { country: 'France', city: 'Paris' },
  { country: 'Japan', city: 'Tokyo' }
];

// GET /r/:shortId
router.get('/:shortId', async (req, res) => {
  try {
    const { shortId } = req.params;

    const qrCode = await QRCode.findOne({ shortId, isActive: true });

    if (!qrCode) {
      return res.status(404).send('<h1>QR Code Not Found</h1><p>The link is invalid or has been deactivated.</p>');
    }

    // Validate targetUrl before redirecting — a dynamic QR without a destination is invalid
    if (!qrCode.targetUrl) {
      return res.status(422).send('<h1>Redirect Destination Missing</h1><p>This dynamic QR code has no destination URL configured.</p>');
    }

    // Increment general scan statistics (fire-and-forget, errors logged but non-fatal)
    qrCode.incrementScanCount().catch(err => console.error('Error incrementing scan count:', err));

    // Parse user agent
    const userAgent = req.headers['user-agent'];
    const { deviceType, os, browser } = parseUA(userAgent);

    // Geolocation simulator for local/development environments
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    let country = 'unknown';
    let city = 'unknown';

    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      // Simulate random location for demo/dev purposes
      const loc = simulatedLocations[Math.floor(Math.random() * simulatedLocations.length)];
      country = loc.country;
      city = loc.city;
    }

    // Save to ScanLog (fire-and-forget — analytics failure should not block redirect)
    const scanLog = new ScanLog({
      qrCodeId: qrCode._id,
      ip,
      deviceType,
      os,
      browser,
      country,
      city
    });
    scanLog.save().catch(err => console.error('Error saving scan log:', err));

    // Redirect to final destination
    res.redirect(302, qrCode.targetUrl);
  } catch (error) {
    console.error('Redirection error:', error);
    res.status(500).send('<h1>Server Error</h1><p>Failed to process redirection.</p>');
  }
});

module.exports = router;
