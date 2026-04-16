const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');

// POST /api/analysis/analyze - Analyze a medicine image (upload)
router.post('/analyze', analysisController.analyzeImage);

// POST /api/analysis/verify - Verify medicine manually (no image)
router.post('/verify', analysisController.verifyMedicine);

// GET /api/analysis/history - Get user's analysis history
router.get('/history', analysisController.getHistory);

// GET /api/analysis/batches - Get all batches (legacy)
router.get('/batches', analysisController.getBatches);

// GET /api/analysis/medicines - Get all medicines (legacy)
router.get('/medicines', analysisController.getMedicines);

// POST /api/analysis/batch - Create a new batch (legacy)
router.post('/batch', analysisController.createBatch);

module.exports = router;