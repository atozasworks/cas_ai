import { isCrashImpact, subtractGravity, vectorMagnitude } from '../utils/crashDetection';

const COOLDOWN_MS = 60000;

export function requestMotionPermission() {
  const Motion = typeof window !== 'undefined' ? window.DeviceMotionEvent : null;
  if (!Motion) return Promise.resolve('unavailable');
  if (typeof Motion.requestPermission === 'function') {
    return Motion.requestPermission()
      .then((state) => (state === 'granted' ? 'granted' : 'denied'))
      .catch(() => 'denied');
  }
  return Promise.resolve('granted');
}

function readMagnitude(event, gravity) {
  const lin = event.acceleration;
  const hasLinear = lin && ['x', 'y', 'z'].some((axis) => typeof lin[axis] === 'number');
  if (hasLinear) return vectorMagnitude(lin.x, lin.y, lin.z);

  const raw = event.accelerationIncludingGravity;
  if (!raw || !['x', 'y', 'z'].some((axis) => typeof raw[axis] === 'number')) return null;

  if (!gravity.primed) {
    gravity.x = raw.x || 0;
    gravity.y = raw.y || 0;
    gravity.z = raw.z || 0;
    gravity.primed = true;
    return 0;
  }

  const result = subtractGravity(
    { x: raw.x || 0, y: raw.y || 0, z: raw.z || 0 },
    gravity
  );
  gravity.x = result.gravity.x;
  gravity.y = result.gravity.y;
  gravity.z = result.gravity.z;
  return result.magnitude;
}

export function startCrashSensor({ onImpact }) {
  const gravity = { x: 0, y: 0, z: 0, primed: false };
  let lastTrigger = 0;

  const onMotion = (event) => {
    const magnitude = readMagnitude(event, gravity);
    if (!isCrashImpact(magnitude)) return;
    const now = Date.now();
    if (now - lastTrigger < COOLDOWN_MS) return;
    lastTrigger = now;
    onImpact({ peakAcceleration: magnitude });
  };

  window.addEventListener('devicemotion', onMotion);
  return () => window.removeEventListener('devicemotion', onMotion);
}
