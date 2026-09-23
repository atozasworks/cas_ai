const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const RiskEvent = require('../models/RiskEvent');
const Incident = require('../models/Incident');
const EmergencyContact = require('../models/EmergencyContact');
const AdminSettings = require('../models/AdminSettings');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.getDashboard = asyncHandler(async (req, res) => {
  const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MS);

  const [
    totalUsers,
    activeUsers,
    blockedUsers,
    totalAlerts,
    highRiskAlerts,
    openIncidents,
    recentAlerts,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: { $ne: false }, lastLogin: { $gte: activeSince } }),
    User.countDocuments({ isActive: false }),
    RiskEvent.countDocuments(),
    RiskEvent.countDocuments({ riskLevel: 'high' }),
    Incident.countDocuments({ status: { $in: ['detected', 'confirmed', 'responding'] } }),
    RiskEvent.find()
      .sort({ timestamp: -1 })
      .limit(8)
      .populate('userId', 'name email')
      .populate('vehicleId', 'plateNumber type')
      .lean(),
  ]);

  res.json({
    success: true,
    dashboard: {
      totalUsers,
      activeUsers,
      blockedUsers,
      totalAlerts,
      highRiskAlerts,
      openIncidents,
      recentAlerts,
    },
  });
});

exports.getUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const search = String(req.query.search || '').trim();
  const status = String(req.query.status || '').trim();
  const role = String(req.query.role || '').trim();

  const filter = {};
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  if (status === 'blocked') filter.isActive = false;
  if (status === 'active') filter.isActive = { $ne: false };
  if (role) filter.role = role;

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    count: users.length,
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
    users,
  });
});

exports.getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) return next(new AppError('User not found', 404));

  const [vehicles, recentAlerts, incidentCount] = await Promise.all([
    Vehicle.find({ owner: user._id }).select('plateNumber type make model isActive').lean(),
    RiskEvent.find({ userId: user._id }).sort({ timestamp: -1 }).limit(10).lean(),
    Incident.countDocuments({ userId: user._id }),
  ]);

  res.json({
    success: true,
    user: {
      ...user,
      vehicles,
      recentAlerts,
      incidentCount,
    },
  });
});

exports.setUserBlocked = asyncHandler(async (req, res, next) => {
  const blocked = req.body.blocked === true || req.body.blocked === 'true';
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found', 404));

  if (req.user?._id && String(user._id) === String(req.user._id) && blocked) {
    return next(new AppError('You cannot block your own admin account', 400));
  }

  user.isActive = !blocked;
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    message: blocked ? 'User blocked' : 'User unblocked',
    user: user.toSafeObject(),
  });
});

exports.getAlerts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const search = String(req.query.search || '').trim();
  const riskLevel = String(req.query.riskLevel || '').trim();
  const eventType = String(req.query.eventType || '').trim();

  const filter = {};
  if (riskLevel) filter.riskLevel = riskLevel;
  if (eventType) filter.eventType = eventType;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { eventType: rx },
      { riskLevel: rx },
      { 'details.explanation': rx },
      { 'details.recommendedAction': rx },
    ];
  }

  const [alerts, total] = await Promise.all([
    RiskEvent.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email')
      .populate('vehicleId', 'plateNumber type make model')
      .lean(),
    RiskEvent.countDocuments(filter),
  ]);

  res.json({
    success: true,
    count: alerts.length,
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
    alerts,
  });
});

exports.getAlertById = asyncHandler(async (req, res, next) => {
  const alert = await RiskEvent.findById(req.params.id)
    .populate('userId', 'name email phone role')
    .populate('vehicleId', 'plateNumber type make model')
    .lean();
  if (!alert) return next(new AppError('Alert not found', 404));
  res.json({ success: true, alert });
});

exports.getEmergencyContacts = asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const city = String(req.query.city || '').trim();
  const filter = {};
  if (city) filter.city = new RegExp(`^${escapeRegex(city)}$`, 'i');
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { phone: rx }, { city: rx }, { organization: rx }];
  }

  const contacts = await EmergencyContact.find(filter).sort({ city: 1, name: 1 }).lean();
  const cities = await EmergencyContact.distinct('city');

  res.json({ success: true, count: contacts.length, cities: cities.sort(), contacts });
});

exports.createEmergencyContact = asyncHandler(async (req, res, next) => {
  const { name, phone, city, type, organization, notes } = req.body;
  if (!name || !phone || !city) {
    return next(new AppError('Name, phone, and city are required', 400));
  }

  const contact = await EmergencyContact.create({
    name,
    phone,
    city,
    type,
    organization,
    notes,
  });

  res.status(201).json({ success: true, contact });
});

exports.updateEmergencyContact = asyncHandler(async (req, res, next) => {
  const allowed = ['name', 'phone', 'city', 'type', 'organization', 'notes', 'isActive'];
  const updates = {};
  allowed.forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  });

  const contact = await EmergencyContact.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!contact) return next(new AppError('Emergency contact not found', 404));
  res.json({ success: true, contact });
});

exports.deleteEmergencyContact = asyncHandler(async (req, res, next) => {
  const contact = await EmergencyContact.findByIdAndDelete(req.params.id);
  if (!contact) return next(new AppError('Emergency contact not found', 404));
  res.json({ success: true, message: 'Emergency contact deleted' });
});

exports.getSettings = asyncHandler(async (req, res) => {
  const settings = await AdminSettings.getOrCreate();
  res.json({ success: true, settings });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  const settings = await AdminSettings.getOrCreate();
  const { riskThresholds, alertSettings, notificationSettings } = req.body;

  if (riskThresholds && typeof riskThresholds === 'object') {
    const current = settings.riskThresholds?.toObject?.() || settings.riskThresholds || {};
    settings.riskThresholds = { ...current, ...riskThresholds };
  }
  if (alertSettings && typeof alertSettings === 'object') {
    const current = settings.alertSettings?.toObject?.() || settings.alertSettings || {};
    settings.alertSettings = { ...current, ...alertSettings };
  }
  if (notificationSettings && typeof notificationSettings === 'object') {
    const current = settings.notificationSettings?.toObject?.() || settings.notificationSettings || {};
    settings.notificationSettings = { ...current, ...notificationSettings };
  }

  await settings.save();
  res.json({ success: true, settings });
});
