const mongoose = require('mongoose');

const targetSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  targetRides: { type: Number, required: true },
  bonusReward: { type: Number, required: true },
  validUntil: { type: Date },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isGlobal: { type: Boolean, default: true },
  status: { 
    type: String, 
    enum: ['active', 'live', 'ended', 'completed', 'expired', 'inactive'], 
    default: 'active' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Target', targetSchema);