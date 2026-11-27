/**
 * ============================================================
 * SOCKET.IO REAL-TIME LAYER
 * ============================================================
 *
 * Handles:
 *   1. GPS location updates from clients
 *   2. Proximity detection pipeline
 *   3. Risk computation broadcast
 *   4. Emergency alert distribution
 *
 * Supports Redis adapter for horizontal scaling across
 * multiple server instances with sticky sessions.
 * ============================================================
 */

const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { getRedisClient, getRedisSubscriber } = require('../config/redis');
const locationService = require('../services/locationService');
const aiDecisionService = require('../services/aiDecisionService');
const behaviorService = require('../services/behaviorAnalyticsService');
const aiAssistantService = require('../services/aiAssistantService');
const poiService = require('../services/poiService');
const RiskEvent = require('../models/RiskEvent');
const Incident = require('../models/Incident');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { isCrashImpact } = require('../utils/crashDetection');
const config = require('../config');
const logger = require('../middleware/logger');

let io = null;

function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (config.cors.isOriginAllowed(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: config.socket.pingInterval,
    pingTimeout: config.socket.pingTimeout,
    transports: ['websocket', 'polling'],
  });

  // Attach Redis adapter if available
  const pubClient = getRedisClient();
  const subClient = getRedisSubscriber();
  if (pubClient && subClient) {
    // Separate pub/sub prefix so test and production on one Redis do not share events.
    // Redis database numbers do not isolate pub/sub.
    const redisAdapterKey = `cas:${process.env.APP_ENV || 'default'}`;
    io.adapter(createAdapter(pubClient, subClient, { key: redisAdapterKey }));
    logger.info(`Socket.IO Redis adapter attached (${redisAdapterKey})`);
  }

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('join:vehicle', (data) => {
      const { vehicleId, userId } = data;
      socket.join(`vehicle:${vehicleId}`);
      socket.join(`user:${userId}`);
      socket.vehicleId = vehicleId;
      socket.userId = userId;
      // New tracking session: reset zone dedupe so warnings re-fire every time
      socket.lastZoneType = null;
      logger.debug(`Vehicle ${vehicleId} joined tracking room`);
    });

    socket.on('location:update', async (data) => {
      try {
        await handleLocationUpdate(socket, data);
      } catch (err) {
        logger.error('Location update handler error:', err);
        socket.emit('error:server', { message: 'Location processing failed' });
      }
    });

    socket.on('emergency:iam-safe', async (data) => {
      try {
        await handleSafeConfirmation(socket, data);
      } catch (err) {
        logger.error('Safe confirmation handler error:', err);
      }
    });

    socket.on('emergency:report', async (data) => {
      try {
        await handleEmergencyReport(socket, data);
      } catch (err) {
        logger.error('Emergency report handler error:', err);
      }
    });

    socket.on('emergency:sensor-crash', async (data) => {
      try {
        await handleSensorCrash(socket, data);
      } catch (err) {
        logger.error('Sensor crash handler error:', err);
        socket.emit('emergency:rejected', { message: 'Could not save the crash SOS. Call 112 from this phone.' });
      }
    });

    socket.on('emergency:sos-sent', async (data) => {
      try {
        await handleSosSent(socket, data);
      } catch (err) {
        logger.error('SOS sent handler error:', err);
      }
    });

    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      if (socket.vehicleId) {
        await locationService.removeVehicleFromCache(socket.vehicleId);
      }
    });
  });

  logger.info('Socket.IO initialized');
  return io;
}

// ───────────────────────────────────────────
// LOCATION UPDATE PIPELINE
// ───────────────────────────────────────────

