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
router.get('/admin', protect, verifyAdmin, (req, res, next) => {
  if (['super_admin', 'ops_admin'].includes(req.adminRole)) return next();
  res.status(403).json({ success: false, message: 'Access denied' });
}, getAdminTargets);

router.post('/', protect, verifyAdmin, (req, res, next) => {
  if (req.adminRole === 'ops_admin') return next();
  res.status(403).json({ success: false, message: 'Ops Admin only' });
}, createTargetBonus);

router.put('/:id/status', protect, verifyAdmin, (req, res, next) => {
  if (req.adminRole === 'ops_admin') return next();
  res.status(403).json({ success: false, message: 'Ops Admin only' });
}, updateTargetStatus);

router.delete('/:id', protect, verifyAdmin, (req, res, next) => {
  if (req.adminRole === 'ops_admin') return next();
  res.status(403).json({ success: false, message: 'Ops Admin only' });
}, deleteTarget);

module.exports = router;