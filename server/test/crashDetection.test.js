const test = require('node:test');
const assert = require('node:assert/strict');
const {
  IMPACT_MS2,
  isCrashImpact,
  subtractGravity,
} = require('../utils/crashDetection');

test('resting gravity is not a crash', () => {
  assert.equal(isCrashImpact(9.8), false);
  assert.equal(isCrashImpact(IMPACT_MS2), true);
});

test('a gravity-filtered walking bump stays under the crash threshold', () => {
  const result = subtractGravity({ x: 0, y: 0, z: 14.8 }, { x: 0, y: 0, z: 9.8 });
  assert.equal(isCrashImpact(result.magnitude), false);
});

test('a gravity-filtered hard impact crosses the crash threshold', () => {
  const result = subtractGravity({ x: 0, y: 0, z: 9.8 + 50 }, { x: 0, y: 0, z: 9.8 });
  assert.equal(isCrashImpact(result.magnitude), true);
});