async function handleLocationUpdate(socket, data) {
  const {
    vehicleId, userId, latitude, longitude,
    speed, heading, acceleration, altitude, accuracy,
    previousHeading, roadType, trafficDensity,
  } = data;

  // 1. Store location
  await locationService.updateLocation({
    vehicleId, userId, latitude, longitude,
    speed, heading, acceleration, altitude, accuracy,
    metadata: { roadType, trafficDensity },
  });

  // 2. Behavior event detection
  if (acceleration !== undefined) {
    if (behaviorService.detectHardBrake(acceleration)) {
      await behaviorService.recordEvent(userId, 'hard_brake');
      socket.emit('alert:behavior', { type: 'hard_brake', message: 'Hard braking detected' });
    }
  }

  if (previousHeading !== undefined) {
    if (behaviorService.detectSharpTurn(previousHeading, heading)) {
      await behaviorService.recordEvent(userId, 'sharp_turn');
      socket.emit('alert:behavior', { type: 'sharp_turn', message: 'Sharp turn detected' });
    }
  }

  if (behaviorService.detectOverspeed(speed, roadType)) {
    await behaviorService.recordEvent(userId, 'overspeed');
    socket.emit('alert:behavior', { type: 'overspeed', message: 'Speed limit exceeded' });
  }

  // 3. Map + GPS: detect nearby zone (school, hospital, junction) for driving-friendly alerts
  const { zoneType, zoneLabel } = await poiService.getNearbyZone(latitude, longitude, 150);

  // 4. Find nearby vehicles
  const nearby = await locationService.getNearbyVehicles(
    vehicleId, latitude, longitude,
    config.risk.proximityThresholdMeters
  );

  // Filter out ALL vehicles owned by this user (not just the active one)
  const userVehicles = await Vehicle.find({ owner: userId }).select('_id').lean();
  const userVehicleIds = new Set(userVehicles.map((v) => v._id.toString()));
  const filteredNearby = nearby.filter((v) => !userVehicleIds.has(v.vehicleId.toString()));

  if (filteredNearby.length === 0) {
    socket.emit('risk:clear', { timestamp: Date.now(), zoneType: null, zoneLabel: null }); // keep zone in clear for client
    if (zoneType) {
      socket.emit('risk:update', { zoneType, zoneLabel, nearbyVehicles: [], finalRisk: 0, riskLevel: 'low', timestamp: Date.now() });
    }
    // Zone-only alert when entering school/hospital/junction (no other vehicle nearby)
    if (zoneType && zoneLabel && socket.lastZoneType !== zoneType) {
      socket.lastZoneType = zoneType;
      try {
        const aiZoneMessage = await aiAssistantService.getZoneAlertMessage({
          zoneType, zoneLabel, speed, roadType: roadType || 'unknown', trafficDensity: trafficDensity || 'unknown',
        });
        socket.emit('alert:zone', { zoneType, zoneLabel, aiRecommendation: aiZoneMessage, playSound: true });
      } catch (_) {
        socket.emit('alert:zone', {
          zoneType, zoneLabel,
          aiRecommendation: `${zoneLabel} — Reduce speed and drive carefully.`,
          playSound: true,
        });
      }
    } else if (!zoneType) socket.lastZoneType = null;
    return;
  }

  if (!zoneType) socket.lastZoneType = null;

  // 5. AI decision pipeline
  const ownVehicle = { latitude, longitude, speed, heading, acceleration: acceleration || 0 };
  const driverScore = await behaviorService.getOrCreateDriverScore(userId);
  const context = {
    weights: config.risk.weights,
    thresholds: {
      maxProximityMeters: config.risk.proximityThresholdMeters,
      criticalDistanceMeters: config.risk.criticalDistanceMeters,
      criticalTtcSeconds: 3,
      maxSpeedKmh: 200,
      maxAcceleration: 10,
    },
    driverBehaviorScore: driverScore.overallScore,
    trafficDensity: trafficDensity || 'unknown',
    roadType: roadType || 'unknown',
  };

  const decision = await aiDecisionService.makeDecision(ownVehicle, filteredNearby, context);

  // 6. Enrich nearby vehicles with details (plate, type, make, model, owner name)
  const enrichedNearby = await Promise.all(
    filteredNearby.map(async (v) => {
      const base = {
        vehicleId: v.vehicleId,
        latitude: v.latitude,
        longitude: v.longitude,
        distance: v.distance,
        speed: v.speed,
      };
      try {
        const vehicle = await Vehicle.findById(v.vehicleId).lean();
        if (vehicle) {
          base.plateNumber = vehicle.plateNumber;
          base.type = vehicle.type;
          base.make = vehicle.make;
          base.model = vehicle.model;
          if (vehicle.owner) {
            const owner = await User.findById(vehicle.owner).select('name').lean();
            if (owner) base.ownerName = owner.name;
          }
        }
      } catch (_) { /* ignore lookup errors */ }
      return base;
    })
  );

  // Emit risk alert to client (include zone for map/GPS context)
  socket.emit('risk:update', {
    ...decision,
    nearbyVehicles: enrichedNearby,
    zoneType: zoneType || null,
    zoneLabel: zoneLabel || null,
  });

  // Emit popup + sound when closest vehicle is within alert range (default 50m; GPS-friendly)
  const alertMeters = config.risk.proximityAlertMeters ?? 50;
  const closestAssessment = decision.assessments?.[0];
  const closestDistance = closestAssessment?.components?.distance ?? enrichedNearby[0]?.distance;
  const closestDirection = closestAssessment?.components?.direction || null;
  const withinAlertRange = closestDistance != null && closestDistance <= alertMeters && enrichedNearby.length > 0;
  if (withinAlertRange) {
    // Vehicle nearby: no Groq AI message — only vehicle details + direction/action from risk engine
    let closest = enrichedNearby[0];
    if (closestAssessment?.vehicleId) {
      const matched = enrichedNearby.find((v) => String(v.vehicleId) === String(closestAssessment.vehicleId));
      if (matched) closest = matched;
    }

    socket.emit('alert:vehicle-nearby', {
      vehicle: { ...closest, distance: closestDistance, direction: closestDirection },
      direction: closestDirection,
      distance: closestDistance,
      message: `Vehicle within ${Math.round(closestDistance)}m`,
      zoneType: zoneType || null,
      zoneLabel: zoneLabel || null,
      playSound: true,
    });
  }

  // Zone-only: entering school/hospital/junction (when no vehicle-nearby popup is shown)
  if (!withinAlertRange && zoneType && zoneLabel && socket.lastZoneType !== zoneType) {
    socket.lastZoneType = zoneType;
    try {
      const aiZoneMessage = await aiAssistantService.getZoneAlertMessage({
        zoneType, zoneLabel, speed, roadType: roadType || 'unknown', trafficDensity: trafficDensity || 'unknown',
      });
      socket.emit('alert:zone', { zoneType, zoneLabel, aiRecommendation: aiZoneMessage, playSound: true });
    } catch (_) {
      socket.emit('alert:zone', {
        zoneType, zoneLabel,
        aiRecommendation: `${zoneLabel} — Reduce speed and drive carefully.`,
        playSound: true,
      });
    }
  } else if (!zoneType) socket.lastZoneType = null;

  // 7. Persist high-risk events
  if (decision.riskLevel === 'high') {
    const highestAssessment = decision.assessments[0];

    await RiskEvent.create({
      vehicleId,
      userId,
      nearbyVehicleId: decision.highestRiskVehicle,
      eventType: decision.finalRisk >= 80 ? 'collision_risk' : 'proximity_warning',
      location: { type: 'Point', coordinates: [longitude, latitude] },
      riskScore: decision.deterministicScore,
      riskLevel: decision.riskLevel,
      mlProbability: decision.mlProbability,
      finalRisk: decision.finalRisk,
      details: {
        distance: highestAssessment?.components?.distance,
        relativeSpeed: highestAssessment?.components?.relativeSpeed,
        ttc: highestAssessment?.components?.ttc,
        bearing: highestAssessment?.components?.bearing,
        direction: highestAssessment?.components?.direction,
        ownSpeed: speed,
        nearbySpeed: nearby[0]?.speed,
        recommendedAction: decision.action,
        escapePath: decision.escapePath?.safestDirection,
        explanation: decision.explanation,
      },
    });

    await behaviorService.recordEvent(userId, 'risk_event');

    // Near-miss detection (TTC < 2 seconds)
    if (highestAssessment?.components?.ttc && highestAssessment.components.ttc < 2) {
      await behaviorService.recordEvent(userId, 'near_miss');
      socket.emit('alert:near-miss', {
        message: 'Near-miss detected!',
        ttc: highestAssessment.components.ttc,
      });
    }

    // Crash detection via extreme deceleration
    if (acceleration && acceleration < -15) {
      await handleCrashDetection(socket, {
        vehicleId, userId, latitude, longitude,
        speed, deceleration: acceleration,
      });
    }
  }

  // 8. Broadcast position to nearby vehicles' rooms
  for (const nearbyVehicle of nearby) {
    io.to(`vehicle:${nearbyVehicle.vehicleId}`).emit('nearby:update', {
      vehicleId,
      latitude,
      longitude,
      speed,
      heading,
      distance: nearbyVehicle.distance,
    });
  }
}

