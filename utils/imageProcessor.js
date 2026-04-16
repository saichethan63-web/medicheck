const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Image Processor - Utility for image preprocessing and optimization
 */
class ImageProcessor {
  constructor() {
    this.defaultOptions = {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 85,
      format: 'jpeg'
    };
  }

  /**
   * Resize and optimize image
   */
  async processImage(imagePath, options = {}) {
    const opts = { ...this.defaultOptions, ...options };
    const processedPath = this.getProcessedPath(imagePath);

    await sharp(imagePath)
      .resize(opts.maxWidth, opts.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toFormat(opts.format, { quality: opts.quality })
      .toFile(processedPath);

    return processedPath;
  }

  /**
   * Get processed image path
   */
  getProcessedPath(originalPath) {
    const dir = path.dirname(originalPath);
    const ext = path.extname(originalPath);
    const name = path.basename(originalPath, ext);
    return path.join(dir, `processed-${name}.jpg`);
  }

  /**
   * Convert to grayscale
   */
  async toGrayscale(imagePath) {
    const outputPath = this.getProcessedPath(imagePath);
    
    await sharp(imagePath)
      .grayscale()
      .toFile(outputPath);
    
    return outputPath;
  }

  /**
   * Apply threshold for better OCR
   */
  async applyThreshold(imagePath, threshold = 128) {
    const outputPath = this.getProcessedPath(imagePath);
    
    await sharp(imagePath)
      .grayscale()
      .linear(1, -(128 - threshold))
      .toFile(outputPath);
    
    return outputPath;
  }

  /**
   * Enhance contrast for text readability
   */
  async enhanceForOCR(imagePath) {
    const outputPath = this.getProcessedPath(imagePath);
    
    await sharp(imagePath)
      .grayscale()
      .normalize()
      .linear(1.5, -50) // Increase contrast
      .toFile(outputPath);
    
    return outputPath;
  }

  /**
   * Get image metadata
   */
  async getMetadata(imagePath) {
    const metadata = await sharp(imagePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: fs.statSync(imagePath).size,
      hasAlpha: metadata.hasAlpha
    };
  }

  /**
   * Create thumbnail
   */
  async createThumbnail(imagePath, width = 200) {
    const dir = path.dirname(imagePath);
    const ext = path.extname(imagePath);
    const name = path.basename(imagePath, ext);
    const thumbnailPath = path.join(dir, `thumb-${name}.jpg`);
    
    await sharp(imagePath)
      .resize(width, null, { fit: 'inside' })
      .toFormat('jpeg', { quality: 70 })
      .toFile(thumbnailPath);
    
    return thumbnailPath;
  }

  /**
   * Crop image to specific region
   */
  async cropImage(imagePath, region) {
    const outputPath = this.getProcessedPath(imagePath);
    
    await sharp(imagePath)
      .extract({
        left: region.left,
        top: region.top,
        width: region.width,
        height: region.height
      })
      .toFile(outputPath);
    
    return outputPath;
  }
}

module.exports = new ImageProcessor();