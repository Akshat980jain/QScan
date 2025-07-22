const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-memory storage for demo (replace with MongoDB in production)
let users = [];
let qrCodes = [];
let userIdCounter = 1;
let qrIdCounter = 1;

// Helper functions
const findUserByEmail = (email) => users.find(user => user.email === email);
const findUserById = (id) => users.find(user => user._id === id);
const findQRCodesByUserId = (userId) => qrCodes.filter(qr => qr.userId === userId);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      _id: userIdCounter++,
      name,
      email,
      password: hashedPassword,
      createdAt: new Date()
    };

    users.push(user);

    // Create token
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ success: false, error: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// QR Code Routes
app.get('/api/qr-codes', authenticateToken, (req, res) => {
  try {
    const userQRCodes = findQRCodesByUserId(req.user.userId);
    res.json({
      success: true,
      qrCodes: userQRCodes
    });
  } catch (error) {
    console.error('Fetch QR codes error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/api/qr-codes', authenticateToken, (req, res) => {
  try {
    const { title, content, type, customization } = req.body;

    const qrCode = {
      _id: qrIdCounter++,
      userId: req.user.userId,
      title,
      content,
      type,
      customization,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    qrCodes.push(qrCode);

    res.status(201).json({
      success: true,
      message: 'QR code created successfully',
      qrCode
    });
  } catch (error) {
    console.error('Create QR code error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.put('/api/qr-codes/:id', authenticateToken, (req, res) => {
  try {
    const qrCodeId = parseInt(req.params.id);
    const { title, content, type, customization } = req.body;

    const qrCodeIndex = qrCodes.findIndex(qr => qr._id === qrCodeId && qr.userId === req.user.userId);
    
    if (qrCodeIndex === -1) {
      return res.status(404).json({ success: false, error: 'QR code not found' });
    }

    qrCodes[qrCodeIndex] = {
      ...qrCodes[qrCodeIndex],
      title,
      content,
      type,
      customization,
      updatedAt: new Date()
    };

    res.json({
      success: true,
      message: 'QR code updated successfully',
      qrCode: qrCodes[qrCodeIndex]
    });
  } catch (error) {
    console.error('Update QR code error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.delete('/api/qr-codes/:id', authenticateToken, (req, res) => {
  try {
    const qrCodeId = parseInt(req.params.id);
    const qrCodeIndex = qrCodes.findIndex(qr => qr._id === qrCodeId && qr.userId === req.user.userId);
    
    if (qrCodeIndex === -1) {
      return res.status(404).json({ success: false, error: 'QR code not found' });
    }

    qrCodes.splice(qrCodeIndex, 1);

    res.json({
      success: true,
      message: 'QR code deleted successfully'
    });
  } catch (error) {
    console.error('Delete QR code error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;