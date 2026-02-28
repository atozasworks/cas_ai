const behaviorService = require('../services/behaviorAnalyticsService');
const RiskEvent = require('../models/RiskEvent');
const TripHistory = require('../models/TripHistory');
const Incident = require('../models/Incident');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getDriverScore = asyncHandler(async (req, res) => {
  const analytics = await behaviorService.getDriverAnalytics(req.user._id);
  res.json({ success: true, analytics });
});

exports.getRiskEvents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, riskLevel, vehicleId } = req.query;
  const filter = { userId: req.user._id };
  if (riskLevel) filter.riskLevel = riskLevel;
  if (vehicleId) filter.vehicleId = vehicleId;

  const events = await RiskEvent.find(filter)
    .sort({ timestamp: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit, 10))
    .lean();

  const total = await RiskEvent.countDocuments(filter);

  res.json({
    success: true,
    count: events.length,
    total,
    page: parseInt(page, 10),
    pages: Math.ceil(total / limit),
    events,
  });
});

exports.getTripHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, vehicleId, status } = req.query;
  const filter = { userId: req.user._id };
  if (vehicleId) filter.vehicleId = vehicleId;
  if (status) filter.status = status;

  const trips = await TripHistory.find(filter)
    .sort({ startTime: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit, 10))
    .populate('vehicleId', 'plateNumber type make model')
    .lean();

  const total = await TripHistory.countDocuments(filter);

  res.json({
    success: true,
    count: trips.length,
    total,
    page: parseInt(page, 10),
    pages: Math.ceil(total / limit),
    trips,
  });
});

exports.getIncidents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, severity } = req.query;
  const filter = { userId: req.user._id };
  if (status) filter.status = status;
  if (severity) filter.severity = severity;

  const incidents = await Incident.find(filter)
    .sort({ timestamp: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit, 10))
    .populate('vehicleId', 'plateNumber type')
    .lean();

  const total = await Incident.countDocuments(filter);

  res.json({
    success: true,
    count: incidents.length,
    total,
    page: parseInt(page, 10),
    pages: Math.ceil(total / limit),
    incidents,
  });
});

exports.getDashboardSummary = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const [analytics, recentRisks, activeTrip, incidentCount] = await Promise.all([
    behaviorService.getDriverAnalytics(userId),
    RiskEvent.find({ userId }).sort({ timestamp: -1 }).limit(5).lean(),
    TripHistory.findOne({ userId, status: 'active' }).lean(),
    Incident.countDocuments({ userId, status: { $in: ['detected', 'confirmed', 'responding'] } }),
  ]);

  res.json({
    success: true,
    dashboard: {
      driverScore: analytics.overallScore,
      rank: analytics.rank,
      trend: analytics.trend,
      scoreComponents: analytics.components,
      recentRiskEvents: recentRisks,
      activeTrip: activeTrip || null,
      openIncidents: incidentCount,
      lifetimeStats: analytics.lifetime,
    },
  });
});
