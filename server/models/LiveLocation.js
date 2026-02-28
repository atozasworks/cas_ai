const mongoose = require('mongoose');

const liveLocationSchema = new mongoose.Schema({
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
  },
  location: {
    type: { type: String, enum: ['Point'], required: true, default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  speed: { type: Number, required: true, min: 0, max: 500 },
  heading: { type: Number, required: true, min: 0, max: 360 },
  acceleration: { type: Number, default: 0 },
  altitude: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
  metadata: {
    roadType: { type: String, enum: ['highway', 'urban', 'rural', 'residential', 'unknown'], default: 'unknown' },
    trafficDensity: { type: String, enum: ['low', 'medium', 'high', 'unknown'], default: 'unknown' },
    weatherCondition: { type: String, default: 'clear' },
  },
}, {
  timestamps: true,
});

liveLocationSchema.index({ location: '2dsphere' });
liveLocationSchema.index({ vehicleId: 1, timestamp: -1 });
liveLocationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

module.exports = mongoose.model('LiveLocation', liveLocationSchema);
