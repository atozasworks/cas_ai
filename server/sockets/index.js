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
const config = require('../config');
const logger = require('../middleware/logger');

let io = null;

function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors.allowedOrigins,
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
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.IO Redis adapter attached for multi-instance scaling');
  }

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('join:vehicle', (data) => {
      const { vehicleId, userId } = data;
      socket.join(`vehicle:${vehicleId}`);
      socket.join(`user:${userId}`);
      socket.vehicleId = vehicleId;
      socket.userId = userId;
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
  const Vehicle = require('../models/Vehicle');
  const User = require('../models/User');
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

  // Emit popup + sound when closest vehicle is within PROXIMITY_ALERT_METERS (e.g. 1m)
  // Use risk engine's computed distance so it works with Redis and MongoDB
  const alertMeters = config.risk.proximityAlertMeters ?? 1;
  const closestAssessment = decision.assessments?.[0];
  const closestDistance = closestAssessment?.components?.distance;
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

  socket.emit('emergency:crash-detected', {
    incidentId: incident._id,
    severity: incident.severity,
    message: 'Possible crash detected! Are you safe?',
    countdownSeconds: 30,
    timestamp: Date.now(),
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
    emergencyNotified: true,
    emergencyNotifiedAt: new Date(),
  });

  socket.emit('emergency:acknowledged', {
    incidentId: incident._id,
    message: 'Emergency services have been notified.',
  });

  logger.warn(`EMERGENCY REPORT: Vehicle ${vehicleId}, type=${incidentType}`);
}

function getIO() {
  return io;
}

module.exports = { initializeSocket, getIO };
