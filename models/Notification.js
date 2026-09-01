const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['system', 'ride', 'promo', 'target', 'review'],
    default: 'system'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
