const Ride = require('../models/Ride');
const Rider = require('../models/Rider');
const Pricing = require('../models/Pricing');

// Helper: Calculate fare
const calculateFare = async (vehicleType, distance, duration) => {
  const pricing = await Pricing.findOne({ vehicleType });
  if (!pricing) return null;

  let totalFare = pricing.baseFare + (distance * pricing.ratePerKM) + (duration * pricing.ratePerMin);

  if (totalFare < pricing.minimumFare) {
    totalFare = pricing.minimumFare;
  }

  const adminCommissionAmount = (totalFare * pricing.adminCommission) / 100;
  const riderProfit = totalFare - adminCommissionAmount;

  return {
    totalFare: Math.round(totalFare),
    adminCommission: Math.round(adminCommissionAmount),
    adminCommissionRate: pricing.adminCommission, // Pass the percentage rate
    riderProfit: Math.round(riderProfit)
  };
};

exports.calculateRideFare = async (req, res) => {
  try {
    const { vehicleType, distance, duration } = req.body;
    const fareDetails = await calculateFare(vehicleType, distance, duration);

    if (!fareDetails) {
      return res.status(404).json({ success: false, message: 'Pricing not found for this vehicle type' });
    }

    res.status(200).json({ success: true, data: fareDetails });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.requestRide = async (req, res) => {
  try {
    const { pickup, dropoff, vehicleType, distance, estimatedDuration } = req.body;
    const passengerId = req.user._id || req.user.id;

    if (!pickup || !dropoff || !vehicleType) {
      return res.status(400).json({ success: false, message: 'Pickup, drop-off, and vehicle type are required.' });
    }

    // Enforcement: Only Karachi locations allowed
    // Using a more flexible check (Regex) to handle variations like "Karāchi" or Urdu text
    const karachiRegex = /karachi|کراچی|karach/i;
    const isKarachiPickup = karachiRegex.test(pickup.address) ||
                          (pickup.latitude >= 24.7 && pickup.latitude <= 25.1 && pickup.longitude >= 66.8 && pickup.longitude <= 67.3);
    const isKarachiDropoff = karachiRegex.test(dropoff.address) ||
                           (dropoff.latitude >= 24.7 && dropoff.latitude <= 25.1 && dropoff.longitude >= 66.8 && dropoff.longitude <= 67.3);

    if (!isKarachiPickup || !isKarachiDropoff) {
      return res.status(400).json({
        success: false,
        message: 'Services are only available within Karachi. Please select locations within the city.'
      });
    }

    const fareDetails = await calculateFare(vehicleType, distance !== undefined ? distance : 2, estimatedDuration !== undefined ? estimatedDuration : 5);

    if (!fareDetails) {
      return res.status(404).json({ success: false, message: 'Pricing configuration error' });
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    const newRide = await Ride.create({
      passenger: passengerId,
      pickup,
      dropoff,
      vehicleType,
      fare: fareDetails.totalFare,
      adminCommission: fareDetails.adminCommission,
      adminCommissionRate: fareDetails.adminCommissionRate,
      riderProfit: fareDetails.riderProfit,
      distance: distance !== undefined ? distance : 2,
      estimatedDuration: estimatedDuration !== undefined ? estimatedDuration : 5,
      expiresAt,
      status: 'requested'
    });

    console.log(`New Ride Request: ${vehicleType} from ${pickup.address} to ${dropoff.address}, fare: ${fareDetails.totalFare}`);

    res.status(201).json({ success: true, message: 'Ride requested successfully', data: newRide });
  } catch (error) {
    console.error('Ride Request Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get ride details by ID
exports.getRideById = async (req, res) => {
  try {
    const { rideId } = req.params;

    const ride = await Ride.findById(rideId)
      .populate('passenger', 'name phone email')
      .populate('rider', 'name phone email vehicleType vehicleMake vehicleModel vehicleColor licenseNumber currentLocation')
      .populate('chat.sender', 'name role');

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    res.status(200).json({ success: true, ride });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get passenger's ride history
exports.getPassengerRides = async (req, res) => {
  try {
    const passengerId = req.user._id || req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const rides = await Ride.find({ passenger: passengerId, isDeletedForPassenger: false })
      .populate('passenger', 'name phone')
      .populate('rider', 'name phone vehicleType vehicleMake vehicleModel vehicleColor licenseNumber rating')
      .populate('chat.sender', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Ride.countDocuments({ passenger: passengerId });

    res.status(200).json({
      success: true,
      count: rides.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      rides
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel ride (passenger)
exports.cancelRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const passengerId = req.user._id || req.user.id;

    const ride = await Ride.findOneAndUpdate(
      {
        _id: rideId,
        passenger: passengerId,
        status: { $in: ['requested', 'accepted'] }
      },
      {
        status: 'cancelled'
      },
      { new: true }
    );

    if (!ride) {
      return res.status(404).json({ 
        success: false, 
        message: 'Ride not found or cannot be cancelled' 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Ride cancelled successfully', 
      ride 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLastActiveRide = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const role = req.user.role;

    let filter = {};
    if (role === 'rider') {
      filter = { rider: userId, status: { $in: ['accepted', 'arrived', 'in-progress'] } };
    } else {
      filter = { passenger: userId, status: { $in: ['requested', 'accepted', 'arrived', 'in-progress'] } };
    }

    const ride = await Ride.findOne(filter)
      .populate('passenger', 'name phone')
      .populate('rider', 'name phone vehicleType vehicleMake vehicleModel vehicleColor licenseNumber')
      .populate('chat.sender', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, ride });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- LIVE RIDE FEATURES ---

exports.sendChatMessage = async (req, res) => {
  try {
    const { rideId, message } = req.body;
    const senderId = req.user._id || req.user.id;

    const ride = await Ride.findByIdAndUpdate(
      rideId,
      {
        $push: {
          chat: { sender: senderId, message, timestamp: new Date() }
        }
      },
      { new: true }
    ).populate('chat.sender', 'name');

    res.status(200).json({ success: true, chat: ride.chat });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateLiveLocation = async (req, res) => {
  try {
    const { rideId, latitude, longitude } = req.body;

    const ride = await Ride.findByIdAndUpdate(
      rideId,
      {
        riderLocation: { latitude, longitude }
      },
      { new: true }
    );

    res.status(200).json({ success: true, riderLocation: ride.riderLocation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyOtpAndStart = async (req, res) => {
  try {
    const { rideId, otp } = req.body;
    const riderId = req.user._id || req.user.id;

    const ride = await Ride.findOne({ _id: rideId, rider: riderId });

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    if (ride.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please ask the passenger for the correct code.' });
    }

    ride.status = 'in-progress';
    ride.startedAt = new Date();
    await ride.save();

    const populatedRide = await Ride.findById(rideId)
      .populate('passenger', 'name phone email')
      .populate('rider', 'name phone email vehicleType vehicleMake vehicleModel vehicleColor licenseNumber currentLocation')
      .populate('chat.sender', 'name role');

    res.status(200).json({ success: true, message: 'OTP Verified. Ride Started!', ride: populatedRide });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.arriveAtPickup = async (req, res) => {
  try {
    const { rideId } = req.body;
    const riderId = req.user._id || req.user.id;

    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, rider: riderId, status: 'accepted' },
      { status: 'arrived' },
      { new: true }
    ).populate('passenger', 'name phone email')
     .populate('rider', 'name phone email vehicleType vehicleMake vehicleModel vehicleColor licenseNumber currentLocation')
     .populate('chat.sender', 'name role');

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found or status cannot be changed.' });
    }

    res.status(200).json({ success: true, message: 'Rider has arrived at the pickup spot!', ride });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.reachDestination = async (req, res) => {
  try {
    const { rideId } = req.body;
    const riderId = req.user._id || req.user.id;

    const completionOtp = Math.floor(100000 + Math.random() * 900000).toString();

    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, rider: riderId, status: 'in-progress' },
      {
        status: 'at-destination',
        completionOtp: completionOtp
      },
      { new: true }
    ).populate('passenger', 'name phone email')
     .populate('rider', 'name phone email vehicleType vehicleMake vehicleModel vehicleColor licenseNumber currentLocation')
     .populate('chat.sender', 'name role');

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found or trip not in progress.' });
    }

    res.status(200).json({ success: true, message: 'Reached destination! Please ask passenger for Completion OTP.', ride });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyCompletionOtp = async (req, res) => {
  try {
    const { rideId, otp } = req.body;
    const riderId = req.user._id || req.user.id;

    const ride = await Ride.findOne({ _id: rideId, rider: riderId, status: 'at-destination' });

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' });
    }

    if (ride.completionOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid Completion OTP.' });
    }

    ride.status = 'awaiting-payment';
    await ride.save();

    const populatedRide = await Ride.findById(rideId)
      .populate('passenger', 'name phone email')
      .populate('rider', 'name phone email vehicleType vehicleMake vehicleModel vehicleColor licenseNumber currentLocation')
      .populate('chat.sender', 'name role');

    res.status(200).json({ success: true, message: 'OTP Verified! Waiting for payment.', ride: populatedRide });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteRideForPassenger = async (req, res) => {
  try {
    const { rideId } = req.params;
    const passengerId = req.user._id || req.user.id;

    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, passenger: passengerId },
      { isDeletedForPassenger: true },
      { new: true }
    );

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    res.status(200).json({ success: true, message: 'Ride history item deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const Coupon = require('../models/Coupon');
const User = require('../models/User');
const { createNotification } = require('./notificationController');

exports.processPayment = async (req, res) => {
  try {
    const { rideId, paymentMethod, couponCode, rating, cardNumber, expiryDate, cvc } = req.body;
    const passengerId = req.user._id || req.user.id;

    const ride = await Ride.findOne({ _id: rideId, passenger: passengerId, status: 'awaiting-payment' });

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found or payment already processed.' });
    }

    // Mock Card Validation (Stripe Simulation)
    if (paymentMethod === 'card') {
      if (!cardNumber || cardNumber.length < 16 || !cvc || !expiryDate) {
        return res.status(400).json({ success: false, message: 'Invalid card details provided.' });
      }
      // In a real app, you'd call stripe.charges.create here
    }

    let finalFare = ride.fare;
    let couponId = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode, status: 'live' });
      if (coupon) {
        // Simple logic: apply percentage discount
        const discount = (finalFare * coupon.discountPercentage) / 100;
        finalFare = Math.max(0, finalFare - discount);
        couponId = coupon._id;
      } else {
        return res.status(400).json({ success: false, message: 'Invalid or expired coupon code.' });
      }
    }

    // Update Ride
    const adminCommissionPercentage = ride.adminCommissionRate || 20; // Use stored rate
    const adminShare = (finalFare * adminCommissionPercentage) / 100;
    const riderShare = finalFare - adminShare;

    ride.finalFare = finalFare;
    ride.adminCommission = adminShare;
    ride.riderProfit = riderShare;
    ride.paymentMethod = paymentMethod;
    ride.paymentStatus = 'paid';
    ride.status = 'completed';
    ride.completedAt = new Date();
    ride.couponUsed = couponId;
    ride.passengerRating = rating || 5;
    await ride.save();

    const populatedRide = await Ride.findById(rideId)
      .populate('passenger', 'name phone email')
      .populate('rider', 'name phone email vehicleType vehicleMake vehicleModel vehicleColor licenseNumber currentLocation')
      .populate('chat.sender', 'name role');

    // Update Rider Earnings & Daily Targets
    const rider = await User.findById(ride.rider);
    if (rider) {
      rider.dailyEarnings += riderShare;
      rider.monthlyEarnings += riderShare;
      rider.totalEarnings = (rider.totalEarnings || 0) + riderShare;

      // Increment ride counts for daily target tracking
      rider.dailyRidesCount += 1;
      rider.monthlyRidesCount += 1;
      rider.totalRidesCount = (rider.totalRidesCount || 0) + 1;

      await rider.save();
    }

    // Update Admin Earnings
    const admins = await User.find({ role: 'admin' });
    if (admins && admins.length > 0) {
      for (const admin of admins) {
        admin.dailyEarnings += adminShare;
        admin.monthlyEarnings += adminShare;
        // Also update total system earnings if needed
        await admin.save();
      }
    }

    // Create Notification for Passenger
    await createNotification(
      passengerId,
      'Ride Completed!',
      `Hope you had a great ride to ${ride.dropoff.address}. How was your experience? If you have any issues, please report via Help.`,
      'review',
      rideId
    );

    res.status(200).json({ success: true, message: 'Payment successful! Ride completed.', ride: populatedRide });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