// ───────────────────────────────────────────
// CRASH DETECTION & EMERGENCY
// ───────────────────────────────────────────

async function handleCrashDetection(socket, data) {
  const { vehicleId, userId, latitude, longitude, speed, deceleration } = data;

  const incident = await Incident.create({
    vehicleId,
    userId,
    incidentType: 'crash_detected',
    severity: Math.abs(deceleration) > 25 ? 'critical' : 'severe',
    location: { type: 'Point', coordinates: [longitude, latitude] },
    description: `Crash detected: ${Math.abs(deceleration).toFixed(1)}G deceleration at ${speed.toFixed(0)} km/h`,
    impactData: {
      decelerationG: Math.abs(deceleration) / 9.81,
      estimatedSpeed: speed,
    },
    autoEscalationTimer: 30,
  });

  await emitCrashOverlay(socket, incident, {
    isTest: false,
    message: 'Possible crash detected. If you are safe, tap I AM SAFE. Otherwise send your location to your contacts.',
  });

  logger.warn(`CRASH DETECTED: Vehicle ${vehicleId}, severity=${incident.severity}`);
}

async function handleSafeConfirmation(socket, data) {
  const { incidentId } = data;
  await Incident.findByIdAndUpdate(incidentId, {
    userConfirmedSafe: true,
    userConfirmedSafeAt: new Date(),
    status: 'resolved',
    resolvedAt: new Date(),
  });
  socket.emit('emergency:resolved', { incidentId, message: 'Glad you are safe!' });
  logger.info(`Incident ${incidentId} resolved — user confirmed safe`);
}

