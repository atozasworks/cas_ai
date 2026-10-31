const test = require('node:test');
const assert = require('node:assert/strict');
const {
  haversineDistance,
  getRelativeDirection,
  calculateTTC,
} = require('../utils/riskEngine');

test('haversine distance is zero for one point', () => {
  assert.equal(haversineDistance(12.9716, 77.5946, 12.9716, 77.5946), 0);
});

test('a vehicle straight ahead is classified as front', () => {
  assert.equal(getRelativeDirection(90, 90), 'front');
});

test('a vehicle behind the heading is not closing', () => {
  assert.equal(calculateTTC(100, 40, 0, 180), Infinity);
});
