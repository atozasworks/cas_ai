const Vehicle = require('../models/Vehicle');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

exports.createVehicle = asyncHandler(async (req, res, next) => {
  const existing = await Vehicle.findOne({ plateNumber: req.body.plateNumber.toUpperCase() });
  if (existing) {
    return next(new AppError('Vehicle with this plate number already exists', 409));
  }

  const vehicle = await Vehicle.create({
    ...req.body,
    owner: req.user._id,
  });

  res.status(201).json({ success: true, vehicle });
});

exports.getMyVehicles = asyncHandler(async (req, res) => {
  const vehicles = await Vehicle.find({ owner: req.user._id, isActive: true })
    .sort({ createdAt: -1 });
  res.json({ success: true, count: vehicles.length, vehicles });
});

exports.getVehicle = asyncHandler(async (req, res, next) => {
  const vehicle = await Vehicle.findOne({
    _id: req.params.id,
    owner: req.user._id,
  });

  if (!vehicle) {
    return next(new AppError('Vehicle not found', 404));
  }

  res.json({ success: true, vehicle });
});

exports.updateVehicle = asyncHandler(async (req, res, next) => {
  const vehicle = await Vehicle.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!vehicle) {
    return next(new AppError('Vehicle not found', 404));
  }

  res.json({ success: true, vehicle });
});

exports.deleteVehicle = asyncHandler(async (req, res, next) => {
  const vehicle = await Vehicle.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    { isActive: false },
    { new: true }
  );

  if (!vehicle) {
    return next(new AppError('Vehicle not found', 404));
  }

  res.json({ success: true, message: 'Vehicle deactivated' });
});

exports.getNearbyOnlineVehicles = asyncHandler(async (req, res) => {
  const { longitude, latitude, radius = 1000 } = req.query;

  const vehicles = await Vehicle.find({
    isOnline: true,
    isActive: true,
    lastKnownLocation: {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)],
        },
        $maxDistance: parseFloat(radius),
      },
    },
  }).limit(50);

  res.json({ success: true, count: vehicles.length, vehicles });
});
