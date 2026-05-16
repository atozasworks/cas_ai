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
  res.json({
    success: true,
    apiUrl: config.publicClient.apiUrl || '/api/v1',
    googleClientId: config.publicClient.googleClientId || '',
  });
});

module.exports = router;
