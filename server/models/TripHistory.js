const mongoose = require('mongoose');

const waypointSchema = new mongoose.Schema({
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  speed: Number,
  heading: Number,
  timestamp: Date,
}, { _id: false });

const tripHistorySchema = new mongoose.Schema({
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  startLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  endLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number],
  },
  route: {
    type: { type: String, enum: ['LineString'], default: 'LineString' },
    coordinates: { type: [[Number]], default: [] },
  },
  waypoints: [waypointSchema],
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  status: {
    type: String,
    enum: ['active', 'completed', 'interrupted'],
    default: 'active',
  },
  stats: {
    distanceKm: { type: Number, default: 0 },
    durationMinutes: { type: Number, default: 0 },
    avgSpeedKmh: { type: Number, default: 0 },
    maxSpeedKmh: { type: Number, default: 0 },
    hardBrakeCount: { type: Number, default: 0 },
    sharpTurnCount: { type: Number, default: 0 },
    overspeedCount: { type: Number, default: 0 },
    nearMissCount: { type: Number, default: 0 },
    riskEventsCount: { type: Number, default: 0 },
  },
  safetyScore: { type: Number, min: 0, max: 100, default: 100 },
}, {
  timestamps: true,
});

tripHistorySchema.index({ startLocation: '2dsphere' });
tripHistorySchema.index({ userId: 1, startTime: -1 });
tripHistorySchema.index({ vehicleId: 1, startTime: -1 });

module.exports = mongoose.model('TripHistory', tripHistorySchema);
