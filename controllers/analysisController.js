const ocrService = require('../services/ocrService');
const visionService = require('../services/visionService');
const logoService = require('../services/logoService');
const batchService = require('../services/batchService');
const fs = require('fs');
const path = require('path');

// Analyze medicine image
const analyzeImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imagePath = req.file.path;
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    // Run OCR to extract text
    const ocrResult = await ocrService.extractText(imagePath);
    
    // Analyze with Google Vision (logo detection, label detection)
    const visionResult = await visionService.analyzeImage(imagePath);
    
    // Detect company logo
    const logoResult = await logoService.detectLogo(visionResult);
    
    // Combine results
    const analysisResult = {
      imageUrl,
      ocr: ocrResult,
      vision: visionResult,
      logo: logoResult,
      timestamp: new Date().toISOString()
    };

    res.json(analysisResult);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      message: error.message 
    });
  }
};

// Get all batches
const getBatches = async (req, res) => {
  try {
    const batches = batchService.getAllBatches();
    res.json(batches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all medicines
const getMedicines = async (req, res) => {
  try {
    const medicines = batchService.getAllMedicines();
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new batch
const createBatch = async (req, res) => {
  try {
    const batch = req.body;
    const createdBatch = batchService.createBatch(batch);
    res.status(201).json(createdBatch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  analyzeImage,
  getBatches,
  getMedicines,
  createBatch
};