async function handleEmergencyReport(socket, data) {
  const { vehicleId, userId, latitude, longitude, incidentType, description } = data;

  const incident = await Incident.create({
    vehicleId,
    userId,
    incidentType: incidentType || 'medical_emergency',
    severity: 'critical',
    location: { type: 'Point', coordinates: [longitude, latitude] },
    description: description || 'Emergency reported by user',
    emergencyNotified: false,
  });

  socket.emit('emergency:acknowledged', {
    incidentId: incident._id,
    message: 'Emergency saved on your account. Call 112 from this phone. UCASA does not reach the 112 center by itself.',
  });

  logger.warn(`EMERGENCY REPORT: Vehicle ${vehicleId}, type=${incidentType}`);
}

function readCoordinate(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
}

async function emitCrashOverlay(socket, incident, extra) {
  const user = await User.findById(incident.userId).select('name emergencyContacts').lean();
  const coordinates = incident.location?.coordinates || [];
  const longitude = coordinates[0];
  const latitude = coordinates[1];

  socket.emit('emergency:crash-detected', {
    incidentId: incident._id,
    severity: incident.severity,
    message: extra.message,
    countdownSeconds: incident.autoEscalationTimer || 30,
    latitude,
    longitude,
    contacts: (user?.emergencyContacts || []).map((contact) => ({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
    })),
    userName: user?.name || '',
    isTest: extra.isTest === true,
    timestamp: Date.now(),
  });
}

