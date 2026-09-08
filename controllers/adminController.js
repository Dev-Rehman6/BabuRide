const User = require('../models/User');
const Rider = require('../models/Rider');
const Ride = require('../models/Ride');
const Coupon = require('../models/Coupon');
const Complaint = require('../models/Complaint');
const Pricing = require('../models/Pricing');
const { createNotification } = require('./notificationController');
const { sendComplaintInProgressEmail, sendComplaintResolvedEmail } = require('../config/email');

// --- 0. PRICING MANAGEMENT ---
exports.setPricing = async (req, res) => {
  try {
    const { vehicleType, baseFare, ratePerKM, ratePerMin, minimumFare, adminCommission } = req.body;

    const pricing = await Pricing.findOneAndUpdate(
      { vehicleType },
      { baseFare, ratePerKM, ratePerMin, minimumFare, adminCommission },
      { new: true, upsert: true }
    );

    // Create Notification for all Riders
    const riders = await User.find({ role: 'rider' });
    for (const rider of riders) {
      await createNotification(
        rider._id,
        'Pricing Update',
        `Admin has updated the pricing for ${vehicleType.toUpperCase()}s. Check your dashboard for new rates.`,
        'system'
      );
    }

    res.status(200).json({ success: true, message: 'Pricing updated successfully', data: pricing });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPricing = async (req, res) => {
  try {
    const pricing = await Pricing.find();
    res.status(200).json({ success: true, data: pricing });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 1. USER MANAGEMENT ---
exports.getUsers = async (req, res) => {
  try {
    const { role, name, city } = req.query;
    let filter = {};

    if (role && ['passenger', 'rider'].includes(role)) {
      filter.role = role;
    } else {
      filter.role = { $in: ['passenger', 'rider'] };
    }

    if (name) filter.name = { $regex: name, $options: 'i' };
    if (city) filter.city = { $regex: city, $options: 'i' };

    const users = await User.find(filter).select('-password');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 2. COUPON MANAGEMENT ---

// Create Coupon (Defaults to inactive)
exports.createDiscountCoupon = async (req, res) => {
  try {
    const { 
      code, 
      discountType, 
      customName, 
      discountPercentage, 
      maxDiscountAmount, 
      validUntil, 
      assignedToPassenger 
    } = req.body;

    const newCoupon = new Coupon({
      code,
      discountType: discountType || 'general',
      customName: discountType === 'general' ? customName : null,
      discountPercentage: Number(discountPercentage),
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
      validUntil: validUntil || null,
      status: 'inactive', // Default upon creation
      assignedToPassenger: assignedToPassenger && assignedToPassenger.trim() !== '' ? assignedToPassenger : null
    });

    await newCoupon.save();

    // Notify user(s)
    if (assignedToPassenger) {
      await createNotification(
        assignedToPassenger,
        'New Coupon for You!',
        `You've received a new discount code: ${code}. Use it on your next ride!`,
        'promo'
      );
    } else {
      // General coupon - notify all passengers (or just a few for demo)
      const passengers = await User.find({ role: 'passenger' }).limit(10);
      for (const p of passengers) {
        await createNotification(p._id, 'Special Offer!', `New coupon available: ${code}. Don't miss out!`, 'promo');
      }
    }

    return res.status(201).json({ success: true, message: 'Coupon created successfully', data: newCoupon });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get All Coupons
exports.getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find()
      .populate('assignedToPassenger', 'name email phone')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Coupon Status ('active' / 'inactive')
exports.updateCouponStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedCoupon = await Coupon.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedCoupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    if (status === 'active' || status === 'live') {
      const passengers = await User.find({ role: 'passenger' }).limit(10);
      for (const p of passengers) {
        await createNotification(p._id, 'Coupon Activated!', `Coupon ${updatedCoupon.code} is now live. Use it to save on your rides.`, 'promo');
      }
    }

    return res.status(200).json({
      success: true,
      message: `Coupon status updated to ${status}`,
      data: updatedCoupon
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Coupon
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCoupon = await Coupon.findByIdAndDelete(id);

    if (!deletedCoupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// --- 3. RIDER MANAGEMENT ---

// Get all riders with status and location
exports.getAllRiders = async (req, res) => {
  try {
    const { isActive, vehicleType, city } = req.query;
    let filter = { role: 'rider' };

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    if (vehicleType) {
      filter.vehicleType = vehicleType;
    }
    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }

    const riders = await User.find(filter).select('-password');
    
    // Add additional info for active riders
    const ridersWithInfo = riders.map(rider => {
      const riderData = rider.toObject();
      riderData.statusText = rider.isActive ? 'Active' : 'Offline';
      riderData.locationStatus = (rider.currentLocation && rider.currentLocation.latitude && rider.currentLocation.longitude) ? 'Available' : 'No Location';
      return riderData;
    });

    res.status(200).json({ 
      success: true, 
      count: ridersWithInfo.length, 
      data: ridersWithInfo 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get active riders only
exports.getActiveRiders = async (req, res) => {
  try {
    const activeRiders = await Rider.find({ 
      isActive: true,
      'currentLocation.latitude': { $ne: null },
      'currentLocation.longitude': { $ne: null }
    }).select('-password');

    const ridersWithDetails = activeRiders.map(rider => ({
      id: rider._id,
      name: rider.name,
      email: rider.email,
      phone: rider.phone,
      vehicleType: rider.vehicleType,
      vehicleMake: rider.vehicleMake,
      vehicleModel: rider.vehicleModel,
      vehicleColor: rider.vehicleColor,
      licenseNumber: rider.licenseNumber,
      currentLocation: rider.currentLocation,
      rating: rider.rating,
      totalRidesCount: rider.totalRidesCount,
      totalEarnings: rider.totalEarnings,
      lastActiveAt: rider.lastActiveAt,
      isVerified: rider.isVerified
    }));

    res.status(200).json({ 
      success: true, 
      count: ridersWithDetails.length, 
      activeRiders: ridersWithDetails 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get rider details by ID
exports.getRiderById = async (req, res) => {
  try {
    const { riderId } = req.params;
    
    const rider = await Rider.findById(riderId).select('-password');
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    // Get rider's recent rides
    const recentRides = await Ride.find({ rider: riderId })
      .populate('passenger', 'name phone')
      .sort({ createdAt: -1 })
      .limit(10);

    const riderData = {
      ...rider.toObject(),
      recentRides,
      statusText: rider.isActive ? 'Active' : 'Offline',
      locationStatus: rider.currentLocation.latitude && rider.currentLocation.longitude ? 'Available' : 'No Location'
    };

    res.status(200).json({ 
      success: true, 
      rider: riderData 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update rider verification status
exports.updateRiderVerification = async (req, res) => {
  try {
    const { riderId } = req.params;
    const { isVerified } = req.body;

    const rider = await Rider.findByIdAndUpdate(
      riderId,
      { isVerified },
      { new: true }
    ).select('-password');

    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    res.status(200).json({
      success: true,
      message: `Rider ${isVerified ? 'verified' : 'unverified'} successfully`,
      rider
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get rider statistics
exports.getRiderStatistics = async (req, res) => {
  try {
    const totalRiders = await Rider.countDocuments();
    const activeRiders = await Rider.countDocuments({ isActive: true });
    const verifiedRiders = await Rider.countDocuments({ isVerified: true });
    const bikeRiders = await Rider.countDocuments({ vehicleType: 'bike' });
    const carRiders = await Rider.countDocuments({ vehicleType: 'car' });

    // Get riders with location
    const ridersWithLocation = await Rider.countDocuments({
      'currentLocation.latitude': { $ne: null },
      'currentLocation.longitude': { $ne: null }
    });

    res.status(200).json({
      success: true,
      statistics: {
        totalRiders,
        activeRiders,
        offlineRiders: totalRiders - activeRiders,
        verifiedRiders,
        unverifiedRiders: totalRiders - verifiedRiders,
        bikeRiders,
        carRiders,
        ridersWithLocation
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add bonus to rider
exports.addRiderBonus = async (req, res) => {
  try {
    const { riderId, bonusAmount } = req.body;

    const rider = await Rider.findById(riderId);
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    // Add to daily and total earnings
    rider.dailyEarnings += Number(bonusAmount);
    rider.totalEarnings += Number(bonusAmount);
    await rider.save();

    res.status(200).json({ 
      success: true, 
      message: 'Bonus added successfully', 
      rider: {
        id: rider._id,
        name: rider.name,
        dailyEarnings: rider.dailyEarnings,
        totalEarnings: rider.totalEarnings
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 4. RIDE MANAGEMENT ---

// Get all rides with rider and passenger details
exports.getAllRides = async (req, res) => {
  try {
    const { status, vehicleType, riderId } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (vehicleType) filter.vehicleType = vehicleType;
    if (riderId) filter.rider = riderId;

    const rides = await Ride.find(filter)
      .populate('passenger', 'name phone email')
      .populate('rider', 'name phone email vehicleType vehicleMake vehicleModel vehicleColor licenseNumber currentLocation')
      .populate('chat.sender', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: rides.length,
      rides
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get ride statistics
exports.getRideStatistics = async (req, res) => {
  try {
    const totalRides = await Ride.countDocuments();
    const completedRides = await Ride.countDocuments({ status: 'completed' });
    const activeRides = await Ride.countDocuments({ 
      status: { $in: ['accepted', 'in-progress'] } 
    });
    const pendingRides = await Ride.countDocuments({ status: 'requested' });
    const cancelledRides = await Ride.countDocuments({ status: 'cancelled' });

    // Vehicle type breakdown
    const bikeRides = await Ride.countDocuments({ vehicleType: 'bike' });
    const carRides = await Ride.countDocuments({ vehicleType: 'car' });

    res.status(200).json({
      success: true,
      statistics: {
        totalRides,
        completedRides,
        activeRides,
        pendingRides,
        cancelledRides,
        bikeRides,
        carRides
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 5. OLD RIDER FEATURES (Updated to work with new Rider model) ---

exports.addRiderBonus = async (req, res) => {
  try {
    const { riderId, bonusAmount } = req.body;

    const rider = await User.findOne({ _id: riderId, role: 'rider' });
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    rider.bonus = (rider.bonus || 0) + Number(bonusAmount);
    await rider.save();

    res.status(200).json({ success: true, message: 'Bonus added successfully', rider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRiderRecord = async (req, res) => {
  try {
    const { riderId, dailyEarnings, monthlyEarnings, dailyRidesCount, monthlyRidesCount } = req.body;

    const rider = await Rider.findById(riderId);
    if (!rider) {
      return res.status(404).json({ success: false, message: 'Rider not found' });
    }

    if (dailyEarnings !== undefined) rider.dailyEarnings = dailyEarnings;
    if (monthlyEarnings !== undefined) rider.monthlyEarnings = monthlyEarnings;
    if (dailyRidesCount !== undefined) rider.dailyRidesCount = dailyRidesCount;
    if (monthlyRidesCount !== undefined) rider.monthlyRidesCount = monthlyRidesCount;

    await rider.save();
    res.status(200).json({ success: true, message: 'Rider record updated successfully', rider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 6. COMPLAINTS SYSTEM ---

exports.submitComplaint = async (req, res) => {
  try {
    const title = req.body.title || req.body.subject;
    const description = req.body.description;
    const category = req.body.category || 'General';

    const userId = req.user._id || req.user.id;
    const userRole = req.user.role;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and description'
      });
    }

    const complaint = await Complaint.create({
      raisedBy: userId,
      userRole,
      title,
      subject: title,
      description,
      category,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: complaint
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getComplaints = async (req, res) => {
  try {
    const { userRole, status } = req.query;

    let filter = {};
    if (userRole) filter.userRole = userRole;

    if (status) {
      filter.status = status;
    } else {
      filter.status = { $ne: 'resolved' };
    }

    const complaints = await Complaint.find(filter).populate('raisedBy', 'name email phone role city');

    const formattedComplaints = complaints.map(c => {
      const doc = c.toObject();
      doc.subject = doc.subject || doc.title || 'No Subject';
      return doc;
    });

    res.status(200).json({ success: true, count: formattedComplaints.length, data: formattedComplaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateComplaintStatus = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { status, adminNotes } = req.body;

    const complaint = await Complaint.findById(complaintId).populate('raisedBy', 'name email');
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const previousStatus = complaint.status;

    if (status) complaint.status = status;
    if (adminNotes) complaint.adminNotes = adminNotes;

    await complaint.save();

    if (complaint.raisedBy && complaint.raisedBy.email) {
      const userEmail = complaint.raisedBy.email;
      const userName = complaint.raisedBy.name || 'User';
      const title = complaint.subject || complaint.title || 'Complaint';

      try {
        if ((status === 'in_progress' || status === 'in-progress') && previousStatus !== status) {
          if (typeof sendComplaintInProgressEmail === 'function') {
            await sendComplaintInProgressEmail(userEmail, userName, title, adminNotes);
          }
        } else if (status === 'resolved' && previousStatus !== status) {
          if (typeof sendComplaintResolvedEmail === 'function') {
            await sendComplaintResolvedEmail(userEmail, userName, title, adminNotes);
          }
        }
      } catch (emailErr) {
        console.error('Failed to send status notification email:', emailErr);
      }
    }

    res.status(200).json({ success: true, message: 'Complaint updated successfully', complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAdminEarnings = async (req, res) => {
  try {
    const admin = await User.findById(req.user._id || req.user.id);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Dynamic calculation from completed rides to ensure consistency
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const rides = await Ride.find({ status: 'completed' });

    const dailyEarnings = rides
      .filter(r => r.completedAt >= startOfDay)
      .reduce((acc, r) => acc + (r.adminCommission || 0), 0);

    const monthlyEarnings = rides
      .filter(r => r.completedAt >= startOfMonth)
      .reduce((acc, r) => acc + (r.adminCommission || 0), 0);

    const totalSystemCommission = rides.reduce((acc, r) => acc + (r.adminCommission || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        dailyEarnings: Number(dailyEarnings.toFixed(2)),
        monthlyEarnings: Number(monthlyEarnings.toFixed(2)),
        totalSystemCommission: Number(totalSystemCommission.toFixed(2))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
