const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.post('/register', validate(schemas.register), authController.register);
router.post('/request-otp', validate(schemas.requestOtp), authController.requestOtp);
router.post('/register-otp', validate(schemas.registerOtp), authController.registerWithOtp);
router.post('/verify-signup-otp', validate(schemas.verifySignupOtp), authController.verifySignupOtp);
router.post('/login', validate(schemas.login), authController.login);
router.post('/google', validate(schemas.googleAuth), authController.googleAuth);
router.get('/me', protect, authController.getMe);
router.patch('/profile', protect, validate(schemas.profileUpdate), authController.updateProfile);
router.patch('/preferences', protect, authController.updatePreferences);
router.post('/emergency-contacts', protect, validate(schemas.emergencyContact), authController.addEmergencyContact);
router.delete('/emergency-contacts/:phone', protect, authController.removeEmergencyContact);

module.exports = router;
