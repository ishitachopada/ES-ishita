const User = require('../models/User');
const Submission = require('../models/Submission');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer config for profile photos
const avatarStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(process.cwd(), 'public', 'uploads'));
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, 'avatar-' + req.session.user._id + '-' + Date.now() + ext);
    }
});
const avatarUpload = multer({
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG, WEBP and GIF images are allowed.'));
        }
    }
});
exports.avatarUploadMiddleware = avatarUpload.single('avatar');

// GET /profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/login');
        }

        // Build stats depending on role
        let stats = { totalExams: 0, passed: 0, avgScore: 0 };
        let recentActivity = [];

        if (user.role === 'student') {
            const submissions = await Submission.find({ student: user._id })
                .populate('exam', 'title passingPercentage')
                .sort({ submittedAt: -1 });

            const submitted = submissions.filter(s => s.status === 'submitted');
            stats.totalExams = submitted.length;

            const passed = submitted.filter(s => {
                const pct = s.totalQuestions > 0 ? (s.score / s.totalQuestions) * 100 : 0;
                const threshold = (s.exam && s.exam.passingPercentage) ? s.exam.passingPercentage : 60;
                return pct >= threshold;
            });
            stats.passed = passed.length;

            const avgArr = submitted.map(s => s.totalQuestions > 0 ? Math.round((s.score / s.totalQuestions) * 100) : 0);
            stats.avgScore = avgArr.length > 0 ? Math.round(avgArr.reduce((a, b) => a + b, 0) / avgArr.length) : 0;

            recentActivity = submissions.slice(0, 5);
        } else {
            // Admin / Faculty stats
            const Exam = require('../models/Exam');
            const totalExams = await Exam.countDocuments({ createdBy: user._id });
            const activeExams = await Exam.countDocuments({ createdBy: user._id, isActive: true });
            const totalReports = await Submission.countDocuments({ status: 'submitted' });

            stats.totalExams = totalExams;
            stats.passed = activeExams;
            stats.avgScore = totalReports;

            // Recent submissions as recent activity for admin/faculty
            recentActivity = await Submission.find({ status: 'submitted' })
                .populate('exam', 'title')
                .sort({ submittedAt: -1 })
                .limit(5);
        }

        // Keep session user in sync with DB user
        req.session.user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            displayName: user.displayName,
            department: user.department,
            isVerified: user.isVerified,
            authProvider: user.authProvider,
            createdAt: user.createdAt
        };

        res.render('profile', { user, stats, recentActivity });
    } catch (err) {
        console.error('getProfile error:', err);
        req.flash('error', 'Error loading profile');
        res.redirect('/');
    }
};

// POST /profile/update
exports.postUpdateProfile = async (req, res) => {
    try {
        const { displayName, department } = req.body;

        const updated = await User.findByIdAndUpdate(
            req.session.user._id,
            {
                $set: {
                    displayName: (displayName || '').trim().substring(0, 60),
                    department: (department || '').trim().substring(0, 100)
                }
            },
            { new: true }
        );

        // Sync session
        req.session.user.displayName = updated.displayName;
        req.session.user.department = updated.department;

        req.flash('success', 'Profile updated successfully.');
        res.redirect('/profile');
    } catch (err) {
        console.error('postUpdateProfile error:', err);
        req.flash('error', 'Failed to update profile.');
        res.redirect('/profile');
    }
};

// POST /profile/change-password
exports.postChangePassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            req.flash('error', 'New password must be at least 6 characters.');
            return res.redirect('/profile');
        }

        if (newPassword !== confirmPassword) {
            req.flash('error', 'New passwords do not match.');
            return res.redirect('/profile');
        }

        const user = await User.findById(req.session.user._id).select('+password');
        if (!user) {
            req.flash('error', 'User not found.');
            return res.redirect('/profile');
        }

        // Hash and save new password (session already proves identity)
        const hashed = await bcrypt.hash(newPassword, 12);
        user.password = hashed;
        user.passwordChangedAt = new Date();
        await user.save();

        req.flash('success', 'Password changed successfully. Please login again.');
        req.session.destroy(() => res.redirect('/login'));
    } catch (err) {
        console.error('postChangePassword error:', err);
        req.flash('error', 'Failed to change password.');
        res.redirect('/profile');
    }
};

// POST /profile/upload-photo
exports.postUploadPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ ok: false, error: 'No file uploaded.' });
        }

        const user = await User.findById(req.session.user._id);
        if (!user) return res.status(404).json({ ok: false, error: 'User not found.' });

        // Delete old profile image file if it was a local upload (not a URL)
        if (user.profileImage && user.profileImage.startsWith('/uploads/')) {
            const oldPath = path.join(process.cwd(), 'public', user.profileImage);
            try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
        }

        const newImagePath = '/uploads/' + req.file.filename;
        user.profileImage = newImagePath;
        await user.save();

        // Sync session
        req.session.user.profileImage = newImagePath;

        return res.json({ ok: true, profileImage: newImagePath });
    } catch (err) {
        console.error('postUploadPhoto error:', err);
        return res.status(500).json({ ok: false, error: 'Upload failed.' });
    }
};

// POST /profile/remove-photo
exports.postRemovePhoto = async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id);
        if (!user) {
            req.flash('error', 'User not found.');
            return res.redirect('/profile');
        }

        // Delete file if local
        if (user.profileImage && user.profileImage.startsWith('/uploads/')) {
            const filePath = path.join(process.cwd(), 'public', user.profileImage);
            try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
        }

        user.profileImage = '';
        await user.save();
        req.session.user.profileImage = '';

        req.flash('success', 'Profile photo removed.');
        res.redirect('/profile');
    } catch (err) {
        console.error('postRemovePhoto error:', err);
        req.flash('error', 'Failed to remove photo.');
        res.redirect('/profile');
    }
};
