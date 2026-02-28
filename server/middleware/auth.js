const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('./errorHandler');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Not authorized — no token provided', 401));
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new AppError('User associated with this token no longer exists', 401));
    }

    req.user = user;
    next();
  } catch (err) {
    next(new AppError('Not authorized — token invalid', 401));
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('Insufficient permissions for this action', 403));
  }
  next();
};

module.exports = { protect, authorize };
