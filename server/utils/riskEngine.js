/**
 * ============================================================
 * RISK ENGINE — Layer 1: Deterministic Algorithm Engine
 * ============================================================
 *
 * Core collision avoidance computations:
 *   1. Haversine distance calculation
 *   2. Bearing & relative direction detection
 *   3. Time-To-Collision (TTC)
 *   4. Relative speed computation
 *   5. Weighted multi-factor risk scoring
 *   6. Escape path suggestion
 *
 * All angles are in degrees. Distances in meters. Speeds in km/h.
 * ============================================================
 */

const EARTH_RADIUS_M = 6_371_000;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const KMH_TO_MS = 1 / 3.6;

const DEFAULT_WEIGHTS = {
  proximity: 0.35,
  relativeSpeed: 0.30,
  directionAlignment: 0.20,
  acceleration: 0.15,
};

const DEFAULT_THRESHOLDS = {
  maxProximityMeters: 500,
  criticalDistanceMeters: 20,
  criticalTtcSeconds: 3,
  maxSpeedKmh: 200,
  maxAcceleration: 10,
};

// ───────────────────────────────────────────
// 1. HAVERSINE DISTANCE (meters)
// ───────────────────────────────────────────

function haversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) *
    Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ───────────────────────────────────────────
// 2. BEARING CALCULATION (degrees 0–360)
// ───────────────────────────────────────────

function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const y = Math.sin(dLon) * Math.cos(lat2 * DEG_TO_RAD);
  const x =
    Math.cos(lat1 * DEG_TO_RAD) * Math.sin(lat2 * DEG_TO_RAD) -
    Math.sin(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.cos(dLon);
  return ((Math.atan2(y, x) * RAD_TO_DEG) + 360) % 360;
}

// ───────────────────────────────────────────
// 3. RELATIVE DIRECTION FROM HEADING
// ───────────────────────────────────────────
// Given the subject vehicle's heading and the bearing toward
// the nearby vehicle, classify into front/left/back/right.

function getRelativeDirection(ownHeading, bearingToTarget) {
  let diff = ((bearingToTarget - ownHeading) + 360) % 360;

  if (diff <= 45 || diff > 315) return 'front';
  if (diff > 45 && diff <= 135) return 'right';
  if (diff > 135 && diff <= 225) return 'back';
  return 'left';
}

function getDirectionAlignmentFactor(ownHeading, bearingToTarget) {
  const diff = ((bearingToTarget - ownHeading) + 360) % 360;
  const angleDelta = Math.min(diff, 360 - diff);
  // Head-on (0°) → 1.0, perpendicular (90°) → 0.5, same direction (180°) → 0.0
  return 1.0 - (angleDelta / 180);
}

// ───────────────────────────────────────────
// 4. RELATIVE SPEED (km/h)
// ───────────────────────────────────────────

function calculateRelativeSpeed(speedA, speedB, headingA, headingB) {
  const vAx = speedA * Math.sin(headingA * DEG_TO_RAD);
  const vAy = speedA * Math.cos(headingA * DEG_TO_RAD);
  const vBx = speedB * Math.sin(headingB * DEG_TO_RAD);
  const vBy = speedB * Math.cos(headingB * DEG_TO_RAD);

  return Math.sqrt((vAx - vBx) ** 2 + (vAy - vBy) ** 2);
}

// ───────────────────────────────────────────
// 5. TIME-TO-COLLISION (seconds)
// ───────────────────────────────────────────
// TTC = distance / closing_speed
// Returns Infinity when vehicles are not closing.

function calculateTTC(distanceMeters, relativeSpeedKmh, ownHeading, bearingToTarget) {
  const closingAngle = ((bearingToTarget - ownHeading) + 360) % 360;
  const angleDelta = Math.min(closingAngle, 360 - closingAngle);

  // Only consider closing trajectories (within ±90° of heading)
  if (angleDelta > 90) return Infinity;

  const closingSpeedMs = relativeSpeedKmh * KMH_TO_MS * Math.cos(angleDelta * DEG_TO_RAD);
  if (closingSpeedMs <= 0.1) return Infinity;

  return distanceMeters / closingSpeedMs;
}

