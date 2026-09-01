const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const riderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number']
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  // Vehicle Information
  vehicleId: {
    type: String,
    required: [true, 'Please add vehicle ID']
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'car'],
    required: [true, 'Please specify vehicle type']
  },
  vehicleMake: {
    type: String,
    required: [true, 'Please add vehicle make']
  },
  vehicleModel: {
    type: String,
    required: [true, 'Please add vehicle model']
  },
  vehicleColor: {
    type: String,
    required: [true, 'Please add vehicle color']
  },
  licenseNumber: {
    type: String,
    required: [true, 'Please add license number']
  },
  // Status and Location
  isActive: {
    type: Boolean,
    default: false
  },
  currentLocation: {
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  // Earnings and Statistics
  dailyEarnings: {
    type: Number,
    default: 0
  },
  monthlyEarnings: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  dailyRidesCount: {
    type: Number,
    default: 0
  },
  monthlyRidesCount: {
    type: Number,
    default: 0
  },
  totalRidesCount: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 5.0,
    min: 1,
    max: 5
  },
  // Profile and Documents
  profilePicture: {
    data: String,
    contentType: String
  },
  drivingLicense: {
    data: String,
    contentType: String
  },
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationCode: String,
  verificationCodeExpire: Date,
  // Last activity tracking
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Encrypt password using bcrypt before saving
riderSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match rider entered password to hashed password in database
riderSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update last active timestamp when rider goes active
riderSchema.pre('save', function(next) {
  if (this.isModified('isActive') && this.isActive) {
    this.lastActiveAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Rider', riderSchema);