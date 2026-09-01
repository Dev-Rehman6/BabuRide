const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload = require('../config/multer');

const handleMulterError = (err, req, res, next) => {
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// Public Endpoints
router.post('/signup', upload.single('profilePicture'), handleMulterError, signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected Endpoints
router.get('/me', protect, getMe);
router.put('/update-profile', protect, upload.single('profilePicture'), handleMulterError, updateProfile);

module.exports = router;