const Vehicle = require('../models/Vehicle');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

exports.createVehicle = asyncHandler(async (req, res, next) => {
  const plateNumber = String(req.body.plateNumber || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!plateNumber) {
    return next(new AppError('Plate number is required', 400));
  }

  const ownerId = req.user._id;
  const payload = {
    owner: ownerId,
    plateNumber,
    type: req.body.type,
    make: req.body.make,
    model: req.body.model,
    phone: req.body.phone,
    isActive: true,
    isOnline: false,
  };
  if (req.body.year != null) payload.year = req.body.year;
  if (req.body.color) payload.color = req.body.color;
  if (req.body.dimensions) payload.dimensions = req.body.dimensions;

  // Case-insensitive match (old rows may not be uppercase)
  const plateRegex = new RegExp(`^${plateNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

  const applyPayload = async (vehicle) => {
    vehicle.owner = ownerId;
    vehicle.plateNumber = plateNumber;
    vehicle.type = payload.type ?? vehicle.type;
    vehicle.make = payload.make ?? vehicle.make;
    vehicle.model = payload.model ?? vehicle.model;
    vehicle.phone = payload.phone ?? vehicle.phone;
    if (payload.year != null) vehicle.year = payload.year;
    if (payload.color) vehicle.color = payload.color;
    if (payload.dimensions) vehicle.dimensions = payload.dimensions;
    vehicle.isActive = true;
    vehicle.isOnline = false;
    await vehicle.save();
    return vehicle;
  };

  let vehicle = await Vehicle.findOne({ plateNumber: plateRegex });
  if (vehicle) {
    vehicle = await applyPayload(vehicle);
    return res.status(200).json({ success: true, vehicle });
  }

  try {
    vehicle = await Vehicle.create(payload);
    return res.status(201).json({ success: true, vehicle });
  } catch (err) {
    // Race / unique index — reclaim existing row instead of 409
    if (err && err.code === 11000) {
      vehicle = await Vehicle.findOne({ plateNumber: plateRegex });
      if (vehicle) {
        vehicle = await applyPayload(vehicle);
        return res.status(200).json({ success: true, vehicle });
      }
    }
    throw err;
  }
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
  // Hard delete so the plate number can be registered again
  const vehicle = await Vehicle.findOneAndDelete({
    _id: req.params.id,
    owner: req.user._id,
  });

  if (!vehicle) {
    return next(new AppError('Vehicle not found', 404));
  }

  res.json({ success: true, message: 'Vehicle deleted' });
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

// Get all active vehicles from all users (for map display)
exports.getAllMapVehicles = asyncHandler(async (req, res) => {
  const User = require('../models/User');

  // Only show vehicles that are either:
  // 1. Currently online (actively transmitting), OR
  // 2. Owned by the requesting user (so they can always see their own)
  const vehicles = await Vehicle.find({
    isActive: true,
    $or: [
      { isOnline: true },
      { owner: req.user._id },
    ],
  })
    .populate('owner', 'name email')
    .sort({ isOnline: -1, updatedAt: -1 })
    .limit(200)
    .lean();

  // Filter out vehicles at exactly [0, 0] or without coordinates
  const filtered = vehicles.filter((v) => {
    const coords = v.lastKnownLocation?.coordinates;
    return coords && (coords[0] !== 0 || coords[1] !== 0);
  });

  // Add ownerName to each vehicle for easy access
  const result = filtered.map((v) => ({
    ...v,
    ownerName: v.owner?.name || 'Unknown',
    ownerEmail: v.owner?.email || '',
    isOwn: v.owner?._id?.toString() === req.user._id.toString(),
  }));

  res.json({ success: true, count: result.length, vehicles: result });
});
