const Notification = require('../models/Notification');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to create notifications
exports.createNotification = async (userId, title, message, type, rideId = null) => {
  try {
    await Notification.create({
      user: userId,
      title,
      message,
      type,
      rideId
    });
  } catch (error) {
    console.error('Create Notification Error:', error);
  }
};
