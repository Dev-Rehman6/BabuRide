const mongoose = require('mongoose');

const pricingSchema = new mongoose.Schema({
  vehicleType: {
    type: String,
    enum: ['bike', 'car'],
    required: true,
    unique: true
  },
  baseFare: {
    type: Number,
    required: true,
    default: 0
  },
  ratePerKM: {
    type: Number,
    required: true,
    default: 0
  },
  ratePerMin: {
    type: Number,
    required: true,
    default: 0
  },
  minimumFare: {
    type: Number,
    required: true,
    default: 0
  },
  adminCommission: {
    type: Number, // Percentage (e.g., 20 for 20%)
    required: true,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Pricing', pricingSchema);
