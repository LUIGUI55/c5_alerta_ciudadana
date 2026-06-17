const express = require('express');
const router = express.Router();
const historialController = require('../controllers/historial.controller');

router.post('/', historialController.createIncidente);
router.get('/', historialController.getIncidentes);
router.put('/:id/status', historialController.updateIncidenteStatus);

module.exports = router;