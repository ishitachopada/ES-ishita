const User = require('../models/User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Render register page
exports.getRegister = (req, res) => {
    const user = req.session.user || null;
    res.render('auth/register', { user });
};

// Handle registration (with optional confirmPassword)
exports.postRegister = async (req, res) => {
    const { username, email, password, confirmPassword, role } = req.body;

    if (typeof confirmPassword !== 'undefined' && password !== confirmPassword) {
        req.flash('error', 'Passwords do not match');
        return res.redirect('/register');
    }

    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            req.flash('error', 'Username or email already exists');
            return res.redirect('/register');
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const sessionToken = crypto.randomBytes(32).toString('hex');

        // Only allow role elevation if current session is admin; otherwise force student
        let assignedRole = 'student';
        if (req.session.user && req.session.user.role === 'admin' && (role === 'admin' || role === 'faculty' || role === 'student')) {
            assignedRole = role;
        }
        const user = new User({ username, email, password: hashedPassword, role: assignedRole, sessionToken, otp: null, isVerified: true });
        await user.save();

        req.flash('success', 'Registration successful! You can now login.');
        return res.redirect('/login');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Server error');
        return res.redirect('/register');
    }
};

// Render login page
exports.getLogin = (req, res) => {
    res.render('auth/login');
};

exports.postLogin = async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({
            $or: [{ username: username }, { email: username }]
        }).select('+password');
        
        if (!user) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/login');
        }

        if (!user.isVerified) {
            req.flash('error', 'Account not verified. Please check your email for OTP.');
            return res.redirect(`/verify-otp?email=${encodeURIComponent(user.email)}`);
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash('error', 'Invalid username or password');
            return res.redirect('/login');
        }

        const sessionToken = crypto.randomBytes(32).toString('hex');
        user.sessionToken = sessionToken;
        // Use updateOne to avoid CastError if the user document has malformed data (like department: "")
        await User.updateOne({ _id: user._id }, { $set: { sessionToken } });

        req.session.user = user;
        req.session.sessionToken = sessionToken;
        req.flash('success', 'Login successful');
        
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                req.flash('error', 'Login failed');
                return res.redirect('/login');
            }
            if (user.role === 'admin' || user.role === 'faculty') {
                return res.redirect('/admin/dashboard');
            }
            return res.redirect('/exams');
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Login failed');
        return res.redirect('/login');
    }
};

// Render OTP verification page
exports.getVerifyOtp = (req, res) => {
    req.flash('success', 'OTP verification is not required. Please login.');
    return res.redirect('/login');
};

// Handle OTP verification
exports.postVerifyOtp = async (req, res) => {
    req.flash('success', 'OTP verification is not required. Please login.');
    return res.redirect('/login');
};

// Handle logout
exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) console.error(err);
        return res.redirect('/login');
    });
};

// POST /resend-otp — resend a fresh OTP to the same email
exports.postResendOtp = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email: (email || '').toLowerCase().trim() });
        if (!user) {
            return res.json({ ok: false, error: 'Email not found.' });
        }
        if (user.authProvider === 'google') {
            return res.json({ ok: false, error: 'This account uses Google sign-in.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

        const { sendPasswordResetOtp } = require('../utils/mailer');
        await sendPasswordResetOtp(user.email, otp, user.username);

        return res.json({ ok: true, expiryTs: otpExpiry.getTime() });
    } catch (err) {
        console.error('postResendOtp error:', err);
        return res.json({ ok: false, error: 'Failed to send OTP. Please try again.' });
    }
};

// GET /forgot-password
exports.getForgotPassword = (req, res) => {
    res.render('auth/forgotPassword');
};

// POST /forgot-password  — send OTP to email
exports.postForgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        // Always show success to prevent email enumeration
        if (!user) {
            req.flash('success', 'If that email exists, an OTP has been sent.');
            return res.redirect('/forgot-password');
        }

        if (user.authProvider === 'google') {
            req.flash('error', 'This account uses Google sign-in. Reset password via Google.');
            return res.redirect('/forgot-password');
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

        const { sendPasswordResetOtp } = require('../utils/mailer');
        await sendPasswordResetOtp(user.email, otp, user.username);

        req.flash('success', 'OTP sent to your email. It expires in 10 minutes.');
        return res.redirect(`/reset-password?email=${encodeURIComponent(user.email)}`);
    } catch (err) {
        console.error('postForgotPassword error:', err);
        req.flash('error', 'Failed to send OTP. Please try again.');
        return res.redirect('/forgot-password');
    }
};

// GET /reset-password
exports.getResetPassword = async (req, res) => {
    const email = req.query.email || '';
    try {
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        // Pass the actual OTP expiry timestamp so the client timer stays accurate on refresh
        const otpExpiryTs = (user && user.otpExpiry) ? new Date(user.otpExpiry).getTime() : null;
        res.render('auth/resetPassword', { email, otpExpiryTs });
    } catch (err) {
        res.render('auth/resetPassword', { email, otpExpiryTs: null });
    }
};

// POST /reset-password  — verify OTP and set new password
exports.postResetPassword = async (req, res) => {
    const { email, otp, newPassword, confirmPassword } = req.body;
    try {
        if (!newPassword || newPassword.length < 6) {
            req.flash('error', 'Password must be at least 6 characters.');
            return res.redirect(`/reset-password?email=${encodeURIComponent(email)}`);
        }

        if (newPassword !== confirmPassword) {
            req.flash('error', 'Passwords do not match.');
            return res.redirect(`/reset-password?email=${encodeURIComponent(email)}`);
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
        if (!user) {
            req.flash('error', 'Invalid request.');
            return res.redirect('/forgot-password');
        }

        if (!user.otp || user.otp !== otp.trim()) {
            req.flash('error', 'Invalid OTP. Please check and try again.');
            return res.redirect(`/reset-password?email=${encodeURIComponent(email)}`);
        }

        if (user.otpExpiry && new Date() > user.otpExpiry) {
            req.flash('error', 'OTP has expired. Please request a new one.');
            return res.redirect('/forgot-password');
        }

        // Save new password and clear OTP
        const hashed = await bcrypt.hash(newPassword, 12);
        user.password = hashed;
        user.otp = null;
        user.otpExpiry = null;
        user.passwordChangedAt = new Date();
        await user.save();

        req.flash('success', 'Password reset successfully! Please log in with your new password.');
        return res.redirect('/login');
    } catch (err) {
        console.error('postResetPassword error:', err);
        req.flash('error', 'Failed to reset password. Please try again.');
        return res.redirect(`/reset-password?email=${encodeURIComponent(email)}`);
    }
};
