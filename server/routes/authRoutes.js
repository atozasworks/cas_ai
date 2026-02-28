const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.post('/register', validate(schemas.register), authController.register);
router.post('/login', validate(schemas.login), authController.login);
router.get('/me', protect, authController.getMe);
router.patch('/preferences', protect, authController.updatePreferences);
router.post('/emergency-contacts', protect, validate(schemas.emergencyContact), authController.addEmergencyContact);
router.delete('/emergency-contacts/:phone', protect, authController.removeEmergencyContact);

module.exports = router;
