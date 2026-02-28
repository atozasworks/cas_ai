const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

router.use(protect);

router.post('/', validate(schemas.vehicleCreate), vehicleController.createVehicle);
router.get('/', vehicleController.getMyVehicles);
router.get('/nearby', vehicleController.getNearbyOnlineVehicles);
router.get('/:id', vehicleController.getVehicle);
router.patch('/:id', vehicleController.updateVehicle);
router.delete('/:id', vehicleController.deleteVehicle);

module.exports = router;
