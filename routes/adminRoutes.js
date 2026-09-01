const express = require('express');
const router = express.Router();

// Destructure 'protect' from auth.js and alias it to verifyToken
const { protect: verifyToken } = require('../middleware/auth');
const verifyAdmin = require('../middleware/adminAuth');

const {
  getUsers,
  createDiscountCoupon,
  getCoupons,
  updateCouponStatus,
  deleteCoupon,
  getAllRiders,
  getActiveRiders,
  getRiderById,
  updateRiderVerification,
  getRiderStatistics,
  addRiderBonus,
  updateRiderRecord,
  getAllRides,
  getRideStatistics,
  getComplaints,
  updateComplaintStatus,
  setPricing,
  getPricing,
  getAdminEarnings
} = require('../controllers/adminController');

// Passenger-accessible route (Protected by passenger/user JWT token)
router.get('/coupons', verifyToken, getCoupons);
router.get('/pricing', verifyToken, getPricing);

// Strictly admin-protected routes
router.use(verifyAdmin);

router.post('/pricing', setPricing);
router.get('/users', getUsers);
router.post('/coupons', createDiscountCoupon);
router.patch('/coupons/:id/status', updateCouponStatus);
router.delete('/coupons/:id', deleteCoupon);

// Rider Management Routes
router.get('/riders', getAllRiders);
router.get('/riders/active', getActiveRiders);
router.get('/riders/statistics', getRiderStatistics);
router.get('/riders/:riderId', getRiderById);
router.patch('/riders/:riderId/verification', updateRiderVerification);
router.post('/riders/bonus', addRiderBonus);
router.put('/riders/record', updateRiderRecord);

// Ride Management Routes
router.get('/rides', getAllRides);
router.get('/rides/statistics', getRideStatistics);
router.get('/earnings', getAdminEarnings);

router.get('/complaints', getComplaints);
router.put('/complaints/:complaintId', updateComplaintStatus);

module.exports = router;