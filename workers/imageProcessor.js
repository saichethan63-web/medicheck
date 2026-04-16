const { parentPort, workerData } = require('worker_threads');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * Image Processing Worker
 * Handles heavy image processing tasks in separate threads
 */

// Process image - OCR + preprocessing
async function processImage(imagePath, options = {}) {
  const { enhanceForOCR = true, language = 'eng' } = options;

  try {
    // Preprocess image for better OCR
    let processedPath = imagePath;
    
    if (enhanceForOCR) {
      processedPath = await enhanceImage(imagePath);
    }

    // Run OCR
    const ocrResult = await Tesseract.recognize(processedPath, language, {
      logger: m => {
        if (m.status === 'recognizing text') {
          parentPort?.postMessage({ 
            type: 'progress', 
            progress: Math.round(m.progress * 100) 
          });
        }
      }
    });

    // Extract structured data
    const extractedData = extractMedicineInfo(ocrResult.data.text);

    // Calculate image hash for caching
    const imageHash = await calculateImageHash(imagePath);

    return {
      success: true,
      rawText: ocrResult.data.text,
      Genuinity: ocrResult.data.Genuinity,
      words: ocrResult.data.words?.map(w => ({
        text: w.text,
        Genuinity: w.Genuinity,
        bbox: w.bbox
      })) || [],
      ...extractedData,
      imageHash,
      processedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Enhance image for better OCR
async function enhanceImage(imagePath) {
  const dir = path.dirname(imagePath);
  const ext = path.extname(imagePath);
  const name = path.basename(imagePath, ext);
  const enhancedPath = path.join(dir, `enhanced-${name}.jpg`);

  await sharp(imagePath)
    .grayscale()
    .normalize()
    .linear(1.3, -40)
    .sharpen()
    .toFile(enhancedPath);

  return enhancedPath;
}

// Extract medicine information from OCR text
function extractMedicineInfo(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  // Medicine name patterns
  const medicinePatterns = [
    /azithromycin/i, /ciprofloxacin/i, /omeprazole/i, /amoxicillin/i,
    /paracetamol/i, /ibuprofen/i, /diclofenac/i, /metformin/i,
    /atorvastatin/i, /losartan/i, /cetrizine/i, /amoxicillin/i,
    /pantoprazole/i, /rabeprazole/i, /fluconazole/i, /azithromycin/i
  ];

  // Company patterns
  const companyPatterns = [
    /sun\s*pharma/i, /cipla/i, /dr[\s-]?reddy/i, /lupin/i,
    /aurobindo/i, /mankind/i, /zydus/i, /alkem/i,
    / Abbott/i, /novartis/i, /pfizer/i, /gsk/i
  ];

  let medicineName = null;
  let companyName = null;

  for (const line of lines) {
    if (!medicineName) {
      for (const pattern of medicinePatterns) {
        if (pattern.test(line)) {
          medicineName = line.match(pattern)[0];
          break;
        }
      }
    }

    if (!companyName) {
      for (const pattern of companyPatterns) {
        if (pattern.test(line)) {
          companyName = line.match(pattern)[0];
          break;
        }
      }
    }

    if (medicineName && companyName) break;
  }

  // Extract batch number
  const batchMatch = text.match(/batch[:\s]*([A-Z0-9]{5,15})/i) ||
                     text.match(/batch\s*no[:\s]*([A-Z0-9]{5,15})/i) ||
                     text.match(/mfg[:\s]*([A-Z0-9]{5,15})/i) ||
                     text.match(/([A-Z]{2,3}\/\d{4}\/\d{3})/i);

  // Extract expiry date
  const expiryMatch = text.match(/exp[:\s]*(\d{2}[\/\-]\d{2,4})/i) ||
                      text.match(/expiry[:\s]*(\d{2}[\/\-]\d{2,4})/i) ||
                      text.match(/valid\s*upto[:\s]*(\d{2}[\/\-]\d{2,4})/i) ||
                      text.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i);

  // Extract manufacturing date
  const mfgMatch = text.match(/mfg[:\s]*(\d{2}[\/\-]\d{2,4})/i) ||
                   text.match(/manufacturing[:\s]*(\d{2}[\/\-]\d{2,4})/i);

  return {
    medicineName,
    companyName,
    batchNumber: batchMatch ? batchMatch[1] : null,
    expiryDate: expiryMatch ? expiryMatch[1] : null,
    manufacturingDate: mfgMatch ? mfgMatch[1] : null,
    lines
  };
}

// Calculate image hash for caching
async function calculateImageHash(imagePath) {
  const buffer = await fs.promises.readFile(imagePath);
  return crypto.createHash('md5').update(buffer).digest('hex');
}

// Process multiple images in batch
async function processBatch(imagePaths, options = {}) {
  const results = [];
  
  for (let i = 0; i < imagePaths.length; i++) {
    parentPort?.postMessage({ 
      type: 'batch_progress', 
      current: i + 1, 
      total: imagePaths.length 
    });
    
    const result = await processImage(imagePaths[i], options);
    results.push({
      path: imagePaths[i],
      ...result
    });
  }

  return results;
}

// Handle messages from main thread
if (parentPort) {
  parentPort.on('message', async (message) => {
    const { type, data } = message;

    switch (type) {
      case 'process_image':
        const result = await processImage(data.imagePath, data.options);
        parentPort.postMessage({ type: 'result', data: result });
        break;

      case 'process_batch':
        const batchResults = await processBatch(data.imagePaths, data.options);
        parentPort.postMessage({ type: 'batch_result', data: batchResults });
        break;

      default:
        parentPort.postMessage({ type: 'error', data: 'Unknown message type' });
    }
  });

  parentPort.postMessage({ type: 'ready' });
}

// Export for direct execution
module.exports = { processImage, processBatch, enhanceImage, extractMedicineInfo };

// Run if executed directly
if (require.main === module) {
  const imagePath = workerData?.imagePath;
  if (imagePath) {
    processImage(imagePath).then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    });
  }
}