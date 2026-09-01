const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  discountType: { 
    type: String, 
    enum: ['weekly', 'km_based', 'general'], 
    default: 'general' 
  },
  status: { 
  type: String, 
  enum: ['inactive', 'active'], 
  default: 'inactive' 
},
  customName: { type: String, default: null }, // Used when discountType === 'general'
  discountPercentage: { type: Number, required: true },
  maxDiscountAmount: { type: Number, default: null },
  validUntil: { type: Date },
  assignedToPassenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);