const passport = require('../config/passport');
const crypto = require('crypto');

/**
 * Step 1 — Redirect user to Google's OAuth consent screen.
 * We bypass CSRF here because this is a GET redirect, not a form POST.
 */
exports.redirectToGoogle = (req, res, next) => {
    // If Google credentials are not configured, show a helpful error
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
        req.flash('error', 'Google login is not configured yet. Please use username & password.');
        return res.redirect('/login');
    }

    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false   // we manage our own session
    })(req, res, next);
};

/**
 * Step 2 — Google redirects back here after user approves.
 * Passport verifies the token, finds/creates the user,
 * then we set our own express-session just like postLogin does.
 */
exports.handleGoogleCallback = (req, res, next) => {
    passport.authenticate('google', {
        session: false,
        failureRedirect: '/login',
        failureFlash: true
    }, async (err, user, info) => {
        if (err) {
            console.error('Google OAuth error:', err);
            req.flash('error', 'Google login failed. Please try again.');
            return res.redirect('/login');
        }

        if (!user) {
            const msg = (info && info.message) || 'Google login failed.';
            req.flash('error', msg);
            return res.redirect('/login');
        }

        try {
            // Refresh session token on every login (same pattern as postLogin)
            const sessionToken = crypto.randomBytes(32).toString('hex');
            const User = require('../models/User');
            await User.updateOne({ _id: user._id }, { $set: { sessionToken } });

            req.session.user = user;
            req.session.sessionToken = sessionToken;

            req.session.save((saveErr) => {
                if (saveErr) {
                    console.error('Session save error after Google login:', saveErr);
                    req.flash('error', 'Login failed. Please try again.');
                    return res.redirect('/login');
                }

                req.flash('success', `Welcome, ${user.displayName || user.username}!`);

                if (user.role === 'admin' || user.role === 'faculty') {
                    return res.redirect('/admin/dashboard');
                }
                return res.redirect('/exams');
            });
        } catch (sessionErr) {
            console.error('Session error after Google login:', sessionErr);
            req.flash('error', 'Login failed. Please try again.');
            return res.redirect('/login');
        }
    })(req, res, next);
};
