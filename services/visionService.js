const vision = require('@google-cloud/vision');
const fs = require('fs');
require('dotenv').config();

/**
 * Vision Service - Google Cloud Vision API integration
 * Provides logo detection, label detection, text detection, and object localization
 */
class VisionService {
  constructor() {
    // Initialize Google Vision client
    this.client = new vision.ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_VISION_KEY_PATH || undefined,
      credentials: (process.env.GOOGLE_VISION_API_KEY && process.env.GOOGLE_VISION_API_KEY !== 'your_google_vision_api_key_here') ? 
        JSON.parse(process.env.GOOGLE_VISION_API_KEY) : undefined
    });
  }

  /**
   * Analyze image using Google Vision API
   */
  async analyzeImage(imagePath) {
    try {
      // Check if image exists
      if (!fs.existsSync(imagePath)) {
        throw new Error('Image file not found');
      }

      // Read image as buffer for local files
      const imageBuffer = fs.readFileSync(imagePath);

      // Prepare request for multiple features
      const request = {
        image: { content: imageBuffer },
        features: [
          { type: 'LOGO_DETECTION', maxResults: 5 },
          { type: 'LABEL_DETECTION', maxResults: 10 },
          { type: 'TEXT_DETECTION' },
          { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
          { type: 'IMAGE_PROPERTIES' }
        ]
      };

      const [result] = await this.client.annotateImage(request);

      return this.formatVisionResult(result);
    } catch (error) {
      console.error('Vision API Error:', error.message);
      
      // Return mock data for development without API key or API errors
      if (error.message.includes('key') || error.message.includes('credentials') || error.message.includes('No image')) {
        return this.getMockVisionResult();
      }
      
      throw new Error(`Vision analysis failed: ${error.message}`);
    }
  }

  /**
   * Format Vision API response
   */
  formatVisionResult(result) {
    return {
      logos: (result.logoAnnotations || []).map(logo => ({
        description: logo.description,
        score: logo.score,
        boundingPoly: logo.boundingPoly
      })),
      labels: (result.labelAnnotations || []).map(label => ({
        description: label.description,
        score: label.score,
        topicality: label.topicality
      })),
      text: result.textAnnotations ? {
        text: result.textAnnotations.map(t => t.description).join(' '),
        annotations: result.textAnnotations.slice(0, 10).map(t => ({
          text: t.description,
          boundingPoly: t.boundingPoly
        }))
      } : null,
      objects: (result.localizedObjectAnnotations || []).map(obj => ({
        name: obj.name,
        score: obj.score,
        boundingPoly: obj.boundingPoly
      })),
      colors: result.imagePropertiesAnnotation ? 
        (result.imagePropertiesAnnotation.dominantColors.colors || []).slice(0, 5).map(c => ({
          color: c.color,
          score: c.score,
          pixelFraction: c.pixelFraction
        })) : []
    };
  }

  /**
   * Mock Vision result for development without API key
   */
  getMockVisionResult() {
    return {
      logos: [],
      labels: [
        { description: 'medicine', score: 0.9 },
        { description: 'pharmaceutical', score: 0.85 },
        { description: 'tablet', score: 0.8 }
      ],
      text: null,
      objects: [],
      colors: []
    };
  }

  /**
   * Detect specific logo from known pharmaceutical companies
   */
  async detectCompanyLogo(imagePath) {
    const result = await this.analyzeImage(imagePath);
    
    const knownCompanies = {
      'sun pharma': 'Sun Pharmaceutical',
      'cipla': 'Cipla',
      'dr. reddy': 'Dr. Reddy\'s',
      'dr reddy': 'Dr. Reddy\'s',
      'lupin': 'Lupin',
      'aurobindo': 'Aurobindo Pharma',
      'mankind': 'Mankind Pharma',
      'zydus': 'Zydus Cadila',
      'alkem': 'Alkem Laboratories',
      ' Abbott': 'Abbott',
      'novartis': 'Novartis',
      'pfizer': 'Pfizer'
    };

    const detectedLogos = result.logos || [];
    
    for (const logo of detectedLogos) {
      const desc = logo.description.toLowerCase();
      for (const [key, name] of Object.entries(knownCompanies)) {
        if (desc.includes(key)) {
          return {
            company: name,
            logo: logo.description,
            confidence: logo.score
          };
        }
      }
    }

    return null;
  }
}

module.exports = new VisionService();