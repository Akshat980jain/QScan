const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = 'mongodb+srv://akshat980jain_db_user:Mm3nsJLOWhYX39zb@cluster0.rokrvbf.mongodb.net/?appName=Cluster0';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    const user = await User.findOne({ email: 'akshat980jain@gmail.com' });
    if (!user) {
      console.log('User not found');
      return;
    }
    console.log('User Document in MongoDB:', JSON.stringify(user.toObject(), null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
