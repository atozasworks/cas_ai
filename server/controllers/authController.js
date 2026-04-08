const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DriverScore = require('../models/DriverScore');
const config = require('../config');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const signToken = (id) =>
  jwt.sign({ id }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);
  const safeUser = user.toSafeObject ? user.toSafeObject() : user;

  res.status(statusCode).json({
    success: true,
    token,
    user: safeUser,
  });
};

exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, phone } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('Email already registered', 409));
  }

  const user = await User.create({ name, email, password, phone });
  await DriverScore.create({ userId: user._id });

  sendTokenResponse(user, 201, res);
});

exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or password', 401));
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res);
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user: user.toSafeObject() });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.name = req.body.name;
  await user.save();

  res.json({
    success: true,
    user: user.toSafeObject(),
  });
});

exports.updatePreferences = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { preferences: { ...req.user.preferences, ...req.body } },
    { new: true, runValidators: true }
  );
  res.json({ success: true, preferences: user.preferences });
});

exports.addEmergencyContact = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.emergencyContacts.push(req.body);
  await user.save();
  res.status(201).json({ success: true, emergencyContacts: user.emergencyContacts });
});

exports.removeEmergencyContact = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.emergencyContacts = user.emergencyContacts.filter(
    (c) => c.phone !== req.params.phone
  );
  await user.save();
  res.json({ success: true, emergencyContacts: user.emergencyContacts });
});
