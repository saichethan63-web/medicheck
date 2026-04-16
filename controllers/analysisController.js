const ocrService = require('../services/ocrService');
const visionService = require('../services/visionService');
const logoService = require('../services/logoService');
const batchService = require('../services/batchService');
const grokService = require('../services/grokService');
const cdscoService = require('../services/cdscoService');
const cacheService = require('../services/cacheService');
const blockchainService = require('../services/blockchainService');
const dealerService = require('../services/dealerService');
const { AnalysisLog, MedicineReference } = require('../models/database');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Analyze medicine image
const analyzeImage = async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imagePath = req.file.path;
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    // Calculate image hash for caching
    const imageBuffer = fs.readFileSync(imagePath);
    const imageHash = crypto.createHash('md5').update(imageBuffer).digest('hex');

    // Check cache first
    const cachedResult = await cacheService.getCachedAnalysis(imageHash);
    if (cachedResult) {
      console.log('Returning cached analysis result');
      return res.json({ ...cachedResult, fromCache: true });
    }

    // Run OCR to extract text
    const ocrResult = await ocrService.extractText(imagePath);
    
    // Analyze with Google Vision (logo detection, label detection)
    const visionResult = await visionService.analyzeImage(imagePath);
    
    // Detect company logo
    const logoResult = await logoService.detectLogo(visionResult);

    // Check CDSCO for batch verification
    let cdscoResult = { verified: false, isGenuine: null, alerts: [] };
    if (ocrResult.batchNumber) {
      cdscoResult = await cdscoService.verifyBatch(
        ocrResult.batchNumber, 
        ocrResult.medicineName, 
        ocrResult.companyName || logoResult.company
      );
    }

    // Check blockchain for batch record
    let blockchainResult = null;
    if (ocrResult.batchNumber) {
      blockchainResult = await blockchainService.verifyBatch(ocrResult.batchNumber);
    }

    // Get Grok AI analysis
    let grokAnalysis = null;
    if (ocrResult.medicineName || ocrResult.companyName) {
      grokAnalysis = await grokService.analyzeMedicine({
        medicineName: ocrResult.medicineName,
        company: ocrResult.companyName || logoResult.company,
        batchNumber: ocrResult.batchNumber,
        ocrText: ocrResult.rawText,
        detectedCompany: logoResult.company,
        cdscoVerified: cdscoResult.verified,
        existingAlerts: cdscoResult.alerts
      });
    }

    // Determine verification result
    let verificationResult = 'unknown';
    let Genuinity = 0;
    let flags = [];

    if (cdscoResult.alerts && cdscoResult.alerts.length > 0) {
      verificationResult = 'counterfeit';
      Genuinity = 95;
      flags.push('CDSCO alert found for this batch');
    } else if (cdscoResult.isGenuine) {
      verificationResult = 'genuine';
      Genuinity = 80;
    } else if (logoResult.detected && ocrResult.medicineName) {
      verificationResult = 'suspicious';
      Genuinity = 50;
      flags.push('Medicine detected but not verified in CDSCO');
    }

    // Combine results
    const analysisResult = {
      imageUrl,
      imageHash,
      ocr: ocrResult,
      vision: visionResult,
      logo: logoResult,
      cdsco: cdscoResult,
      blockchain: blockchainResult,
      grok: grokAnalysis,
      verification: {
        result: verificationResult,
        Genuinity,
        flags
      },
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime
    };

    // Record to blockchain
    if (ocrResult.batchNumber) {
      await blockchainService.recordVerification(ocrResult.batchNumber, verificationResult, {
        medicineName: ocrResult.medicineName,
        company: ocrResult.companyName || logoResult.company,
        Genuinity
      });
    }

    // Cache the result
    await cacheService.cacheAnalysis(imageHash, analysisResult);

    // Save to audit log
    if (req.user) {
      await AnalysisLog.create({
        userId: req.user.id,
        medicineName: ocrResult.medicineName,
        company: ocrResult.companyName || logoResult.company,
        batchNumber: ocrResult.batchNumber,
        imageUrl,
        ocrText: ocrResult.rawText,
        detectedCompany: logoResult.company,
        verificationResult,
        Genuinity,
        flags,
        grokAnalysis: grokAnalysis?.analysis,
        cdscoVerified: cdscoResult.verified,
        processingTime: Date.now() - startTime
      });
    }

    res.json(analysisResult);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      message: error.message 
    });
  }
};

// Manual medicine verification (without image)
const verifyMedicine = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { medicineName, company, batchNumber, manufacturingDate, expiryDate, dealerLicense } = req.body;

    if (!medicineName && !batchNumber) {
      return res.status(400).json({ error: 'Medicine name or batch number is required' });
    }

    // Check CDSCO for batch
    const cdscoResult = await cdscoService.verifyBatch(batchNumber, medicineName, company);

    // Verify dealer license if provided
    let dealerResult = null;
    if (dealerLicense) {
      dealerResult = await dealerService.verifyDealer(dealerLicense);
    }

    // Check blockchain for batch record
    let blockchainResult = null;
    if (batchNumber) {
      blockchainResult = await blockchainService.verifyBatch(batchNumber);
    }

    // Get Grok analysis
    const grokAnalysis = await grokService.analyzeMedicine({
      medicineName,
      company,
      batchNumber,
      cdscoVerified: cdscoResult.verified,
      existingAlerts: cdscoResult.alerts
    });

    // Determine result
    let verificationResult = 'unknown';
    let Genuinity = 0;
    let flags = [];

    if (cdscoResult.alerts?.length > 0) {
      verificationResult = 'counterfeit';
      Genuinity = 95;
      flags = cdscoResult.alerts.map(a => `${a.type}: ${a.title}`);
    } else if (cdscoResult.isGenuine) {
      verificationResult = 'genuine';
      Genuinity = 85;
    }

    // Add dealer verification to flags
    if (dealerResult && !dealerResult.verified) {
      flags.push(`Dealer license verification failed: ${dealerResult.message}`);
    }

    const result = {
      medicineName,
      company,
      batchNumber,
      manufacturingDate,
      expiryDate,
      dealer: dealerResult,
      cdsco: cdscoResult,
      blockchain: blockchainResult,
      grok: grokAnalysis,
      verification: {
        result: verificationResult,
        Genuinity,
        flags
      },
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime
    };

    // Record to blockchain
    if (batchNumber) {
      await blockchainService.recordVerification(batchNumber, verificationResult, {
        medicineName,
        company,
        Genuinity
      });
    }

    // Save to audit log
    if (req.user) {
      await AnalysisLog.create({
        userId: req.user.id,
        medicineName,
        company,
        batchNumber,
        verificationResult,
        Genuinity,
        flags,
        grokAnalysis: grokAnalysis?.analysis,
        cdscoVerified: cdscoResult.verified,
        processingTime: Date.now() - startTime
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get analysis history for current user
const getHistory = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const logs = await AnalysisLog.findAndCountAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      logs: logs.rows,
      total: logs.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all batches (legacy)
const getBatches = async (req, res) => {
  try {
    const batches = batchService.getAllBatches();
    res.json(batches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all medicines (legacy)
const getMedicines = async (req, res) => {
  try {
    const medicines = batchService.getAllMedicines();
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new batch (legacy)
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
  verifyMedicine,
  getHistory,
  getBatches,
  getMedicines,
  createBatch
};