// ───────────────────────────────────────────
// 6. COMPONENT FACTOR COMPUTATIONS
// ───────────────────────────────────────────

function computeProximityFactor(distanceMeters, thresholds = DEFAULT_THRESHOLDS) {
  if (distanceMeters <= thresholds.criticalDistanceMeters) return 100;
  if (distanceMeters >= thresholds.maxProximityMeters) return 0;

  const range = thresholds.maxProximityMeters - thresholds.criticalDistanceMeters;
  const normalized = (thresholds.maxProximityMeters - distanceMeters) / range;
  // Exponential curve — risk climbs sharply at close range
  return Math.min(100, normalized ** 1.5 * 100);
}

function computeRelativeSpeedFactor(relativeSpeedKmh, thresholds = DEFAULT_THRESHOLDS) {
  if (relativeSpeedKmh <= 0) return 0;
  const normalized = Math.min(relativeSpeedKmh / thresholds.maxSpeedKmh, 1.0);
  return normalized * 100;
}

function computeDirectionAlignmentFactor(ownHeading, bearingToTarget) {
  return getDirectionAlignmentFactor(ownHeading, bearingToTarget) * 100;
}

function computeAccelerationFactor(acceleration, thresholds = DEFAULT_THRESHOLDS) {
  // Positive acceleration toward another vehicle increases risk
  const normalized = Math.min(Math.abs(acceleration) / thresholds.maxAcceleration, 1.0);
  return normalized * 100;
}

// ───────────────────────────────────────────
// 7. COMPOSITE RISK SCORE (0–100)
// ───────────────────────────────────────────

function calculateRiskScore(params, weights = DEFAULT_WEIGHTS, thresholds = DEFAULT_THRESHOLDS) {
  const {
    ownLat, ownLon, ownSpeed, ownHeading, ownAcceleration = 0,
    targetLat, targetLon, targetSpeed, targetHeading,
  } = params;

  const distance = haversineDistance(ownLat, ownLon, targetLat, targetLon);
  const bearing = calculateBearing(ownLat, ownLon, targetLat, targetLon);
  const relativeSpeed = calculateRelativeSpeed(ownSpeed, targetSpeed, ownHeading, targetHeading);
  const ttc = calculateTTC(distance, relativeSpeed, ownHeading, bearing);
  const direction = getRelativeDirection(ownHeading, bearing);

  const proximityFactor = computeProximityFactor(distance, thresholds);
  const relativeSpeedFactor = computeRelativeSpeedFactor(relativeSpeed, thresholds);
  const directionAlignmentFactor = computeDirectionAlignmentFactor(ownHeading, bearing);
  const accelerationFactor = computeAccelerationFactor(ownAcceleration, thresholds);

  const riskScore = Math.min(100, Math.round(
    (weights.proximity * proximityFactor) +
    (weights.relativeSpeed * relativeSpeedFactor) +
    (weights.directionAlignment * directionAlignmentFactor) +
    (weights.acceleration * accelerationFactor)
  ));

  // TTC override: if collision is imminent, floor the risk score
  let adjustedScore = riskScore;
  if (ttc < thresholds.criticalTtcSeconds && ttc !== Infinity) {
    adjustedScore = Math.max(riskScore, 80);
  }

  let riskLevel;
  if (adjustedScore <= 30) riskLevel = 'low';
  else if (adjustedScore <= 60) riskLevel = 'medium';
  else riskLevel = 'high';

  return {
    riskScore: adjustedScore,
    riskLevel,
    components: {
      distance: Math.round(distance * 100) / 100,
      bearing: Math.round(bearing * 100) / 100,
      direction,
      relativeSpeed: Math.round(relativeSpeed * 100) / 100,
      ttc: ttc === Infinity ? null : Math.round(ttc * 100) / 100,
      proximityFactor: Math.round(proximityFactor * 100) / 100,
      relativeSpeedFactor: Math.round(relativeSpeedFactor * 100) / 100,
      directionAlignmentFactor: Math.round(directionAlignmentFactor * 100) / 100,
      accelerationFactor: Math.round(accelerationFactor * 100) / 100,
    },
  };
}

