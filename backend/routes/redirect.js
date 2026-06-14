const express = require('express');
const QRCode = require('../models/QRCode');
const ScanLog = require('../models/ScanLog');

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

function parseUA(userAgent) {
  if (!userAgent) {
    return { deviceType: 'other', os: 'unknown', browser: 'unknown' };
  }
  
  const ua = userAgent.toLowerCase();
  
  // OS Detection
  let os = 'unknown';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) os = 'iOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('win')) os = 'Windows';
  else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  
  // Device Type Detection
  let deviceType = 'desktop';
  if (ua.includes('mobi') || ua.includes('iphone') || ua.includes('ipod')) {
    deviceType = 'mobile';
  } else if (ua.includes('ipad') || ua.includes('tablet') || (ua.includes('android') && !ua.includes('mobi'))) {
    deviceType = 'tablet';
  }
  
  // Browser Detection
  let browser = 'unknown';
  if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('chrome') && !ua.includes('chromium')) browser = 'Chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('edge') || ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';
  
  return { deviceType, os, browser };
}

// GET /r/:shortId
router.get('/:shortId', async (req, res) => {
  try {
    const { shortId } = req.params;
    
    const qrCode = await QRCode.findOne({ shortId, isActive: true });
    
    if (!qrCode) {
      return res.status(404).send('<h1>QR Code Not Found</h1><p>The link is invalid or has been deactivated.</p>');
    }
    
    // Increment general scan statistics
    await qrCode.incrementScanCount();
    
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
    
    // Save to ScanLog
    const scanLog = new ScanLog({
      qrCodeId: qrCode._id,
      ip,
      deviceType,
      os,
      browser,
      country,
      city
    });
    
    await scanLog.save();
    
    // Redirect to final destination
    res.redirect(302, qrCode.targetUrl);
  } catch (error) {
    console.error('Redirection error:', error);
    res.status(500).send('<h1>Server Error</h1><p>Failed to process redirection.</p>');
  }
});

module.exports = router;
