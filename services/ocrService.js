const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');

/**
 * OCR Service - Extract text from medicine images using Tesseract.js
 */
class OcrService {
  constructor() {
    this.worker = null;
  }

  /**
   * Preprocess image for better OCR results
   */
  async preprocessImage(imagePath) {
    const processedPath = path.join(
      path.dirname(imagePath),
      'processed-' + path.basename(imagePath)
    );

    await sharp(imagePath)
      .grayscale()
      .normalize()
      .threshold(128)
      .toFile(processedPath);

    return processedPath;
  }

  /**
   * Extract text from image using Tesseract.js
   */
  async extractText(imagePath) {
    try {
      // Preprocess for better results
      const processedPath = await this.preprocessImage(imagePath);

      const result = await Tesseract.recognize(processedPath, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      const text = result.data.text;
      const words = result.data.words || [];
      const confidence = result.data.confidence;

      // Extract potential medicine-related information
      const extractedData = this.extractMedicineInfo(text);

      return {
        rawText: text,
        confidence,
        words: words.map(w => ({
          text: w.text,
          confidence: w.confidence,
          bbox: w.bbox
        })),
        ...extractedData
      };
    } catch (error) {
      console.error('OCR Error:', error);
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract medicine-related information from OCR text
   */
  extractMedicineInfo(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    // Common medicine name patterns
    const medicinePatterns = [
      /azithromycin/i,
      /ciprofloxacin/i,
      /omeprazole/i,
      /amoxicillin/i,
      /paracetamol/i,
      /ibuprofen/i,
      /diclofenac/i,
      /metformin/i,
      /atorvastatin/i,
      /losartan/i
    ];

    // Company/brand patterns
    const companyPatterns = [
      /sun\s*pharma/i,
      /cipla/i,
      /dr[\s-]?reddy/i,
      /lupin/i,
      /aurobindo/i,
      /mankind/i,
      /zydus/i,
      /alkem/i
    ];

    let medicineName = null;
    let companyName = null;

    for (const line of lines) {
      // Check for medicine names
      for (const pattern of medicinePatterns) {
        if (pattern.test(line)) {
          medicineName = line.match(pattern)[0];
          break;
        }
      }

      // Check for company names
      for (const pattern of companyPatterns) {
        if (pattern.test(line)) {
          companyName = line.match(pattern)[0];
          break;
        }
      }

      if (medicineName && companyName) break;
    }

    // Extract batch number (common patterns)
    const batchMatch = text.match(/batch[:\s]*([A-Z0-9]{5,15})/i) ||
                       text.match(/batch\s*no[:\s]*([A-Z0-9]{5,15})/i) ||
                       text.match(/mfg[:\s]*([A-Z0-9]{5,15})/i);

    // Extract expiry date
    const expiryMatch = text.match(/exp[:\s]*(\d{2}[\/\-]\d{2,4})/i) ||
                        text.match(/expiry[:\s]*(\d{2}[\/\-]\d{2,4})/i) ||
                        text.match(/valid\s*upto[:\s]*(\d{2}[\/\-]\d{2,4})/i);

    return {
      medicineName,
      companyName,
      batchNumber: batchMatch ? batchMatch[1] : null,
      expiryDate: expiryMatch ? expiryMatch[1] : null,
      lines
    };
  }
}

module.exports = new OcrService();