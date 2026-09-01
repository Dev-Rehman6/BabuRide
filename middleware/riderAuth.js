const jwt = require('jsonwebtoken');
const User = require('../models/User');

const riderAuth = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if the user role is rider
      if (decoded.role !== 'rider') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Rider access required'
        });
      }

      // Get rider from database
      const rider = await User.findById(decoded.id);

      if (!rider) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Rider not found'
        });
      }

      req.user = rider;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = { riderAuth };
