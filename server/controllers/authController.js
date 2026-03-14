const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const DriverScore = require('../models/DriverScore');
const config = require('../config');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../middleware/logger');

const googleClient = new OAuth2Client();
const getGoogleAudiences = () =>
  (config.google.clientIds && config.google.clientIds.length
    ? config.google.clientIds
    : [config.google.clientId]).filter(Boolean);

const decodeJwtPayload = (token) => {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch (_) {
    return null;
  }
};

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

const hashOtp = (otp) =>
  crypto.createHash('sha256').update(String(otp)).digest('hex');

const generateOtp = () =>
  String(Math.floor(100000 + Math.random() * 900000));

const OTP_TTL_MS = 10 * 60 * 1000;
const pendingSignupOtps = new Map();

const normalizeEmail = (email) =>
  String(email || '').trim().toLowerCase();

const clearExpiredSignupOtps = () => {
  const now = Date.now();
  for (const [email, item] of pendingSignupOtps.entries()) {
    if (!item || item.expiresAt <= now) {
      pendingSignupOtps.delete(email);
    }
  }
};

const sendOtpEmail = async (email, otp) => {
  const smtpService = process.env.SMTP_SERVICE || '';
  const smtpName = process.env.SMTP_NAME || undefined;
  const smtpHost = process.env.SMTP_SERVER || process.env.SMTP_HOST || (smtpService === 'gmail' ? 'smtp.gmail.com' : undefined);
  const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;
  const smtpSecure = process.env.SMTP_SECURE === 'true';
  const smtpUser = process.env.SMTP_EMAIL || process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_EMAIL_PASSWORD || process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser || 'Collision Avoidance System <no-reply@cas.local>';
  const tlsRejectUnauthorized = process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false';

  if (!smtpUser || !smtpPass) {
    return { sent: false, reason: 'SMTP_EMAIL/SMTP_USER or SMTP_EMAIL_PASSWORD/SMTP_PASS is missing in server/.env' };
  }
  if (!smtpService && !smtpHost) {
    return { sent: false, reason: 'Set SMTP_SERVER (or SMTP_HOST) in server/.env' };
  }

  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (err) {
    return { sent: false, reason: `nodemailer not installed (${err.message})` };
  }

  const transportOptions = smtpService
    ? {
      service: smtpService,
      name: smtpName,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: tlsRejectUnauthorized },
    }
    : {
      name: smtpName,
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: tlsRejectUnauthorized },
    };

  const transporter = nodemailer.createTransport(transportOptions);

  try {
    await transporter.verify();
    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'Your CAS login OTP',
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
      html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
    });
  } catch (err) {
    return { sent: false, reason: err.message || 'SMTP send failed' };
  }

  return { sent: true };
};

exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, phone } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('Email already registered', 409));
  }

  const generatedPassword = password || crypto.randomBytes(24).toString('hex');
  const user = await User.create({ name, email, password: generatedPassword, phone });
  await DriverScore.create({ userId: user._id });

  sendTokenResponse(user, 201, res);
});

exports.requestOtp = asyncHandler(async (req, res, next) => {
  const email = normalizeEmail(req.body.email);
  const purpose = req.body.purpose || 'login';

  const user = await User.findOne({ email });
  if (purpose === 'login' && !user) {
    return next(new AppError('Email not registered. Please sign up.', 404));
  }
  if (purpose === 'signup' && user) {
    return next(new AppError('Email already registered. Please sign in.', 409));
  }

  const otp = generateOtp();
  if (purpose === 'login') {
    user.loginOtpHash = hashOtp(otp);
    user.loginOtpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
    await user.save({ validateBeforeSave: false });
  } else {
    clearExpiredSignupOtps();
    pendingSignupOtps.set(email, {
      otpHash: hashOtp(otp),
      expiresAt: Date.now() + OTP_TTL_MS,
    });
  }

  const emailResult = await sendOtpEmail(email, otp);
  if (!emailResult.sent) {
    return next(new AppError(`Unable to send OTP email: ${emailResult.reason}`, 500));
  }

  res.json({
    success: true,
    message: 'OTP sent to your email',
  });
});

