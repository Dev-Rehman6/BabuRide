const Joi = require('joi');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationCode } = require('../config/email');

// Helper to format user object for client responses
const formatUserPayload = (user) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    adminRole: user.adminRole || null,
    profilePicture: user.profilePicture || null,
    ...(user.role === 'rider' && {
      vehicleId: user.vehicleId,
      vehicleType: user.vehicleType
    }),
    createdAt: user.createdAt
  };
};

// Generate JWT Token with shortened expiration for security hardening
const generateToken = (id, role) => {
  return jwt.sign({ id: id.toString(), role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '1h'
  });
};

// @desc    Register user (Rider or Passenger)
// @route   POST /api/auth/signup
exports.signup = async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required().trim(),
    email: Joi.string().email().required().trim().lowercase(),
    phone: Joi.string().required().trim(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({ 'any.only': 'Passwords do not match' }),
    role: Joi.string().valid('rider', 'passenger', 'admin').required(),
    vehicleId: Joi.when('role', { is: 'rider', then: Joi.string().required(), otherwise: Joi.string().optional() }),
    vehicleType: Joi.when('role', { is: 'rider', then: Joi.string().required(), otherwise: Joi.string().optional() }),
    vehicleMake: Joi.string().optional(),
    vehicleModel: Joi.string().optional(),
    vehicleColor: Joi.string().optional(),
    licenseNumber: Joi.string().optional()
  });

  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map(d => d.message).join(', ')
    });
  }

  try {
    const { name, email, phone, password, role, vehicleId, vehicleType } = value;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    let profilePicture = null;
    if (req.file) {
      profilePicture = {
        data: req.file.buffer.toString('base64'),
        contentType: req.file.mimetype
      };
    }

    const userData = {
      name,
      email,
      phone,
      password,
      role,
      profilePicture
    };

    if (role === 'rider') {
      userData.vehicleId = vehicleId;
      userData.vehicleType = vehicleType;
      userData.vehicleMake = value.vehicleMake;
      userData.vehicleModel = value.vehicleModel;
      userData.vehicleColor = value.vehicleColor;
      userData.licenseNumber = value.licenseNumber;
    }

    const user = await User.create(userData);
    const token = generateToken(user._id, user.role);

    // Send Welcome Email
    try {
      const { sendEmail } = require('../config/email');
      await sendEmail({
        email: user.email,
        subject: 'Welcome to Babu Ride!',
        message: `Hello ${user.name},\n\nWelcome to Babu Ride! We are excited to have you as a ${user.role}.`,
        html: `<h2>Welcome to Babu Ride, ${user.name}!</h2><p>You have successfully registered as a ${user.role}. We hope you enjoy your experience!</p>`
      });
    } catch (e) {
      console.error('Welcome email failed:', e);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: formatUserPayload(user)
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during registration',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  const schema = Joi.object({
    email: Joi.string().email().required().trim().lowercase(),
    password: Joi.string().required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  try {
    const { email, password } = value;

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.log(`Login failed: No user found with email ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      console.log(`Login failed: Password mismatch for user ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user._id, user.role);

    // Send Login Notification Email
    try {
      const { sendLoginNotificationEmail } = require('../config/email');
      const deviceDetails = req.headers['user-agent'] || 'Unknown Device';
      // We don't await this so it doesn't slow down the login response
      sendLoginNotificationEmail(user.email, user.name, deviceDetails);
    } catch (e) {
      console.error('Failed to send login notification email:', e);
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: formatUserPayload(user)
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message
    });
  }
};

// @desc    Forgot password - Send verification code
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email address'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email'
      });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');

    user.verificationCode = hashedCode;
    user.verificationCodeExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    try {
      await sendVerificationCode(user.email, user.name, verificationCode);

      res.status(200).json({
        success: true,
        message: 'Verification code sent to your email',
        email: user.email
      });
    } catch (emailError) {
      user.verificationCode = undefined;
      user.verificationCodeExpire = undefined;
      await user.save();

      console.error('Email send error:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Error sending email. Please try again later.'
      });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing forgot password request',
      error: error.message
    });
  }
};

// @desc    Verify code and reset password
// @route   POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword, confirmPassword } = req.body;

    if (!email || !code || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    const user = await User.findOne({
      email,
      verificationCode: hashedCode,
      verificationCodeExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    user.password = newPassword;
    user.verificationCode = undefined;
    user.verificationCodeExpire = undefined;
    await user.save();

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      token,
      user: formatUserPayload(user)
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    res.status(200).json({
      success: true,
      user: formatUserPayload(user)
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/update-profile
// @desc    Update user profile (with password verification & optional image)
// @route   PUT /api/auth/update-profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone, currentPassword, newPassword, vehicleId, vehicleType } = req.body;
    const userId = req.user._id || req.user.id;

    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Handle Password Update with Verification
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Please provide current password to update password'
        });
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Incorrect current password'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters'
        });
      }

      user.password = newPassword;
    }

    // Update Basic Fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;

    // Handle Image File Upload (Multer memoryStorage)
    if (req.file) {
      user.profilePicture = {
        data: req.file.buffer.toString('base64'),
        contentType: req.file.mimetype
      };
    }

    // Handle Rider Fields
    if (user.role === 'rider') {
      if (vehicleId) user.vehicleId = vehicleId;
      if (vehicleType) user.vehicleType = vehicleType;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: formatUserPayload(user)
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};