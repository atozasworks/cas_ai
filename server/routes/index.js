const express = require('express');
const router = express.Router();
const config = require('../config');
const { asyncHandler } = require('../middleware/errorHandler');

const googleClientIdForRequest = (origin) => {
  const pub = config.publicClient || {};
  if (typeof pub.googleClientIdForOrigin === 'function') {
    return pub.googleClientIdForOrigin(origin) || pub.googleClientId || '';
  }
  return pub.googleClientId || '';
};

router.use('/auth', require('./authRoutes'));
router.use('/vehicles', require('./vehicleRoutes'));
router.use('/analytics', require('./analyticsRoutes'));
router.use('/ai', require('./aiRoutes'));

router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.get('/app-config', asyncHandler(async (req, res) => {
  let origin = req.get('origin') || '';
  if (!origin && req.get('referer')) {
    try { origin = new URL(req.get('referer')).origin; } catch (_) { origin = ''; }
  }
  if (!origin) {
    const host = req.get('x-forwarded-host') || req.get('host') || '';
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    if (host) origin = `${proto}://${host}`;
  }

  // A cold ATOZAS probe can take a few seconds. The homepage must not wait on it.
  let atozasSilent = false;
  if (config.atozas.enabled === true) {
    const probe = require('../services/atozasOidc').isSilentSupported().catch(() => false);
    atozasSilent = await Promise.race([
      probe,
      new Promise((resolve) => setTimeout(() => resolve(false), 400)),
    ]);
  }

  res.json({
    success: true,
    apiUrl: (config.publicClient && config.publicClient.apiUrl) || '/api/v1',
    googleClientId: googleClientIdForRequest(origin),
    atozasSsoEnabled: config.atozas.enabled === true,
    atozasAutoRedirect: config.atozas.enabled === true && config.atozas.autoRedirect === true,
    // The SPA may run the silent check (prompt=none) for guests: /api/auth/atozas/silent
    atozasSilent,
  });
}));

module.exports = router;
