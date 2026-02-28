/**
 * ============================================================
 * LOCATION SERVICE
 * ============================================================
 *
 * Manages real-time vehicle location storage and proximity queries.
 * Uses Redis for live cache + MongoDB for persistence.
 * ============================================================
 */

const { getRedisClient } = require('../config/redis');
const LiveLocation = require('../models/LiveLocation');
const Vehicle = require('../models/Vehicle');
const logger = require('../middleware/logger');

const LOCATION_TTL_SECONDS = 60;
const LOCATION_KEY_PREFIX = 'vehicle:location:';
const GEO_KEY = 'vehicle:geo';

function locationKey(vehicleId) {
  return `${LOCATION_KEY_PREFIX}${vehicleId}`;
}

async function updateLocation(data) {
  const { vehicleId, userId, latitude, longitude, speed, heading, acceleration, altitude, accuracy, metadata } = data;

  // Persist to MongoDB (TTL-indexed, auto-expires)
  const locationDoc = await LiveLocation.create({
    vehicleId,
    userId,
    location: { type: 'Point', coordinates: [longitude, latitude] },
    speed,
    heading,
    acceleration: acceleration || 0,
    altitude: altitude || 0,
    accuracy: accuracy || 0,
    metadata: metadata || {},
  });

  // Update vehicle's last known position
  await Vehicle.findByIdAndUpdate(vehicleId, {
    lastKnownLocation: { type: 'Point', coordinates: [longitude, latitude] },
    lastSpeed: speed,
    lastHeading: heading,
    isOnline: true,
  });

  // Cache in Redis for fast proximity lookup
  const redis = getRedisClient();
  if (redis) {
    const payload = JSON.stringify({
      vehicleId, userId, latitude, longitude, speed, heading,
      acceleration: acceleration || 0,
      timestamp: Date.now(),
    });

    await Promise.all([
      redis.setex(locationKey(vehicleId), LOCATION_TTL_SECONDS, payload),
      redis.geoadd(GEO_KEY, longitude, latitude, vehicleId),
    ]);
  }

  return locationDoc;
}

async function getNearbyVehicles(vehicleId, latitude, longitude, radiusMeters = 500) {
  const redis = getRedisClient();

  if (redis) {
    try {
      const results = await redis.georadius(
        GEO_KEY, longitude, latitude, radiusMeters, 'm',
        'WITHCOORD', 'WITHDIST', 'ASC', 'COUNT', 50
      );

      const nearby = [];
      for (const entry of results) {
        const [id, dist, coords] = entry;
        if (id === vehicleId) continue;

        const cached = await redis.get(locationKey(id));
        if (cached) {
          const parsed = JSON.parse(cached);
          nearby.push({
            vehicleId: id,
            latitude: parseFloat(coords[1]),
            longitude: parseFloat(coords[0]),
            distance: parseFloat(dist),
            speed: parsed.speed,
            heading: parsed.heading,
            acceleration: parsed.acceleration || 0,
          });
        }
      }
      return nearby;
    } catch (err) {
      logger.warn('Redis geo query failed, falling back to MongoDB:', err.message);
    }
  }

  // MongoDB fallback
  const docs = await LiveLocation.find({
    vehicleId: { $ne: vehicleId },
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: radiusMeters,
      },
    },
  })
    .sort({ timestamp: -1 })
    .limit(50)
    .lean();

  const seen = new Set();
  return docs
    .filter((d) => {
      if (seen.has(d.vehicleId.toString())) return false;
      seen.add(d.vehicleId.toString());
      return true;
    })
    .map((d) => ({
      vehicleId: d.vehicleId.toString(),
      latitude: d.location.coordinates[1],
      longitude: d.location.coordinates[0],
      speed: d.speed,
      heading: d.heading,
      acceleration: d.acceleration || 0,
    }));
}

async function removeVehicleFromCache(vehicleId) {
  const redis = getRedisClient();
  if (redis) {
    await Promise.all([
      redis.del(locationKey(vehicleId)),
      redis.zrem(GEO_KEY, vehicleId),
    ]);
  }
  await Vehicle.findByIdAndUpdate(vehicleId, { isOnline: false });
}

async function getVehicleLocation(vehicleId) {
  const redis = getRedisClient();
  if (redis) {
    const cached = await redis.get(locationKey(vehicleId));
    if (cached) return JSON.parse(cached);
  }

  const doc = await LiveLocation.findOne({ vehicleId })
    .sort({ timestamp: -1 })
    .lean();

  if (!doc) return null;
  return {
    vehicleId: doc.vehicleId.toString(),
    latitude: doc.location.coordinates[1],
    longitude: doc.location.coordinates[0],
    speed: doc.speed,
    heading: doc.heading,
    acceleration: doc.acceleration || 0,
    timestamp: doc.timestamp,
  };
}

module.exports = {
  updateLocation,
  getNearbyVehicles,
  removeVehicleFromCache,
  getVehicleLocation,
  LOCATION_TTL_SECONDS,
};
