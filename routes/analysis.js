const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');

// POST /api/analysis/analyze - Analyze a medicine image
router.post('/analyze', analysisController.analyzeImage);

// GET /api/analysis/batches - Get all batches
router.get('/batches', analysisController.getBatches);

// GET /api/analysis/medicines - Get all medicines
router.get('/medicines', analysisController.getMedicines);

// POST /api/analysis/batch - Create a new batch
router.post('/batch', analysisController.createBatch);

module.exports = router;