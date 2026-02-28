const mongoose = require('mongoose');

const dailyMetricSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  tripsCount: { type: Number, default: 0 },
  distanceKm: { type: Number, default: 0 },
  durationMinutes: { type: Number, default: 0 },
  hardBrakeCount: { type: Number, default: 0 },
  sharpTurnCount: { type: Number, default: 0 },
  overspeedCount: { type: Number, default: 0 },
  nearMissCount: { type: Number, default: 0 },
  riskEventsCount: { type: Number, default: 0 },
  avgRiskScore: { type: Number, default: 0 },
  safetyScore: { type: Number, min: 0, max: 100, default: 100 },
}, { _id: false });

const driverScoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  overallScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 80,
  },
  components: {
    brakingScore: { type: Number, min: 0, max: 100, default: 80 },
    speedScore: { type: Number, min: 0, max: 100, default: 80 },
    turningScore: { type: Number, min: 0, max: 100, default: 80 },
    proximityScore: { type: Number, min: 0, max: 100, default: 80 },
    consistencyScore: { type: Number, min: 0, max: 100, default: 80 },
  },
  lifetime: {
    totalTrips: { type: Number, default: 0 },
    totalDistanceKm: { type: Number, default: 0 },
    totalDurationMinutes: { type: Number, default: 0 },
    totalHardBrakes: { type: Number, default: 0 },
    totalSharpTurns: { type: Number, default: 0 },
    totalOverspeeds: { type: Number, default: 0 },
    totalNearMisses: { type: Number, default: 0 },
    totalRiskEvents: { type: Number, default: 0 },
    totalIncidents: { type: Number, default: 0 },
  },
  dailyMetrics: [dailyMetricSchema],
  trend: {
    type: String,
    enum: ['improving', 'stable', 'declining'],
    default: 'stable',
  },
  rank: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'silver' },
  lastUpdated: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

driverScoreSchema.index({ overallScore: -1 });
driverScoreSchema.index({ 'dailyMetrics.date': -1 });

driverScoreSchema.methods.recalculateOverall = function () {
  const c = this.components;
  this.overallScore = Math.round(
    (c.brakingScore * 0.25) +
    (c.speedScore * 0.25) +
    (c.turningScore * 0.20) +
    (c.proximityScore * 0.20) +
    (c.consistencyScore * 0.10)
  );

  if (this.overallScore >= 90) this.rank = 'platinum';
  else if (this.overallScore >= 75) this.rank = 'gold';
  else if (this.overallScore >= 55) this.rank = 'silver';
  else this.rank = 'bronze';
};

module.exports = mongoose.model('DriverScore', driverScoreSchema);
