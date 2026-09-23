const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Contact name is required'],
    trim: true,
    maxlength: 120,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    maxlength: 30,
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    maxlength: 80,
    index: true,
  },
  type: {
    type: String,
    enum: ['police', 'ambulance', 'fire', 'hospital', 'helpline', 'other'],
    default: 'other',
  },
  organization: {
    type: String,
    trim: true,
    maxlength: 160,
    default: '',
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

emergencyContactSchema.index({ city: 1, name: 1 });

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);
