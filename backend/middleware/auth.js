const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const ApiKey = require('../models/ApiKey');
const Session = require('../models/Session');

const authenticateToken = async (req, res, next) => {
  try {
    // 1. Check for API Key authentication
    let apiKeyRaw = req.headers['x-api-key'];
    
    // Check Authorization header for Bearer qrv_live_ or ApiKey qrv_live_
    const authHeader = req.headers.authorization;
    if (!apiKeyRaw && authHeader) {
      const parts = authHeader.split(' ');
      if (parts[1] && parts[1].startsWith('qrv_live_')) {
        apiKeyRaw = parts[1];
      }
    }

    if (apiKeyRaw) {
      if (!apiKeyRaw.startsWith('qrv_live_')) {
        return res.status(401).json({
          success: false,
          message: 'Invalid API key format'
        });
      }

      // Hash the key using SHA-256
      const keyHash = crypto.createHash('sha256').update(apiKeyRaw).digest('hex');
      const apiKeyDoc = await ApiKey.findOne({ keyHash });

      if (!apiKeyDoc) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or revoked API key'
        });
      }

      const user = await User.findById(apiKeyDoc.userId).select('-password');
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Associated user is inactive or not found'
        });
      }

      // Update lastUsedAt asynchronously
      apiKeyDoc.lastUsedAt = new Date();
      apiKeyDoc.save().catch(err => console.error('Error updating api key usage:', err));

      req.user = user;
      req.isApiKey = true;
      return next();
    }

    // 2. Fall back to standard JWT Token authentication
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found'
      });
    }

    // Verify the session is still active/valid in database
    const activeSession = await Session.findOne({ userId: user._id, token });
    if (!activeSession) {
      return res.status(401).json({
        success: false,
        message: 'Session has been revoked or expired. Please sign in again.'
      });
    }

    // Update session last active time asynchronously
    activeSession.lastActive = new Date();
    activeSession.save().catch(err => console.error('Error updating session last active:', err));

    req.user = user;
    req.token = token; // store current token so we can identify current session
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({
        success: false,
        message: 'Token expired'
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

module.exports = { authenticateToken };