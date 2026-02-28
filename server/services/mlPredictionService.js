/**
 * ============================================================
 * ML PREDICTION SERVICE — Layer 2: Predictive ML Module
 * ============================================================
 *
 * Accepts real-time telemetry features and returns:
 *   - Collision probability (0–1)
 *   - Recommended action
 *
 * Architecture:
 *   - Feature vector builder for standardized ML input
 *   - Mock inference engine (production-swappable)
 *   - Plug-in interface for TensorFlow.js / external AI APIs
 *   - Training-ready data structure export
 *
 * The mock model uses a logistic-regression-style heuristic
 * calibrated against realistic collision dynamics so the system
 * is immediately useful before a trained model is available.
 * ============================================================
 */

const logger = require('../middleware/logger');

// ───────────────────────────────────────────
// FEATURE VECTOR BUILDER
// ───────────────────────────────────────────
// Normalizes raw telemetry into a fixed-length numeric vector
// suitable for ML model consumption.

const FEATURE_RANGES = {
  speed: { min: 0, max: 200 },
  acceleration: { min: -15, max: 15 },
  directionChange: { min: 0, max: 180 },
  distance: { min: 0, max: 500 },
  relativeSpeed: { min: 0, max: 300 },
  ttc: { min: 0, max: 60 },
  trafficDensity: { low: 0.2, medium: 0.5, high: 0.9, unknown: 0.5 },
  roadType: { highway: 0.8, urban: 0.6, rural: 0.3, residential: 0.4, unknown: 0.5 },
  behaviorScore: { min: 0, max: 100 },
};

function normalize(value, min, max) {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

function buildFeatureVector(input) {
  const {
    speed = 0,
    acceleration = 0,
    directionChange = 0,
    distance = 500,
    relativeSpeed = 0,
    ttc = 60,
    trafficDensity = 'unknown',
    roadType = 'unknown',
    behaviorScore = 80,
  } = input;

  return {
    raw: { speed, acceleration, directionChange, distance, relativeSpeed, ttc, trafficDensity, roadType, behaviorScore },
    normalized: [
      normalize(speed, FEATURE_RANGES.speed.min, FEATURE_RANGES.speed.max),
      normalize(Math.abs(acceleration), 0, FEATURE_RANGES.acceleration.max),
      normalize(directionChange, FEATURE_RANGES.directionChange.min, FEATURE_RANGES.directionChange.max),
      normalize(distance, FEATURE_RANGES.distance.min, FEATURE_RANGES.distance.max),
      normalize(relativeSpeed, FEATURE_RANGES.relativeSpeed.min, FEATURE_RANGES.relativeSpeed.max),
      ttc === null || ttc === Infinity ? 0 : (1 - normalize(ttc, FEATURE_RANGES.ttc.min, FEATURE_RANGES.ttc.max)),
      FEATURE_RANGES.trafficDensity[trafficDensity] || 0.5,
      FEATURE_RANGES.roadType[roadType] || 0.5,
      1 - normalize(behaviorScore, FEATURE_RANGES.behaviorScore.min, FEATURE_RANGES.behaviorScore.max),
    ],
    labels: [
      'speed_norm', 'acceleration_norm', 'directionChange_norm',
      'distance_norm', 'relativeSpeed_norm', 'ttc_inverse_norm',
      'trafficDensity_enc', 'roadType_enc', 'behaviorRisk_norm',
    ],
  };
}

// ───────────────────────────────────────────
// MOCK ML INFERENCE
// ───────────────────────────────────────────
// Logistic-regression-style heuristic with learned-style weights.
// Replace this function body with actual model.predict() call
// when a trained model is available.

const MOCK_WEIGHTS = [0.12, 0.14, 0.08, 0.22, 0.16, 0.18, 0.04, 0.03, 0.03];
const MOCK_BIAS = -0.35;

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

function mockInference(featureVector) {
  let z = MOCK_BIAS;
  for (let i = 0; i < featureVector.length; i++) {
    z += MOCK_WEIGHTS[i] * featureVector[i] * 5;
  }
  return sigmoid(z);
}

// ───────────────────────────────────────────
// ACTION RECOMMENDATION
// ───────────────────────────────────────────

function recommendAction(probability, featureVector) {
  const [speedNorm, , , distNorm, relSpeedNorm, ttcInverse] = featureVector;

  if (probability >= 0.8 && ttcInverse > 0.7) return 'brake';
  if (probability >= 0.6 && relSpeedNorm > 0.5) return 'brake';
  if (probability >= 0.5 && speedNorm > 0.6) return 'slow_down';
  if (probability >= 0.4 && distNorm > 0.6) return 'move_right';
  if (probability >= 0.3 && distNorm > 0.5) return 'move_left';
  if (probability >= 0.2) return 'slow_down';
  return 'maintain_speed';
}

// ───────────────────────────────────────────
// MODEL INTERFACE (Plug-in Architecture)
// ───────────────────────────────────────────

let activeModel = null;

const ModelInterface = {
  /**
   * Load a TensorFlow.js or ONNX model.
   * @param {string} modelPath - Path or URL to model artifacts
   */
  async loadModel(modelPath) {
    // Placeholder for: const tf = require('@tensorflow/tfjs-node');
    // activeModel = await tf.loadLayersModel(modelPath);
    logger.info(`ML Model loaded from: ${modelPath}`);
    activeModel = { type: 'mock', path: modelPath };
  },

  async predict(featureVector) {
    if (activeModel && activeModel.type !== 'mock') {
      // Production path:
      // const tensor = tf.tensor2d([featureVector]);
      // const prediction = activeModel.predict(tensor);
      // return prediction.dataSync()[0];
    }
    return mockInference(featureVector);
  },

  isLoaded() {
    return activeModel !== null;
  },
};

// ───────────────────────────────────────────
// MAIN PREDICTION FUNCTION
// ───────────────────────────────────────────

async function predictCollision(input) {
  try {
    const features = buildFeatureVector(input);
    const probability = await ModelInterface.predict(features.normalized);
    const clampedProbability = Math.max(0, Math.min(1, probability));
    const action = recommendAction(clampedProbability, features.normalized);

    return {
      probability: Math.round(clampedProbability * 1000) / 1000,
      action,
      confidence: activeModel && activeModel.type !== 'mock' ? 'model' : 'heuristic',
      features: features.raw,
      featureVector: features.normalized,
      featureLabels: features.labels,
    };
  } catch (err) {
    logger.error('ML prediction failed:', err);
    return {
      probability: 0.5,
      action: 'slow_down',
      confidence: 'fallback',
      error: err.message,
    };
  }
}

// ───────────────────────────────────────────
// TRAINING DATA EXPORT
// ───────────────────────────────────────────
// Structure for collecting labeled training samples.

function createTrainingSample(input, actualOutcome) {
  const features = buildFeatureVector(input);
  return {
    features: features.normalized,
    featureLabels: features.labels,
    rawInput: features.raw,
    label: actualOutcome ? 1 : 0,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  buildFeatureVector,
  predictCollision,
  recommendAction,
  ModelInterface,
  createTrainingSample,
  FEATURE_RANGES,
};
