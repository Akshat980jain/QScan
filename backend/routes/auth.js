const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const ApiKey = require('../models/ApiKey');
const Session = require('../models/Session');
const { authenticateToken } = require('../middleware/auth');
const { validateUserRegistration, validateUserLogin, validateUserUpdate } = require('../middleware/validation');

function parseUA(userAgent) {
  if (!userAgent) {
    return { deviceType: 'other', os: 'unknown', browser: 'unknown' };
  }
  
  const ua = userAgent.toLowerCase();
  
  let os = 'unknown';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) os = 'iOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('win')) os = 'Windows';
  else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  
  let deviceType = 'desktop';
  if (ua.includes('mobi') || ua.includes('iphone') || ua.includes('ipod')) {
    deviceType = 'mobile';
  } else if (ua.includes('ipad') || ua.includes('tablet') || (ua.includes('android') && !ua.includes('mobi'))) {
    deviceType = 'tablet';
  }
  
  let browser = 'unknown';
  if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('chrome') && !ua.includes('chromium')) browser = 'Chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('edge') || ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';
  
  return { deviceType, os, browser };
}

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const { name, email, password, accountType, subscribeToNewsletter, agreeToTerms } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      accountType,
      subscribeToNewsletter,
      agreeToTerms
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Save session
    const userAgent = req.headers['user-agent'];
    const { deviceType, os, browser } = parseUA(userAgent);
    const ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || '127.0.0.1';
    const session = new Session({
      userId: user._id,
      token,
      ip,
      browser,
      os,
      device: deviceType === 'mobile' ? 'Mobile' : deviceType === 'tablet' ? 'Tablet' : 'Desktop'
    });
    await session.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
        subscribeToNewsletter: user.subscribeToNewsletter,
        defaultQRColor: user.defaultQRColor,
        defaultQRBgColor: user.defaultQRBgColor,
        defaultQREyeStyle: user.defaultQREyeStyle,
        defaultQRPatternStyle: user.defaultQRPatternStyle,
        receiveNotifications: user.receiveNotifications,
        theme: user.theme,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Save session
    const userAgent = req.headers['user-agent'];
    const { deviceType, os, browser } = parseUA(userAgent);
    const ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || '127.0.0.1';
    const session = new Session({
      userId: user._id,
      token,
      ip,
      browser,
      os,
      device: deviceType === 'mobile' ? 'Mobile' : deviceType === 'tablet' ? 'Tablet' : 'Desktop'
    });
    await session.save();

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
        subscribeToNewsletter: user.subscribeToNewsletter,
        defaultQRColor: user.defaultQRColor,
        defaultQRBgColor: user.defaultQRBgColor,
        defaultQREyeStyle: user.defaultQREyeStyle,
        defaultQRPatternStyle: user.defaultQRPatternStyle,
        receiveNotifications: user.receiveNotifications,
        theme: user.theme,
        twoFactorEnabled: user.twoFactorEnabled,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, validateUserUpdate, async (req, res) => {
  try {
    const { 
      name, 
      email, 
      defaultQRColor, 
      defaultQRBgColor, 
      defaultQREyeStyle, 
      defaultQRPatternStyle, 
      subscribeToNewsletter, 
      receiveNotifications,
      theme,
      twoFactorEnabled
    } = req.body;
    const user = req.user;

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken'
        });
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { 
        ...(name && { name }),
        ...(email && { email }),
        ...(defaultQRColor && { defaultQRColor }),
        ...(defaultQRBgColor && { defaultQRBgColor }),
        ...(defaultQREyeStyle && { defaultQREyeStyle }),
        ...(defaultQRPatternStyle && { defaultQRPatternStyle }),
        ...(typeof subscribeToNewsletter === 'boolean' && { subscribeToNewsletter }),
        ...(typeof receiveNotifications === 'boolean' && { receiveNotifications }),
        ...(theme && { theme }),
        ...(typeof twoFactorEnabled === 'boolean' && { twoFactorEnabled })
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during profile update'
    });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    // Validate current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password change'
    });
  }
});

// @route   GET /api/auth/sessions
// @desc    Get active login sessions
// @access  Private
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user._id }).sort({ lastActive: -1 });
    
    // Map sessions and identify which is the current one (comparing JWT token)
    const formattedSessions = sessions.map(s => ({
      _id: s._id,
      ip: s.ip,
      browser: s.browser,
      os: s.os,
      device: s.device,
      lastActive: s.lastActive,
      isCurrent: s.token === req.token
    }));

    res.json({
      success: true,
      sessions: formattedSessions
    });
  } catch (error) {
    console.error('Fetch sessions error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching sessions' });
  }
});

// @route   DELETE /api/auth/sessions
// @desc    Revoke all sessions except the current one
// @access  Private
router.delete('/sessions', authenticateToken, async (req, res) => {
  try {
    await Session.deleteMany({
      userId: req.user._id,
      token: { $ne: req.token }
    });

    res.json({
      success: true,
      message: 'Logged out of all other sessions successfully'
    });
  } catch (error) {
    console.error('Revoke other sessions error:', error);
    res.status(500).json({ success: false, message: 'Server error while revoking other sessions' });
  }
});

// @route   DELETE /api/auth/sessions/:id
// @desc    Revoke a specific session
// @access  Private
router.delete('/sessions/:id', authenticateToken, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (session.token === req.token) {
      return res.status(400).json({ success: false, message: 'Cannot revoke the current session via this endpoint. Please log out normally.' });
    }

    await Session.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    console.error('Revoke specific session error:', error);
    res.status(500).json({ success: false, message: 'Server error while revoking session' });
  }
});

// @route   GET /api/auth/apikeys
// @desc    Get all API keys
// @access  Private
router.get('/apikeys', authenticateToken, async (req, res) => {
  try {
    const keys = await ApiKey.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      apiKeys: keys
    });
  } catch (error) {
    console.error('Fetch api keys error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching API keys' });
  }
});

// @route   POST /api/auth/apikeys
// @desc    Create a new developer API key
// @access  Private
router.post('/apikeys', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'API key name is required' });
    }

    // Generate a secure random API key starting with qrv_live_
    const randomBytes = crypto.randomBytes(24).toString('hex');
    const rawKey = `qrv_live_${randomBytes}`;
    
    // Hash key using SHA-256 for secure DB storage
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = `qrv_live_***${rawKey.slice(-4)}`;

    const newKey = new ApiKey({
      userId: req.user._id,
      name: name.trim(),
      keyHash,
      prefix
    });

    await newKey.save();

    res.status(201).json({
      success: true,
      message: 'API Key generated successfully',
      apiKey: {
        _id: newKey._id,
        name: newKey.name,
        prefix: newKey.prefix,
        createdAt: newKey.createdAt,
        lastUsedAt: newKey.lastUsedAt,
        // Return rawKey ONLY once
        rawKey
      }
    });
  } catch (error) {
    console.error('Generate api key error:', error);
    res.status(500).json({ success: false, message: 'Server error while generating API key' });
  }
});

// @route   DELETE /api/auth/apikeys/:id
// @desc    Revoke an API key
// @access  Private
router.delete('/apikeys/:id', authenticateToken, async (req, res) => {
  try {
    const key = await ApiKey.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!key) {
      return res.status(404).json({ success: false, message: 'API key not found' });
    }

    res.json({
      success: true,
      message: 'API Key revoked successfully'
    });
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({ success: false, message: 'Server error while revoking API key' });
  }
});

module.exports = router;