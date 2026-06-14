const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

const MONGODB_URI = 'mongodb+srv://akshat980jain_db_user:Mm3nsJLOWhYX39zb@cluster0.rokrvbf.mongodb.net/?appName=Cluster0';
const JWT_SECRET = 'your-secret-key';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    // Find the first user
    const user = await User.findOne({ email: 'akshat980jain@gmail.com' });
    if (!user) {
      console.log('No user found');
      return;
    }
    
    // Force theme to 'light' first in the database
    user.theme = 'light';
    await user.save();
    console.log('Database theme forced to:', user.theme);
    
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    
    // Save session in database
    const session = new Session({
      userId: user._id,
      token: token,
      ip: '127.0.0.1',
      browser: 'NodeFetch',
      os: 'Windows',
      device: 'Desktop'
    });
    await session.save();
    
    // Disconnect so fetch doesn't block mongoose connection
    await mongoose.disconnect();
    
    // Send PUT request to local API server without sending theme
    const response = await fetch('http://localhost:5000/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        defaultQRColor: '#2563EB',
        defaultQRBgColor: '#F3F4F6',
        defaultQREyeStyle: 'rounded',
        defaultQRPatternStyle: 'line'
      })
    });
    
    const result = await response.json();
    console.log('API Response Status:', response.status);
    console.log('API Response Theme:', result.user ? result.user.theme : 'NO USER IN RESPONSE');
    
    // Connect again to clean up session
    await mongoose.connect(MONGODB_URI);
    await Session.deleteOne({ _id: session._id });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
