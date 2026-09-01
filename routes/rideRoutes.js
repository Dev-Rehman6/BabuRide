const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  requestRide,
  getRideById,
  getPassengerRides,
  cancelRide,
  calculateRideFare,
  sendChatMessage,
  updateLiveLocation,
  verifyOtpAndStart,
  arriveAtPickup,
  getLastActiveRide,
  reachDestination,
  verifyCompletionOtp,
  processPayment,
  deleteRideForPassenger
} = require('../controllers/rideController');

// Passenger routes
router.post('/calculate-fare', protect, calculateRideFare);
router.get('/last-active', protect, getLastActiveRide);
router.post('/request', protect, requestRide);
router.get('/my-rides', protect, getPassengerRides);
router.delete('/my-rides/:rideId', protect, deleteRideForPassenger);
router.get('/:rideId', protect, getRideById);
router.put('/cancel/:rideId', protect, cancelRide);

// Live Ride routes
router.post('/chat', protect, sendChatMessage);
router.put('/location', protect, updateLiveLocation);
router.post('/verify-otp', protect, verifyOtpAndStart);
router.post('/arrive', protect, arriveAtPickup);
router.post('/reach-destination', protect, reachDestination);
router.post('/verify-completion', protect, verifyCompletionOtp);
router.post('/payment', protect, processPayment);

module.exports = router;