// ───────────────────────────────────────────
// 8. BATCH RISK ASSESSMENT
// ───────────────────────────────────────────
// Evaluate risk against multiple nearby vehicles and
// return sorted results (highest risk first).

function assessNearbyVehicles(ownVehicle, nearbyVehicles, weights, thresholds) {
  const assessments = nearbyVehicles.map((target) => {
    const result = calculateRiskScore({
      ownLat: ownVehicle.latitude,
      ownLon: ownVehicle.longitude,
      ownSpeed: ownVehicle.speed,
      ownHeading: ownVehicle.heading,
      ownAcceleration: ownVehicle.acceleration || 0,
      targetLat: target.latitude,
      targetLon: target.longitude,
      targetSpeed: target.speed,
      targetHeading: target.heading,
    }, weights, thresholds);

    return {
      vehicleId: target.vehicleId,
      ...result,
    };
  });

  return assessments.sort((a, b) => b.riskScore - a.riskScore);
}

// ───────────────────────────────────────────
// 9. ESCAPE PATH SUGGESTION
// ───────────────────────────────────────────
// Evaluate risk in each cardinal direction relative to the
// vehicle heading and recommend the safest escape.

function suggestEscapePath(ownVehicle, nearbyVehicles, weights, thresholds) {
  const directions = ['front', 'right', 'back', 'left'];
  const directionScores = { front: 0, right: 0, back: 0, left: 0 };
  const directionCounts = { front: 0, right: 0, back: 0, left: 0 };

  for (const target of nearbyVehicles) {
    const bearing = calculateBearing(
      ownVehicle.latitude, ownVehicle.longitude,
      target.latitude, target.longitude
    );
    const direction = getRelativeDirection(ownVehicle.heading, bearing);
    const distance = haversineDistance(
      ownVehicle.latitude, ownVehicle.longitude,
      target.latitude, target.longitude
    );
    const relSpeed = calculateRelativeSpeed(
      ownVehicle.speed, target.speed,
      ownVehicle.heading, target.heading
    );
    const ttc = calculateTTC(distance, relSpeed, ownVehicle.heading, bearing);

    // Accumulate danger in each direction
    const dangerScore = computeProximityFactor(distance, thresholds);
    directionScores[direction] += dangerScore;
    directionCounts[direction] += 1;

    // Extra weight if TTC is critical
    if (ttc !== Infinity && ttc < (thresholds?.criticalTtcSeconds || 3)) {
      directionScores[direction] += 50;
    }
  }

  // Safest direction = lowest accumulated danger
  let safest = 'front';
  let lowestDanger = Infinity;

  for (const dir of directions) {
    if (directionScores[dir] < lowestDanger) {
      lowestDanger = directionScores[dir];
      safest = dir;
    }
  }

  return {
    safestDirection: safest,
    directionRisks: Object.fromEntries(
      directions.map((d) => [d, {
        dangerScore: Math.round(directionScores[d] * 100) / 100,
        vehicleCount: directionCounts[d],
      }])
    ),
  };
}

module.exports = {
  EARTH_RADIUS_M,
  DEG_TO_RAD,
  RAD_TO_DEG,
  KMH_TO_MS,
  DEFAULT_WEIGHTS,
  DEFAULT_THRESHOLDS,
  haversineDistance,
  calculateBearing,
  getRelativeDirection,
  getDirectionAlignmentFactor,
  calculateRelativeSpeed,
  calculateTTC,
  computeProximityFactor,
  computeRelativeSpeedFactor,
  computeDirectionAlignmentFactor,
  computeAccelerationFactor,
  calculateRiskScore,
  assessNearbyVehicles,
  suggestEscapePath,
};
