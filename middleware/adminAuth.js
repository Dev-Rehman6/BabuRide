const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized access' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');

    const user = await User.findById(decoded.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied: Admins only' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = verifyAdmin;