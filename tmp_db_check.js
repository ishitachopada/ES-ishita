const mongoose = require('mongoose');
const User = require('./models/User');
(async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/YOUR_DATABASE_NAME', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    const user = await User.findOne({ username: 'admin' }).select('+password');
    console.log(user ? JSON.stringify(user.toObject(), null, 2) : 'no-user');
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
