const express = require('express');
const router = express.Router();
const config = require('../config');

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

router.get('/app-config', (req, res) => {
  let origin = req.get('origin') || '';
  if (!origin && req.get('referer')) {
    try { origin = new URL(req.get('referer')).origin; } catch (_) { origin = ''; }
  }
  if (!origin) {
    const host = req.get('x-forwarded-host') || req.get('host') || '';
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    if (host) origin = `${proto}://${host}`;
  }
  res.json({
    success: true,
    apiUrl: config.publicClient.apiUrl || '/api/v1',
    googleClientId: config.publicClient.googleClientIdForOrigin(origin) || '',
    atozasSsoEnabled: config.atozas.enabled === true,
    atozasAutoRedirect: config.atozas.enabled === true && config.atozas.autoRedirect === true,
  });
});

module.exports = router;
