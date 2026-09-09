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
  let refererOrigin = '';
  try {
    refererOrigin = req.get('referer') ? new URL(req.get('referer')).origin : '';
  } catch (_) {
    refererOrigin = '';
  }
  const requestOrigin = req.get('origin')
    || refererOrigin
    || `${req.protocol}://${req.get('host')}`;
  res.json({
    success: true,
    apiUrl: config.publicClient.apiUrl || '/api/v1',
    googleClientId: config.publicClient.resolveGoogleClientIdForOrigin(requestOrigin) || '',
    atozasSsoEnabled: config.atozas.enabled === true,
    atozasAutoRedirect: config.atozas.enabled === true && config.atozas.autoRedirect === true,
  });
});

module.exports = router;
