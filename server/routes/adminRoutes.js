const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { login, protectAdmin } = require('../middleware/adminAuth');

router.post('/login', login);

router.use(protectAdmin);

router.get('/dashboard', adminController.getDashboard);

router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id/block', adminController.setUserBlocked);

router.get('/alerts', adminController.getAlerts);
router.get('/alerts/:id', adminController.getAlertById);

router.get('/emergency-contacts', adminController.getEmergencyContacts);
router.post('/emergency-contacts', adminController.createEmergencyContact);
router.patch('/emergency-contacts/:id', adminController.updateEmergencyContact);
router.delete('/emergency-contacts/:id', adminController.deleteEmergencyContact);

router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router;
