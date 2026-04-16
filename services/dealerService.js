const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DEALERS_FILE = path.join(__dirname, '../database/dealers.json');

/**
 * Dealer Service - Verify dealer licenses and authenticity
 */
class DealerService {
  constructor() {
    this.apiUrl = process.env.DEALER_API_URL || 'https://api.example.com/dealer-verification';
    this.cache = new Map();
    this.cacheTimeout = 3600000; // 1 hour
    this.dealers = this.loadDealers();
  }

  /**
   * Load dealers from JSON file
   */
  loadDealers() {
    try {
      if (fs.existsSync(DEALERS_FILE)) {
        const data = JSON.parse(fs.readFileSync(DEALERS_FILE, 'utf8'));
        return data.dealers || [];
      }
    } catch (error) {
      console.error('Error loading dealers:', error.message);
    }
    return [];
  }

  /**
   * Verify dealer license number
   */
  async verifyDealer(licenseNumber, dealerName = null) {
    if (!licenseNumber) {
      return { verified: false, message: 'No license number provided' };
    }

    // Check cache first
    const cached = this.cache.get(licenseNumber);
    if (cached && (Date.now() - cached.timestamp < this.cacheTimeout)) {
      return cached.data;
    }

    // Try external API if configured
    try {
      if (this.apiUrl !== 'https://api.example.com/dealer-verification') {
        const response = await axios.get(`${this.apiUrl}/verify/${licenseNumber}`, {
          timeout: 5000
        });
        
        const result = {
          verified: response.data.valid,
          licenseNumber: licenseNumber,
          dealerName: response.data.dealerName || dealerName,
          licenseType: response.data.licenseType,
          validUntil: response.data.validUntil,
          state: response.data.state,
          timestamp: new Date().toISOString()
        };
        
        this.cache.set(licenseNumber, { data: result, timestamp: Date.now() });
        return result;
      }
    } catch (error) {
      console.log('Dealer API not available, using local database');
    }

    // Local validation using dealers.json
    return this.localValidation(licenseNumber, dealerName);
  }

  /**
   * Local validation using dealers.json database
   */
  localValidation(licenseNumber, dealerName) {
    // Find dealer in local database FIRST
    const dealer = this.dealers.find(d => 
      d.licenseNumber.toLowerCase() === licenseNumber.toLowerCase()
    );

    if (dealer) {
      const result = {
        verified: dealer.isVerified,
        licenseNumber: dealer.licenseNumber,
        dealerName: dealer.name,
        licenseType: dealer.licenseType,
        validUntil: dealer.validUntil,
        state: dealer.state,
        city: dealer.city,
        address: dealer.address,
        timestamp: new Date().toISOString(),
        source: 'local_database',
        message: dealer.isVerified 
          ? '✅ Dealer verified from local database' 
          : '⚠️ Dealer found but not verified'
      };

      this.cache.set(licenseNumber, { data: result, timestamp: Date.now() });
      return result;
    }

    // If not in database, check basic format (DL/XX/XXXXXX)
    const dlPattern = /^DL\/\d{2}\/\d{6}$/i;
    const isValidFormat = dlPattern.test(licenseNumber);

    const result = {
      verified: false,
      licenseNumber: licenseNumber,
      dealerName: dealerName || 'Unknown Dealer',
      licenseType: 'Unknown',
      validUntil: null,
      state: null,
      timestamp: new Date().toISOString(),
      source: 'format_validation',
      message: isValidFormat 
        ? '⚠️ License format valid but not in database' 
        : '❌ Invalid license format'
    };

    this.cache.set(licenseNumber, { data: result, timestamp: Date.now() });
    return result;
  }

  /**
   * Get all verified dealers
   */
  getAllDealers() {
    return this.dealers;
  }

  /**
   * Get dealer by license number
   */
  getDealerByLicense(licenseNumber) {
    return this.dealers.find(d => 
      d.licenseNumber.toLowerCase() === licenseNumber.toLowerCase()
    );
  }

  /**
   * Get dealer details
   */
  async getDealerDetails(licenseNumber) {
    const verification = await this.verifyDealer(licenseNumber);
    return verification;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = new DealerService();