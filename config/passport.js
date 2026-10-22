const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const crypto = require('crypto');
const User = require('../models/User');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists by googleId
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
            return done(null, user);
        }

        // Check if a local account with same email already exists
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        if (!email) {
            return done(null, false, { message: 'No email associated with this Google account.' });
        }

        user = await User.findOne({ email });

        if (user) {
            // Link Google account to existing local account
            user.googleId = profile.id;
            user.authProvider = 'google';
            if (!user.profileImage && profile.photos && profile.photos[0]) {
                user.profileImage = profile.photos[0].value;
            }
            if (!user.displayName && profile.displayName) {
                user.displayName = profile.displayName;
            }
            const sessionToken = crypto.randomBytes(32).toString('hex');
            user.sessionToken = sessionToken;
            await user.save();
            return done(null, user);
        }

        // Create a brand new account via Google
        const username = (profile.displayName || email.split('@')[0])
            .replace(/\s+/g, '_')
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '')
            .substring(0, 20) + '_' + crypto.randomBytes(3).toString('hex');

        const sessionToken = crypto.randomBytes(32).toString('hex');

        // Google users don't need a password — set a random unguessable one
        const bcrypt = require('bcrypt');
        const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);

        const newUser = new User({
            googleId: profile.id,
            username,
            email,
            password: randomPassword,
            displayName: profile.displayName || '',
            profileImage: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
            role: 'student',
            isVerified: true,
            authProvider: 'google',
            sessionToken
        });

        await newUser.save();
        return done(null, newUser);

    } catch (err) {
        return done(err, null);
    }
}));

// Serialize / deserialize are required by passport but we use our own session
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;
