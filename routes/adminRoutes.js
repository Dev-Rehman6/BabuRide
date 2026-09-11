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
  getAdminEarnings,
  getRevenueReport,
  createAdmin
} = require('../controllers/adminController');

// Helper to restrict by admin role
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.adminRole)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.adminRole} is not allowed to access this resource`
      });
    }
    next();
  };
};

// Passenger-accessible route (Protected by passenger/user JWT token)
router.get('/coupons', verifyToken, getCoupons);
router.get('/pricing', verifyToken, getPricing);

// Strictly admin-protected routes
router.use(verifyAdmin);

// Super Admin & Ops Admin can see targets/coupons/pricing
router.get('/targets', restrictTo('super_admin', 'ops_admin'));
router.get('/admin/coupons', restrictTo('super_admin', 'ops_admin'));

// Super Admin & Finance Admin can see pricing
router.get('/admin/pricing', restrictTo('super_admin', 'finance_admin'));

// Ops Admin only for writing/deleting coupons/targets
router.post('/coupons', restrictTo('ops_admin'), createDiscountCoupon);
router.patch('/coupons/:id/status', restrictTo('ops_admin'), updateCouponStatus);
router.delete('/coupons/:id', restrictTo('ops_admin'), deleteCoupon);

// Finance Admin only for pricing management
router.post('/pricing', restrictTo('finance_admin'), setPricing);

// Super Admin only for users
router.get('/users', restrictTo('super_admin'), getUsers);

// Finance Admin only for payments
router.get('/rides', restrictTo('finance_admin'), getAllRides);

// Super Admin only for earnings, reports and creating other admins
router.get('/earnings', restrictTo('super_admin'), getAdminEarnings);
router.get('/revenue-report', restrictTo('super_admin'), getRevenueReport);
router.post('/create-admin', restrictTo('super_admin'), createAdmin);

// Ops Admin only for complaints
router.get('/complaints', restrictTo('ops_admin'), getComplaints);
router.put('/complaints/:complaintId', restrictTo('ops_admin'), updateComplaintStatus);

// Rider Management (Finance/Super Admin might want this, but lets stick to plan)
router.get('/riders', restrictTo('finance_admin', 'super_admin'), getAllRiders);
router.get('/riders/active', restrictTo('finance_admin', 'super_admin'), getActiveRiders);
router.get('/riders/statistics', restrictTo('finance_admin', 'super_admin'), getRiderStatistics);
router.get('/riders/:riderId', restrictTo('finance_admin', 'super_admin'), getRiderById);
router.patch('/riders/:riderId/verification', restrictTo('ops_admin'), updateRiderVerification);
router.post('/riders/bonus', restrictTo('finance_admin'), addRiderBonus);
router.put('/riders/record', restrictTo('finance_admin'), updateRiderRecord);

module.exports = router;
