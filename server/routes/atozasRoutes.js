const express = require('express');
const router = express.Router();
const atozasController = require('../controllers/atozasController');

router.get('/atozas', atozasController.startAtozasLogin);
router.get('/atozas/callback', atozasController.handleAtozasCallback);
router.post('/atozas/callback', atozasController.handleAtozasCallback);
router.get('/atozas/me', atozasController.getAtozasMe);
router.post('/logout', atozasController.logoutAtozas);

module.exports = router;
