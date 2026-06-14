const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = 'mongodb+srv://akshat980jain_db_user:Mm3nsJLOWhYX39zb@cluster0.rokrvbf.mongodb.net/?appName=Cluster0';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find the first user
    const user = await User.findOne();
    if (!user) {
      console.log('No user found');
      return;
    }
    
    // 1. Explicitly set theme to 'dark' in MongoDB
    user.theme = 'dark';
    await user.save();
    console.log('Saved theme as dark in MongoDB');
    
    // 2. Simulate the PUT /profile update with only QR fields
    const updatePayload = {
      defaultQRColor: '#8b5cf6',
      defaultQRBgColor: '#ffffff'
    };
    
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
    } = updatePayload;

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
    
    console.log('Updated user.theme:', updatedUser.theme);
    
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

run();
