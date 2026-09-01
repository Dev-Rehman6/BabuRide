const User = require('../models/User');
const Rider = require('../models/Rider'); // Keep it just in case, but we'll use User
const Ride = require('../models/Ride');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// @desc    Register rider
// @route   POST /api/riders/register
// @access  Public
const registerRider = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      vehicleId,
      vehicleType,
      vehicleMake,
      vehicleModel,
      vehicleColor,
      licenseNumber
    } = req.body;

    // Check if rider exists
    const existingRider = await Rider.findOne({ email });
    if (existingRider) {
      return res.status(400).json({
        success: false,
        message: 'Rider already exists with this email'
      });
    }

    // Create rider
    const rider = await Rider.create({
      name,
      email,
      phone,
      password,
      vehicleId,
      vehicleType,
      vehicleMake,
      vehicleModel,
      vehicleColor,
      licenseNumber
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: rider._id, role: 'rider' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(201).json({
      success: true,
      message: 'Rider registered successfully',
      token,
      rider: {
        id: rider._id,
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
        vehicleType: rider.vehicleType,
        isActive: rider.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login rider
// @route   POST /api/riders/login
// @access  Public
const loginRider = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find rider with password field
    const rider = await Rider.findOne({ email }).select('+password');

    if (!rider) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordCorrect = await rider.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: rider._id, role: 'rider' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      rider: {
        id: rider._id,
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
        vehicleType: rider.vehicleType,
        isActive: rider.isActive,
        currentLocation: rider.currentLocation
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Toggle rider active/offline status
// @route   PUT /api/riders/toggle-status
// @access  Private (Rider only)
const toggleRiderStatus = async (req, res) => {
  try {
    const riderId = req.user.id;
    const { isActive, latitude, longitude } = req.body;

    const updateData = { isActive };

    // If going active, update location
    if (isActive && latitude && longitude) {
      updateData.currentLocation = {
        latitude,
        longitude,
        lastUpdated: new Date()
      };
    }

    // If going offline, clear location
    if (!isActive) {
      updateData.currentLocation = {
        latitude: null,
        longitude: null,
        lastUpdated: new Date()
      };
    }

    const rider = await User.findByIdAndUpdate(riderId, updateData, { new: true });

    res.status(200).json({
      success: true,
      message: `Rider status updated to ${isActive ? 'active' : 'offline'}`,
      data: {
        id: rider._id,
        name: rider.name,
        email: rider.email,
        phone: rider.phone,
        role: rider.role,
        isActive: rider.isActive,
        currentLocation: rider.currentLocation,
        dailyEarnings: rider.dailyEarnings,
        monthlyEarnings: rider.monthlyEarnings,
        bonus: rider.bonus,
        dailyRidesCount: rider.dailyRidesCount,
        monthlyRidesCount: rider.monthlyRidesCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update rider location
// @route   PUT /api/riders/update-location
// @access  Private (Rider only)
const updateRiderLocation = async (req, res) => {
  try {
    const riderId = req.user.id;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude and longitude'
      });
    }

    const rider = await User.findByIdAndUpdate(
      riderId,
      {
        currentLocation: {
          latitude,
          longitude,
          lastUpdated: new Date()
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      currentLocation: rider.currentLocation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get available rides for rider (matching vehicle type)
// @route   GET /api/riders/available-rides
// @access  Private (Rider only)
const getAvailableRides = async (req, res) => {
  try {
    const riderId = req.user.id;
    
    // Get rider info to check vehicle type
    const rider = await User.findById(riderId);
    
    if (!rider) {
      return res.status(404).json({
        success: false,
        message: 'Rider not found'
      });
    }

    if (!rider.isActive) {
      return res.status(400).json({
        success: false,
        message: 'You must be active to see ride requests'
      });
    }

    // Find rides that match rider's vehicle type and are not assigned
    // Also ensure ride hasn't expired (2 mins timer)
    const availableRides = await Ride.find({
      vehicleType: { $regex: new RegExp('^' + rider.vehicleType + '$', 'i') },
      status: 'requested',
      rider: null,
      $or: [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: null } // Handle older rides without expiresAt
      ]
    })
    .populate('passenger', 'name phone')
    .sort({ createdAt: -1 });

    // Mark expired rides
    await Ride.updateMany(
      { status: 'requested', expiresAt: { $lte: new Date() } },
      { status: 'expired' }
    );

    res.status(200).json({
      success: true,
      count: availableRides.length,
      rides: availableRides
    });
  } catch (error) {
    console.error('Fetch Available Rides Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Accept ride request
// @route   PUT /api/riders/accept-ride/:rideId
// @access  Private (Rider only)
const acceptRide = async (req, res) => {
  try {
    const riderId = req.user.id;
    const { rideId } = req.params;

    // Check if rider is active
    const rider = await User.findById(riderId);
    if (!rider.isActive) {
      return res.status(400).json({
        success: false,
        message: 'You must be active to accept rides'
      });
    }

    // Find and update the ride
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const ride = await Ride.findOneAndUpdate(
      {
        _id: rideId,
        status: 'requested',
        rider: null,
        vehicleType: rider.vehicleType
      },
      {
        rider: riderId,
        status: 'accepted',
        acceptedAt: new Date(),
        otp: otp,
        riderLocation: rider.currentLocation
      },
      { new: true }
    ).populate('passenger', 'name phone')
     .populate('rider', 'name phone vehicleType vehicleMake vehicleModel vehicleColor licenseNumber');

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found or already accepted'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ride accepted successfully',
      ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Start ride
// @route   PUT /api/riders/start-ride/:rideId
// @access  Private (Rider only)
const startRide = async (req, res) => {
  try {
    const riderId = req.user.id;
    const { rideId } = req.params;

    const ride = await Ride.findOneAndUpdate(
      {
        _id: rideId,
        rider: riderId,
        status: 'accepted'
      },
      {
        status: 'in-progress',
        startedAt: new Date()
      },
      { new: true }
    ).populate('passenger', 'name phone');

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found or cannot be started'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ride started successfully',
      ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Complete ride
// @route   PUT /api/riders/complete-ride/:rideId
// @access  Private (Rider only)
const completeRide = async (req, res) => {
  try {
    const riderId = req.user.id;
    const { rideId } = req.params;
    const { actualDuration, passengerRating } = req.body;

    const ride = await Ride.findOneAndUpdate(
      {
        _id: rideId,
        rider: riderId,
        status: 'in-progress'
      },
      {
        status: 'completed',
        completedAt: new Date(),
        actualDuration,
        passengerRating
      },
      { new: true }
    );

    if (!ride) {
      // Check if ride exists but status is wrong
      const existingRide = await Ride.findById(rideId);
      if (existingRide && existingRide.status !== 'in-progress') {
        return res.status(400).json({
          success: false,
          message: `Cannot complete ride. Current status: ${existingRide.status}. You must verify OTP to start the trip first.`
        });
      }

      return res.status(404).json({
        success: false,
        message: 'Ride not found or cannot be completed'
      });
    }

    // Update rider earnings and statistics
    await User.findByIdAndUpdate(riderId, {
      $inc: {
        dailyEarnings: ride.fare,
        monthlyEarnings: ride.fare,
        totalEarnings: ride.fare,
        dailyRidesCount: 1,
        monthlyRidesCount: 1,
        totalRidesCount: 1
      }
    });

    res.status(200).json({
      success: true,
      message: 'Ride completed successfully',
      ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get rider's ride history
// @route   GET /api/riders/ride-history
// @access  Private (Rider only)
const getRideHistory = async (req, res) => {
  try {
    const riderId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const rides = await Ride.find({ rider: riderId })
      .populate('passenger', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Ride.countDocuments({ rider: riderId });

    res.status(200).json({
      success: true,
      count: rides.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      rides
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get rider profile
// @route   GET /api/riders/profile
// @access  Private (Rider only)
const getRiderProfile = async (req, res) => {
  try {
    const rider = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      rider
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
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
};