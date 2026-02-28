const Joi = require('joi');
const { AppError } = require('./errorHandler');

const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((d) => d.message).join('; ');
    return next(new AppError(`Validation error: ${messages}`, 400));
  }

  req[source] = value;
  next();
};

const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
    phone: Joi.string().pattern(/^\+?[\d\s-]{7,15}$/).optional(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  vehicleCreate: Joi.object({
    plateNumber: Joi.string().min(2).max(20).required(),
    type: Joi.string().valid('car', 'truck', 'motorcycle', 'bus', 'emergency', 'bicycle').required(),
    make: Joi.string().max(50).optional(),
    model: Joi.string().max(50).optional(),
    year: Joi.number().integer().min(1900).max(2030).optional(),
    color: Joi.string().max(30).optional(),
  }),

  locationUpdate: Joi.object({
    vehicleId: Joi.string().hex().length(24).required(),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    speed: Joi.number().min(0).max(500).required(),
    heading: Joi.number().min(0).max(360).required(),
    acceleration: Joi.number().min(-30).max(30).default(0),
    altitude: Joi.number().optional(),
    accuracy: Joi.number().min(0).optional(),
    timestamp: Joi.date().iso().optional(),
  }),

  emergencyContact: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    phone: Joi.string().pattern(/^\+?[\d\s-]{7,15}$/).required(),
    relationship: Joi.string().max(50).optional(),
  }),
};

module.exports = { validate, schemas };
