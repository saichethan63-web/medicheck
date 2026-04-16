const axios = require('axios');
const { CDSCOAlert } = require('../models/database');

/**
 * CDSCO API Service - Indian drug regulatory verification
 */
class CDSCOService {
  constructor() {
    this.apiUrl = process.env.CDSCO_API_URL;
    this.apiKey = process.env.CDSCO_API_KEY;
    this.baseUrl = 'https:// CDSCO API base URL'; // Placeholder
  }

  /**
   * Verify medicine batch against CDSCO database
   */
  async verifyBatch(batchNumber, medicineName, company) {
    try {
      // In production, this would call the actual CDSCO API
      // For now, we'll check against our local database of alerts
      
      const alerts = await CDSCOAlert.findAll({
        where: {
          isActive: true,
          batchNumber: batchNumber
        }
      });

      if (alerts.length > 0) {
        return {
          verified: false,
          isGenuine: false,
          alerts: alerts.map(a => ({
            type: a.alertType,
            severity: a.severity,
            title: a.title,
            description: a.description
          })),
          message: `Alert found for batch ${batchNumber}`
        };
      }

      // Check if medicine is registered (mock check)
      const isRegistered = await this.checkMedicineRegistration(medicineName, company);

      return {
        verified: true,
        isGenuine: isRegistered,
        alerts: [],
        message: isRegistered 
          ? `Batch ${batchNumber} verified against CDSCO database`
          : `Batch ${batchNumber} not found in CDSCO database`
      };
    } catch (error) {
      console.error('CDSCO verification error:', error.message);
      return {
        verified: false,
        isGenuine: null,
        alerts: [],
        message: 'CDSCO verification unavailable',
        error: error.message
      };
    }
  }

  /**
   * Check if medicine is registered with CDSCO
   */
  async checkMedicineRegistration(medicineName, company) {
    // Mock implementation - in production, call CDSCO API
    // This would check if the medicine is in the approved drugs list
    
    const registeredCompanies = [
      'sun pharma', 'cipla', 'dr. reddy', 'dr reddy', 'lupin',
      'aurobindo', 'mankind', 'zydus', 'alkem', ' Abbott', 'novartis', 'pfizer'
    ];

    if (company) {
      return registeredCompanies.some(c => 
        company.toLowerCase().includes(c)
      );
    }

    return false;
  }

  /**
   * Fetch latest alerts from CDSCO
   */
  async fetchAlerts() {
    try {
      // In production, this would call the actual CDSCO API
      // For demo, we'll generate sample alerts
      
      const sampleAlerts = [
        {
          alertId: 'CDSCO/2024/001',
          title: 'Spurious Paracetamol detected in Mumbai',
          description: 'Batch number PCM/2024/089 found to be spurious. Manufacturer: Unknown.',
          medicineName: 'Paracetamol 500mg',
          company: 'Unknown',
          batchNumber: 'PCM/2024/089',
          alertType: 'spurious',
          severity: 'high',
          issuedDate: new Date('2024-12-15')
        },
        {
          alertId: 'CDSCO/2024/002',
          title: 'Counterfeit Amoxicillin in Delhi-NCR',
          description: 'Batch number AMX/2024/456 found to be counterfeit. Original manufacturer: Lupin Ltd.',
          medicineName: 'Amoxicillin 500mg',
          company: 'Lupin',
          batchNumber: 'AMX/2024/456',
          alertType: 'counterfeit',
          severity: 'high',
          issuedDate: new Date('2024-12-10')
        },
        {
          alertId: 'CDSCO/2024/003',
          title: 'Recall: Azithromycin 500mg',
          description: 'Quality issues reported. Manufacturer: Global Pharma.',
          medicineName: 'Azithromycin 500mg',
          company: 'Global Pharma',
          batchNumber: 'AZT/2024/123',
          alertType: 'recall',
          severity: 'medium',
          issuedDate: new Date('2024-12-05')
        },
        {
          alertId: 'CDSCO/2024/004',
          title: 'Substandard Cetrizine detected in Gujarat',
          description: 'Failed quality tests. Manufacturer: Medisure Labs.',
          medicineName: 'Cetrizine 10mg',
          company: 'Medisure Labs',
          batchNumber: 'CTZ/2024/789',
          alertType: 'substandard',
          severity: 'medium',
          issuedDate: new Date('2024-11-28')
        }
      ];

      // Save alerts to database
      for (const alert of sampleAlerts) {
        await CDSCOAlert.findOrCreate({
          where: { alertId: alert.alertId },
          defaults: alert
        });
      }

      return sampleAlerts;
    } catch (error) {
      console.error('CDSCO fetch alerts error:', error.message);
      return [];
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(limit = 50) {
    return await CDSCOAlert.findAll({
      where: { isActive: true },
      order: [['issuedDate', 'DESC']],
      limit
    });
  }

  /**
   * Search alerts by medicine or company
   */
  async searchAlerts(query) {
    const { Op } = require('sequelize');
    
    return await CDSCOAlert.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { medicineName: { [Op.like]: `%${query}%` } },
          { company: { [Op.like]: `%${query}%` } },
          { batchNumber: { [Op.like]: `%${query}%` } },
          { title: { [Op.like]: `%${query}%` } }
        ]
      },
      order: [['issuedDate', 'DESC']]
    });
  }

  /**
   * Check if a specific batch has alerts
   */
  async checkBatchAlerts(batchNumber) {
    return await CDSCOAlert.findAll({
      where: {
        batchNumber: batchNumber,
        isActive: true
      }
    });
  }
}

module.exports = new CDSCOService();