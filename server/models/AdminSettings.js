const mongoose = require('mongoose');

const adminSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    unique: true,
    default: 'global',
  },
  riskThresholds: {
    high: { type: Number, min: 0, max: 100, default: 70 },
    medium: { type: Number, min: 0, max: 100, default: 40 },
    criticalDistanceMeters: { type: Number, min: 1, max: 500, default: 20 },
    criticalTtcSeconds: { type: Number, min: 1, max: 30, default: 3 },
  },
  alertSettings: {
    autoEscalateSeconds: { type: Number, min: 5, max: 300, default: 30 },
    highRiskNotify: { type: Boolean, default: true },
    nearMissNotify: { type: Boolean, default: true },
    collisionNotify: { type: Boolean, default: true },
  },
  notificationSettings: {
    emailAlerts: { type: Boolean, default: true },
    smsAlerts: { type: Boolean, default: false },
    pushAlerts: { type: Boolean, default: true },
    digestFrequency: {
      type: String,
      enum: ['realtime', 'hourly', 'daily'],
      default: 'realtime',
    },
  },
}, {
  timestamps: true,
});

adminSettingsSchema.statics.getOrCreate = async function getOrCreate() {
  let settings = await this.findOne({ key: 'global' });
  if (!settings) {
    settings = await this.create({ key: 'global' });
  }
  return settings;
};

module.exports = mongoose.model('AdminSettings', adminSettingsSchema);
