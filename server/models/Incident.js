const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
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
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TripHistory',
  },
  incidentType: {
    type: String,
    enum: ['collision', 'near_miss', 'road_hazard', 'vehicle_breakdown', 'medical_emergency', 'crash_detected'],
    required: true,
  },
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'severe', 'critical'],
    required: true,
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  description: { type: String },
  impactData: {
    decelerationG: Number,
    impactAngle: Number,
    estimatedSpeed: Number,
  },
  involvedVehicles: [{
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    plateNumber: String,
  }],
  emergencyNotified: { type: Boolean, default: false },
  emergencyNotifiedAt: { type: Date },
  emergencyContacts: [{
    name: String,
    phone: String,
    notifiedAt: Date,
  }],
  status: {
    type: String,
    enum: ['detected', 'confirmed', 'responding', 'resolved', 'false_alarm'],
    default: 'detected',
  },
  userConfirmedSafe: { type: Boolean, default: false },
  userConfirmedSafeAt: { type: Date },
  autoEscalationTimer: { type: Number, default: 30 },
  resolvedAt: { type: Date },
  notes: { type: String },
  timestamp: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ userId: 1, timestamp: -1 });
incidentSchema.index({ status: 1, severity: 1 });

module.exports = mongoose.model('Incident', incidentSchema);
