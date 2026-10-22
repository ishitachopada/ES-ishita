const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

(async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/ES');
        console.log('Connected to DB');

        const username = 'admin'; // test username
        const password = 'ravi@0320'; // assumed password based on createadmin.js

        const user = await User.findOne({
            $or: [{ username: username }, { email: username }]
        }).select('+password');

        if (!user) {
            console.log('User not found');
            process.exit(0);
        }
        console.log('User found:', user.username);

        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', isMatch);

        const sessionToken = crypto.randomBytes(32).toString('hex');
        user.sessionToken = sessionToken;
        await user.save();
        console.log('User saved successfully');
        
        process.exit(0);
    } catch (err) {
        console.error('Error occurred:', err);
        process.exit(1);
    }
})();
