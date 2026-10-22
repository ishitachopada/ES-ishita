require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ES';

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log(`Connected to ${mongoUri}`))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

(async () => {
  try {
    const existing = await User.findOne({ username: 'admin' });
    if (existing) {
      console.log('Admin user already exists:', existing.username);
      process.exit(0);
    }

    const hash = await bcrypt.hash('ravi@0320', 12);

    const admin = new User({
      username: 'admin',
      email: 'admin@gmail.com',
      password: hash,
      role: 'admin',
      department: null,
      isVerified: true
    });

    await admin.save();

    console.log('✅ Admin created successfully');
    console.log('Username : admin');
    console.log('Password : ravi@0320');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();