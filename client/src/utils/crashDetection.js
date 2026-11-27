/**
 * Phone impact thresholds for crash SOS.
 * Keep IMPACT_MS2 in sync with server/utils/crashDetection.js.
 * DeviceMotion acceleration is meters per second squared.
 * 4 g is a hard impact (drop or collision), above normal braking and walking.
 */

export const GRAVITY_MS2 = 9.80665;
export const IMPACT_G = 4;
export const IMPACT_MS2 = IMPACT_G * GRAVITY_MS2;

export function vectorMagnitude(x, y, z) {
  return Math.hypot(Number(x) || 0, Number(y) || 0, Number(z) || 0);
}

export function isCrashImpact(magnitudeMs2) {
  return Number.isFinite(magnitudeMs2) && magnitudeMs2 >= IMPACT_MS2;
}

export function subtractGravity(sample, gravity, alpha = 0.8) {
  const x = Number(sample.x) || 0;
  const y = Number(sample.y) || 0;
  const z = Number(sample.z) || 0;
  const gx = alpha * gravity.x + (1 - alpha) * x;
  const gy = alpha * gravity.y + (1 - alpha) * y;
  const gz = alpha * gravity.z + (1 - alpha) * z;
  return {
    gravity: { x: gx, y: gy, z: gz },
    magnitude: vectorMagnitude(x - gx, y - gy, z - gz),
  };
}
