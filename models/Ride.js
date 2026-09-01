const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  passenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  pickup: {
    address: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  dropoff: {
    address: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  riderLocation: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null }
  },
  otp: { type: String, default: null },
  chat: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  vehicleType: { type: String, enum: ['bike', 'car'], required: true },
  fare: { type: Number, required: true },
  adminCommission: { type: Number, default: 0 },
  adminCommissionRate: { type: Number, default: 0 }, // Stores the percentage at request time
  riderProfit: { type: Number, default: 0 },
  status: { type: String, enum: ['requested', 'accepted', 'arrived', 'in-progress', 'at-destination', 'awaiting-payment', 'completed', 'cancelled', 'expired'], default: 'requested' },
  completionOtp: { type: String, default: null },
  couponUsed: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  paymentMethod: { type: String, enum: ['cash', 'card'], default: 'cash' },
  finalFare: { type: Number, default: 0 },
  isDeletedForPassenger: { type: Boolean, default: false },
  // Timestamps
  requestedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  acceptedAt: { type: Date },
  startedAt: { type: Date },
  completedAt: { type: Date },
  riderRating: { type: Number, min: 1, max: 5 },
  passengerRating: { type: Number, min: 1, max: 5 },
  // Notes
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Ride', rideSchema);