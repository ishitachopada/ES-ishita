const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const googleAuthController = require('../controllers/googleAuthController');
const profileController = require('../controllers/profileController');
const { requireAuth, requireGuest } = require('../middleware/authMiddleware');

router.get('/login', requireGuest, authController.getLogin);
router.post('/login', requireGuest, authController.postLogin);
router.get('/register', requireGuest, authController.getRegister);
router.post('/register', requireGuest, authController.postRegister);
router.get('/logout', requireAuth, authController.logout);

// OTP verification routes
router.get('/verify-otp', requireGuest, authController.getVerifyOtp);
router.post('/verify-otp', requireGuest, authController.postVerifyOtp);

// Forgot / Reset password routes
router.get('/forgot-password', requireGuest, authController.getForgotPassword);
router.post('/forgot-password', requireGuest, authController.postForgotPassword);
router.get('/reset-password', requireGuest, authController.getResetPassword);
router.post('/reset-password', requireGuest, authController.postResetPassword);
router.post('/resend-otp', requireGuest, authController.postResendOtp);

// Google OAuth routes
router.get('/auth/google', googleAuthController.redirectToGoogle);
router.get('/auth/google/callback', googleAuthController.handleGoogleCallback);

// Profile routes
router.get('/profile', requireAuth, profileController.getProfile);
router.post('/profile/update', requireAuth, profileController.postUpdateProfile);
router.post('/profile/change-password', requireAuth, profileController.postChangePassword);
router.post('/profile/upload-photo', requireAuth, profileController.avatarUploadMiddleware, profileController.postUploadPhoto);
router.post('/profile/remove-photo', requireAuth, profileController.postRemovePhoto);

module.exports = router;