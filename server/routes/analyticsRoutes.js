const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/dashboard', analyticsController.getDashboardSummary);
router.get('/driver-score', analyticsController.getDriverScore);
router.get('/risk-events', analyticsController.getRiskEvents);
router.get('/trips', analyticsController.getTripHistory);
router.get('/incidents', analyticsController.getIncidents);

module.exports = router;