async function handleSensorCrash(socket, data) {
  const source = data?.source === 'test' ? 'test' : 'device_motion';
  const vehicleId = data?.vehicleId;
  const latitude = readCoordinate(data?.latitude, -90, 90);
  const longitude = readCoordinate(data?.longitude, -180, 180);
  const speed = Math.min(500, Math.max(0, Number(data?.speed) || 0));
  const peakAcceleration = Number(data?.peakAcceleration);

  if (!/^[a-f0-9]{24}$/i.test(String(vehicleId || '')) || latitude == null || longitude == null) {
    socket.emit('emergency:rejected', { message: 'Add a vehicle and allow location, then try SOS again.' });
    return;
  }

  if (source !== 'test' && !isCrashImpact(peakAcceleration)) return;

  const vehicle = await Vehicle.findById(vehicleId).select('owner');
  if (!vehicle) {
    socket.emit('emergency:rejected', { message: 'Add a vehicle first, then try SOS again.' });
    return;
  }

  if (source !== 'test') {
    const recent = await Incident.findOne({
      vehicleId,
      incidentType: 'crash_detected',
      status: 'detected',
      timestamp: { $gte: new Date(Date.now() - 60000) },
    }).sort({ timestamp: -1 });
    if (recent) {
      await emitCrashOverlay(socket, recent, {
        isTest: false,
        message: 'Possible crash detected. If you are safe, tap I AM SAFE. Otherwise send your location to your contacts.',
      });
      return;
    }
  }

  const gForce = Number.isFinite(peakAcceleration) ? Math.abs(peakAcceleration) / 9.80665 : 0;
  const incident = await Incident.create({
    vehicleId,
    userId: vehicle.owner,
    incidentType: 'crash_detected',
    severity: source === 'test' ? 'minor' : (gForce >= 8 ? 'critical' : 'severe'),
    location: { type: 'Point', coordinates: [longitude, latitude] },
    description: source === 'test'
      ? 'Test SOS from the phone. Not a real crash.'
      : `Phone impact ${peakAcceleration.toFixed(1)} m/s² (${gForce.toFixed(1)} g) at ${speed.toFixed(0)} km/h`,
    impactData: {
      decelerationG: gForce,
      estimatedSpeed: speed,
    },
    autoEscalationTimer: 30,
    notes: source === 'test' ? 'Test SOS. Messages are sent only after a tap on this phone.' : '',
  });

  await emitCrashOverlay(socket, incident, {
    isTest: source === 'test',
    message: source === 'test'
      ? 'Test SOS. This is not a real crash. Your location is ready. Nothing is sent until you tap.'
      : 'Possible crash detected. If you are safe, tap I AM SAFE. Otherwise send your location to your contacts.',
  });

  logger.warn(`SENSOR CRASH: Vehicle ${vehicleId}, source=${source}, severity=${incident.severity}`);
}

async function handleSosSent(socket, data) {
  const incidentId = data?.incidentId;
  const channel = String(data?.channel || 'sms').slice(0, 40);
  if (!incidentId) return;

  const incident = await Incident.findById(incidentId);
  if (!incident) return;

  const user = await User.findById(incident.userId).select('emergencyContacts');
  incident.emergencyNotified = true;
  incident.emergencyNotifiedAt = new Date();
  if (incident.status === 'detected') incident.status = 'confirmed';
  incident.emergencyContacts = (user?.emergencyContacts || []).map((contact) => ({
    name: contact.name,
    phone: contact.phone,
    notifiedAt: new Date(),
  }));
  incident.notes = `Location message opened on this phone via ${channel}. UCASA does not call 112 by itself.`;
  await incident.save();

  socket.emit('emergency:sos-recorded', {
    incidentId,
    message: 'SOS saved. Finish sending the text from your phone, and call 112 if you need help.',
  });
}

function getIO() {
  return io;
}

module.exports = { initializeSocket, getIO };
