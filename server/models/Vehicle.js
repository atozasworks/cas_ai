const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  plateNumber: {
    type: String,
    required: [true, 'Plate number is required'],
    unique: true,
    uppercase: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['car', 'truck', 'motorcycle', 'bus', 'emergency', 'bicycle'],
    required: true,
  },
  make: { type: String, trim: true },
  model: { type: String, trim: true },
  year: { type: Number },
  color: { type: String, trim: true },
  dimensions: {
    length: { type: Number, default: 4.5 },
    width: { type: Number, default: 1.8 },
    height: { type: Number, default: 1.5 },
  },
  isActive: { type: Boolean, default: true },
  isOnline: { type: Boolean, default: false },
  lastKnownLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },
  lastSpeed: { type: Number, default: 0 },
  lastHeading: { type: Number, default: 0 },
  totalDistance: { type: Number, default: 0 },
  totalTrips: { type: Number, default: 0 },
}, {
  timestamps: true,
});

vehicleSchema.index({ lastKnownLocation: '2dsphere' });
vehicleSchema.index({ owner: 1, isActive: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
