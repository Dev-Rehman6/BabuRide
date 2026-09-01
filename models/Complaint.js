const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userRole: { type: String, required: true },
  title: { type: String },
  subject: { type: String },
  description: { type: String, required: true },
  category: { type: String, default: 'General' },
  status: { 
    type: String, 
    enum: ['pending', 'in-progress', 'in_progress', 'resolved', 'closed'], 
    default: 'pending' 
  },
  adminNotes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);