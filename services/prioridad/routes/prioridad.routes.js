const express = require('express');
const router = express.Router();
const prioridadController = require('../controllers/prioridad.controller');

router.post('/', prioridadController.recibirAlerta);

module.exports = router;