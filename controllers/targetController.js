const Target = require('../models/Target');
const Ride = require('../models/Ride');
const User = require('../models/User');
const { createNotification } = require('./notificationController');

// GET /api/targets/rider
exports.getRiderTargets = async (req, res) => {
  try {
    const riderId = req.user._id || req.user.id;

    // Get rider's ride count for today (start of day)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const ridesTodayCount = await Ride.countDocuments({
      rider: riderId,
      status: 'completed',
      completedAt: { $gte: startOfDay }
    });

    const targets = await Target.find({
      $or: [{ assignedTo: riderId }, { isGlobal: true }],
      status: { $in: ['active', 'live'] }
    });

    // Attach current progress to each target
    const dataWithProgress = targets.map(t => {
      const plain = t.toObject();
      // For daily targets, we use today's ride count.
      // In a more complex app, you might have weekly/monthly targets too.
      plain.completedRides = ridesTodayCount;
      return plain;
    });

    res.status(200).json({ success: true, count: targets.length, data: dataWithProgress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/targets/admin
exports.getAdminTargets = async (req, res) => {
  try {
    const targets = await Target.find().populate('assignedTo', 'name email phone');
    res.status(200).json({ success: true, count: targets.length, data: targets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/targets
// POST /api/targets
exports.createTargetBonus = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      targetRides, 
      requiredRides,
      bonusReward, 
      rewardAmount,
      bonus,
      validUntil, 
      assignedTo, 
      isGlobal 
    } = req.body;

    // Handle string/number payloads safely across all possible keys
    const ridesCount = Number(targetRides || requiredRides);
    const rewardValue = Number(bonusReward || rewardAmount || bonus);

    if (isNaN(ridesCount) || ridesCount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid required rides count'
      });
    }

    if (isNaN(rewardValue) || rewardValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid bonus reward amount'
      });
    }

    const target = await Target.create({
      title,
      description,
      targetRides: ridesCount,
      bonusReward: rewardValue,
      validUntil: validUntil || null,
      assignedTo: assignedTo && assignedTo.trim() !== '' ? assignedTo : null,
      isGlobal: isGlobal !== undefined ? isGlobal : !assignedTo
    });

    // Notify Rider(s)
    if (assignedTo) {
      await createNotification(assignedTo, 'New Personal Target!', `A new target has been assigned to you: ${title}. Complete ${ridesCount} rides to earn Rs. ${rewardValue}!`, 'target');
    } else {
      const riders = await User.find({ role: 'rider' }).limit(10);
      for (const r of riders) {
        await createNotification(r._id, 'New Quest Available!', `New global target: ${title}. Earn Rs. ${rewardValue} by completing ${ridesCount} rides.`, 'target');
      }
    }

    res.status(201).json({
      success: true,
      message: 'Target bonus created successfully',
      data: target
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// PUT /api/targets/:id/status
exports.updateTargetStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const target = await Target.findById(id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Target not found' });
    }

    if (status) target.status = status;
    await target.save();

    if (status === 'live' || status === 'active') {
      const riders = await User.find({ role: 'rider' }).limit(10);
      for (const r of riders) {
        await createNotification(r._id, 'Target Activated!', `Target "${target.title}" is now active. Get riding and earn!`, 'target');
      }
    }

    res.status(200).json({
      success: true,
      message: 'Target status updated successfully',
      data: target
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/targets/:id
exports.deleteTarget = async (req, res) => {
  try {
    const { id } = req.params;

    const target = await Target.findByIdAndDelete(id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Target not found' });
    }

    res.status(200).json({ success: true, message: 'Target deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};