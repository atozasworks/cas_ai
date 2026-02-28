const mongoose = require('mongoose');

const riskEventSchema = new mongoose.Schema({
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true,
    index: true,
  },
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TripHistory',
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  nearbyVehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
  },
  eventType: {
    type: String,
    enum: [
      'proximity_warning',
      'collision_risk',
      'near_miss',
      'hard_brake',
      'sharp_turn',
      'overspeed',
      'erratic_driving',
      'stationary_hazard',
    ],
    required: true,
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  riskScore: { type: Number, min: 0, max: 100, required: true },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true,
  },
  mlProbability: { type: Number, min: 0, max: 1 },
  finalRisk: { type: Number, min: 0, max: 100 },
  details: {
    distance: Number,
    relativeSpeed: Number,
    ttc: Number,
    bearing: Number,
    direction: String,
    ownSpeed: Number,
    nearbySpeed: Number,
    recommendedAction: String,
    escapePath: String,
    explanation: String,
  },
  acknowledged: { type: Boolean, default: false },
  acknowledgedAt: { type: Date },
  timestamp: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

riskEventSchema.index({ location: '2dsphere' });
riskEventSchema.index({ vehicleId: 1, timestamp: -1 });
riskEventSchema.index({ riskLevel: 1, timestamp: -1 });
riskEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('RiskEvent', riskEventSchema);
