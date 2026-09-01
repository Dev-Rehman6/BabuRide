const express = require('express');
const {
  registerRider,
  loginRider,
  toggleRiderStatus,
  updateRiderLocation,
  getAvailableRides,
  acceptRide,
  startRide,
  completeRide,
  getRideHistory,
  getRiderProfile
} = require('../controllers/riderController');
const { riderAuth } = require('../middleware/riderAuth');

const router = express.Router();

// Public routes
router.post('/register', registerRider);
router.post('/login', loginRider);

// Protected routes (require rider authentication)
router.put('/toggle-status', riderAuth, toggleRiderStatus);
router.put('/update-location', riderAuth, updateRiderLocation);
router.get('/available-rides', riderAuth, getAvailableRides);
router.put('/accept-ride/:rideId', riderAuth, acceptRide);
router.put('/start-ride/:rideId', riderAuth, startRide);
router.put('/complete-ride/:rideId', riderAuth, completeRide);
router.get('/ride-history', riderAuth, getRideHistory);
router.get('/profile', riderAuth, getRiderProfile);

module.exports = router;