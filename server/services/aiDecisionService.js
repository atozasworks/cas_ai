/**
 * ============================================================
 * AI DECISION ENGINE
 * ============================================================
 *
 * Combines:
 *   - Deterministic risk score  (Layer 1 — riskEngine)
 *   - ML collision probability  (Layer 2 — mlPredictionService)
 *
 * Produces:
 *   - Final fused risk level
 *   - Actionable recommendation
 *   - Human-readable explanation
 *
 * Fusion formula:
 *   FinalRisk = (0.6 * RiskScoreNormalized) + (0.4 * MLProbabilityScaled)
 * ============================================================
 */

const riskEngine = require('../utils/riskEngine');
const mlService = require('./mlPredictionService');
const logger = require('../middleware/logger');

const FUSION_WEIGHT_DETERMINISTIC = 0.6;
const FUSION_WEIGHT_ML = 0.4;

const ACTION_LABELS = {
  brake: 'Apply brakes immediately',
  slow_down: 'Reduce speed gradually',
  move_left: 'Steer left if safe',
  move_right: 'Steer right if safe',
  maintain_speed: 'Maintain current speed and course',
};

const DIRECTION_LABELS = {
  front: 'ahead',
  back: 'behind',
  left: 'to the left',
  right: 'to the right',
};

// ───────────────────────────────────────────
// EXPLANATION GENERATOR
// ───────────────────────────────────────────

function generateExplanation(riskResult, mlResult, finalRisk, escapePath) {
  const parts = [];
  const { components } = riskResult;

  if (finalRisk >= 70) {
    parts.push('HIGH collision probability detected.');
  } else if (finalRisk >= 40) {
    parts.push('MODERATE collision risk detected.');
  } else {
    parts.push('Low collision risk — situation is manageable.');
  }

  if (components.distance < 50) {
    parts.push(`Vehicle is very close at ${components.distance.toFixed(1)}m ${DIRECTION_LABELS[components.direction] || 'nearby'}.`);
  }

  if (components.ttc !== null && components.ttc < 5) {
    parts.push(`Time to potential collision: ${components.ttc.toFixed(1)} seconds.`);
  }

  if (components.relativeSpeed > 30) {
    parts.push(`Closing speed is high at ${components.relativeSpeed.toFixed(1)} km/h.`);
  }

  if (mlResult.probability > 0.6) {
    parts.push(`Predictive model estimates ${(mlResult.probability * 100).toFixed(0)}% collision likelihood.`);
  }

  if (escapePath) {
    parts.push(`Safest escape direction: ${escapePath.safestDirection}.`);
  }

  return parts.join(' ');
}

// ───────────────────────────────────────────
// MAIN DECISION FUNCTION
// ───────────────────────────────────────────

async function makeDecision(ownVehicle, nearbyVehicles, context = {}) {
  try {
    const { weights, thresholds, driverBehaviorScore = 80 } = context;

    // Layer 1: Deterministic risk for each nearby vehicle
    const riskAssessments = riskEngine.assessNearbyVehicles(
      ownVehicle, nearbyVehicles, weights, thresholds
    );

    // Pick the highest-risk nearby vehicle
    const highestRisk = riskAssessments[0] || null;
    if (!highestRisk) {
      return {
        finalRisk: 0,
        riskLevel: 'low',
        action: 'maintain_speed',
        actionLabel: ACTION_LABELS.maintain_speed,
        explanation: 'No nearby vehicles detected. Continue driving safely.',
        assessments: [],
        escapePath: null,
      };
    }

    // Layer 2: ML prediction on highest-risk pair
    const mlInput = {
      speed: ownVehicle.speed,
      acceleration: ownVehicle.acceleration || 0,
      directionChange: Math.abs(
        ((highestRisk.components.bearing - ownVehicle.heading) + 360) % 360
      ),
      distance: highestRisk.components.distance,
      relativeSpeed: highestRisk.components.relativeSpeed,
      ttc: highestRisk.components.ttc,
      trafficDensity: context.trafficDensity || 'unknown',
      roadType: context.roadType || 'unknown',
      behaviorScore: driverBehaviorScore,
    };

    const mlResult = await mlService.predictCollision(mlInput);

    // Fusion
    const riskScoreNormalized = highestRisk.riskScore / 100;
    const mlProbabilityScaled = mlResult.probability;
    const fusedRisk = Math.round(
      ((FUSION_WEIGHT_DETERMINISTIC * riskScoreNormalized) +
       (FUSION_WEIGHT_ML * mlProbabilityScaled)) * 100
    );
    const finalRisk = Math.min(100, Math.max(0, fusedRisk));

    let riskLevel;
    if (finalRisk <= 30) riskLevel = 'low';
    else if (finalRisk <= 60) riskLevel = 'medium';
    else riskLevel = 'high';

    // Escape path
    const escapePath = riskEngine.suggestEscapePath(
      ownVehicle, nearbyVehicles, weights, thresholds
    );

    // Action: prefer ML action for high-risk, deterministic for medium
    let action;
    if (finalRisk >= 60) {
      action = mlResult.action === 'maintain_speed' ? 'brake' : mlResult.action;
    } else if (finalRisk >= 30) {
      action = mlResult.action;
    } else {
      action = 'maintain_speed';
    }

    const explanation = generateExplanation(highestRisk, mlResult, finalRisk, escapePath);

    return {
      finalRisk,
      riskLevel,
      action,
      actionLabel: ACTION_LABELS[action] || action,
      explanation,
      highestRiskVehicle: highestRisk.vehicleId,
      deterministicScore: highestRisk.riskScore,
      mlProbability: mlResult.probability,
      mlConfidence: mlResult.confidence,
      assessments: riskAssessments.slice(0, 5),
      escapePath,
      timestamp: Date.now(),
    };
  } catch (err) {
    logger.error('AI Decision Engine error:', err);
    return {
      finalRisk: 50,
      riskLevel: 'medium',
      action: 'slow_down',
      actionLabel: ACTION_LABELS.slow_down,
      explanation: 'Decision engine encountered an error. Reduce speed as a precaution.',
      error: err.message,
      timestamp: Date.now(),
    };
  }
}

module.exports = {
  makeDecision,
  generateExplanation,
  FUSION_WEIGHT_DETERMINISTIC,
  FUSION_WEIGHT_ML,
  ACTION_LABELS,
};
