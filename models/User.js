const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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
  city: {
    type: String,
    required: [true, 'Please add a city'],
    trim: true,
    default: 'Karachi'
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['rider', 'passenger', 'admin'],
    required: [true, 'Please specify user role'],
    default: 'passenger'
  },
  // Rider specific credentials
  vehicleId: {
    type: String,
    required: function() { return this.role === 'rider'; }
  },
  vehicleType: {
    type: String,
    lowercase: true,
    required: function() { return this.role === 'rider'; }
  },
  vehicleMake: {
    type: String,
    required: function() { return this.role === 'rider'; }
  },
  vehicleModel: {
    type: String,
    required: function() { return this.role === 'rider'; }
  },
  vehicleColor: {
    type: String,
    required: function() { return this.role === 'rider'; }
  },
  licenseNumber: {
    type: String,
    required: function() { return this.role === 'rider'; }
  },
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
  // Rider specific records & bonus
  bonus: {
    type: Number,
    default: 0
  },
  dailyEarnings: {
    type: Number,
    default: 0
  },
  monthlyEarnings: {
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
  profilePicture: {
    data: String,
    contentType: String
  },
  verificationCode: String,
  verificationCodeExpire: Date
}, {
  timestamps: true
});

// Encrypt password using bcrypt before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);