exports.login = asyncHandler(async (req, res, next) => {
  const email = normalizeEmail(req.body.email);
  const { otp } = req.body;

  const user = await User.findOne({ email }).select('+loginOtpHash +loginOtpExpiresAt');
  const isValidOtp = Boolean(
    user
      && user.loginOtpHash
      && user.loginOtpExpiresAt
      && user.loginOtpExpiresAt.getTime() > Date.now()
      && user.loginOtpHash === hashOtp(otp)
  );
  if (!isValidOtp) {
    return next(new AppError('Invalid or expired OTP', 401));
  }

  user.loginOtpHash = undefined;
  user.loginOtpExpiresAt = undefined;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res);
});

exports.registerWithOtp = asyncHandler(async (req, res, next) => {
  const email = normalizeEmail(req.body.email);
  const { name, phone, otp } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('Email already registered. Please sign in.', 409));
  }

  clearExpiredSignupOtps();
  const pending = pendingSignupOtps.get(email);
  const isValidOtp = Boolean(
    pending
      && pending.otpHash
      && pending.expiresAt > Date.now()
      && pending.otpHash === hashOtp(otp)
  );
  if (!isValidOtp) {
    return next(new AppError('Invalid or expired OTP', 401));
  }

  pendingSignupOtps.delete(email);

  const generatedPassword = crypto.randomBytes(24).toString('hex');
  const user = await User.create({ name, email, password: generatedPassword, phone });
  await DriverScore.create({ userId: user._id });

  sendTokenResponse(user, 201, res);
});

exports.verifySignupOtp = asyncHandler(async (req, res, next) => {
  const email = normalizeEmail(req.body.email);
  const { otp } = req.body;

  clearExpiredSignupOtps();
  const pending = pendingSignupOtps.get(email);
  const isValidOtp = Boolean(
    pending
      && pending.otpHash
      && pending.expiresAt > Date.now()
      && pending.otpHash === hashOtp(otp)
  );
  if (!isValidOtp) {
    return next(new AppError('Invalid or expired OTP', 401));
  }

  // Mark as verified but don't consume — registerWithOtp will consume it
  pending.verified = true;

  res.json({ success: true, verified: true });
});

exports.googleAuth = asyncHandler(async (req, res, next) => {
  const { credential } = req.body;
  const allowedAudiences = getGoogleAudiences();

  if (!credential) {
    return next(new AppError('Google credential is required', 400));
  }
  if (allowedAudiences.length === 0) {
    return next(new AppError('Google Sign-In is not configured on the server', 500));
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: allowedAudiences,
    });
    payload = ticket.getPayload();
  } catch (err) {
    const decodedPayload = decodeJwtPayload(credential);
    logger.warn('Google credential verification failed', {
      reason: err.message,
      tokenAud: decodedPayload?.aud,
      tokenIss: decodedPayload?.iss,
      allowedAudiences,
    });

    const detailedMessage = config.server.env === 'development'
      ? `Invalid Google credential: ${err.message}`
      : 'Invalid Google credential';
    return next(new AppError(detailedMessage, 401));
  }

  if (!payload?.email || payload.email_verified === false) {
    return next(new AppError('Google account email is not verified', 401));
  }

  const email = payload.email.toLowerCase();
  const googleName = payload.name || '';

  let user = await User.findOne({ email });
  if (user) {
    // Existing user — log them in
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });
    return sendTokenResponse(user, 200, res);
  }

  // New user — create account
  const generatedPassword = crypto.randomBytes(24).toString('hex');
  user = await User.create({
    name: googleName,
    email,
    password: generatedPassword,
    phone: '',
  });
  await DriverScore.create({ userId: user._id });

  sendTokenResponse(user, 201, res);
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user: user.toSafeObject() });
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
