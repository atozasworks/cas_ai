/**
 * ============================================================
 * DRIVING BEHAVIOR ANALYTICS SERVICE
 * ============================================================
 *
 * Tracks and scores driver behavior over time:
 *   - Hard braking events  (deceleration < -6 m/s²)
 *   - Sharp turns           (heading delta > 45°/s)
 *   - Overspeed frequency   (configurable per road type)
 *   - Near-miss count
 *   - Risk exposure time
 *
 * Computes a Driver Safety Score (0–100) stored in MongoDB.
 * ============================================================
 */

const DriverScore = require('../models/DriverScore');
const logger = require('../middleware/logger');

const HARD_BRAKE_THRESHOLD = -6;       // m/s²
const SHARP_TURN_THRESHOLD = 45;       // degrees per update interval
const SPEED_LIMITS = {
  highway: 120,
  urban: 50,
  rural: 80,
  residential: 30,
  unknown: 60,
};

const SCORE_PENALTIES = {
  hardBrake: 2,
  sharpTurn: 1.5,
  overspeed: 1,
  nearMiss: 5,
  riskEvent: 3,
};

function detectHardBrake(acceleration) {
  return acceleration <= HARD_BRAKE_THRESHOLD;
}

function detectSharpTurn(previousHeading, currentHeading) {
  const delta = Math.abs(((currentHeading - previousHeading) + 540) % 360 - 180);
  return delta >= SHARP_TURN_THRESHOLD;
}

function detectOverspeed(speed, roadType = 'unknown') {
  const limit = SPEED_LIMITS[roadType] || SPEED_LIMITS.unknown;
  return speed > limit;
}

async function getOrCreateDriverScore(userId) {
  let score = await DriverScore.findOne({ userId });
  if (!score) {
    score = await DriverScore.create({ userId });
  }
  return score;
}

async function recordEvent(userId, eventType, tripId = null) {
  try {
    const score = await getOrCreateDriverScore(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dailyEntry = score.dailyMetrics.find(
      (d) => d.date.getTime() === today.getTime()
    );
    if (!dailyEntry) {
      score.dailyMetrics.push({
        date: today,
        tripsCount: 0, distanceKm: 0, durationMinutes: 0,
        hardBrakeCount: 0, sharpTurnCount: 0, overspeedCount: 0,
        nearMissCount: 0, riskEventsCount: 0, avgRiskScore: 0, safetyScore: 100,
      });
      dailyEntry = score.dailyMetrics[score.dailyMetrics.length - 1];
    }

    switch (eventType) {
      case 'hard_brake':
        dailyEntry.hardBrakeCount += 1;
        score.lifetime.totalHardBrakes += 1;
        score.components.brakingScore = Math.max(0,
          score.components.brakingScore - SCORE_PENALTIES.hardBrake
        );
        break;
      case 'sharp_turn':
        dailyEntry.sharpTurnCount += 1;
        score.lifetime.totalSharpTurns += 1;
        score.components.turningScore = Math.max(0,
          score.components.turningScore - SCORE_PENALTIES.sharpTurn
        );
        break;
      case 'overspeed':
        dailyEntry.overspeedCount += 1;
        score.lifetime.totalOverspeeds += 1;
        score.components.speedScore = Math.max(0,
          score.components.speedScore - SCORE_PENALTIES.overspeed
        );
        break;
      case 'near_miss':
        dailyEntry.nearMissCount += 1;
        score.lifetime.totalNearMisses += 1;
        score.components.proximityScore = Math.max(0,
          score.components.proximityScore - SCORE_PENALTIES.nearMiss
        );
        break;
      case 'risk_event':
        dailyEntry.riskEventsCount += 1;
        score.lifetime.totalRiskEvents += 1;
        break;
      default:
        break;
    }

    score.recalculateOverall();
    score.lastUpdated = new Date();

    // Keep only last 90 days
    if (score.dailyMetrics.length > 90) {
      score.dailyMetrics = score.dailyMetrics.slice(-90);
    }

    // Trend detection over last 7 days
    const recent = score.dailyMetrics.slice(-7);
    if (recent.length >= 3) {
      const scores = recent.map((d) => d.safetyScore);
      const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
      const secondHalf = scores.slice(Math.floor(scores.length / 2));
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      if (avgSecond - avgFirst > 3) score.trend = 'improving';
      else if (avgFirst - avgSecond > 3) score.trend = 'declining';
      else score.trend = 'stable';
    }

    await score.save();
    return score;
  } catch (err) {
    logger.error('Behavior analytics event recording failed:', err);
    throw err;
  }
}

async function completeTripMetrics(userId, tripStats) {
  try {
    const score = await getOrCreateDriverScore(userId);

    score.lifetime.totalTrips += 1;
    score.lifetime.totalDistanceKm += tripStats.distanceKm || 0;
    score.lifetime.totalDurationMinutes += tripStats.durationMinutes || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let dailyEntry = score.dailyMetrics.find(
      (d) => d.date.getTime() === today.getTime()
    );
    if (dailyEntry) {
      dailyEntry.tripsCount += 1;
      dailyEntry.distanceKm += tripStats.distanceKm || 0;
      dailyEntry.durationMinutes += tripStats.durationMinutes || 0;
    }

    // Gradual score recovery: each safe trip boosts sub-scores slightly
    const recovery = Math.min(0.5, (tripStats.safetyScore || 80) / 200);
    score.components.brakingScore = Math.min(100, score.components.brakingScore + recovery);
    score.components.speedScore = Math.min(100, score.components.speedScore + recovery);
    score.components.turningScore = Math.min(100, score.components.turningScore + recovery);
    score.components.proximityScore = Math.min(100, score.components.proximityScore + recovery);
    score.components.consistencyScore = Math.min(100, score.components.consistencyScore + recovery);

    score.recalculateOverall();
    score.lastUpdated = new Date();
    await score.save();
    return score;
  } catch (err) {
    logger.error('Trip metrics update failed:', err);
    throw err;
  }
}

async function getDriverAnalytics(userId) {
  const score = await getOrCreateDriverScore(userId);
  return {
    overallScore: score.overallScore,
    rank: score.rank,
    trend: score.trend,
    components: score.components,
    lifetime: score.lifetime,
    recentDays: score.dailyMetrics.slice(-7),
  };
}

module.exports = {
  detectHardBrake,
  detectSharpTurn,
  detectOverspeed,
  recordEvent,
  completeTripMetrics,
  getDriverAnalytics,
  getOrCreateDriverScore,
  HARD_BRAKE_THRESHOLD,
  SHARP_TURN_THRESHOLD,
  SPEED_LIMITS,
};
