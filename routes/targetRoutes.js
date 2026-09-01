const express = require('express');
const router = express.Router();
const {
  getRiderTargets,
  getAdminTargets,
  createTargetBonus,
  updateTargetStatus,
  deleteTarget
} = require('../controllers/targetController');

const { protect } = require('../middleware/auth');
const verifyAdmin = require('../middleware/adminAuth');

// Rider Route
router.get('/rider', protect, getRiderTargets);

// Admin Routes
router.get('/admin', protect, verifyAdmin, getAdminTargets);
router.post('/', protect, verifyAdmin, createTargetBonus);
router.put('/:id/status', protect, verifyAdmin, updateTargetStatus);
router.delete('/:id', protect, verifyAdmin, deleteTarget);

module.exports = router;