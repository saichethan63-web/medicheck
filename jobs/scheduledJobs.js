const cron = require('node-cron');
const { CDSCOAlert, AnalysisLog } = require('../models/database');
const cdscoService = require('../services/cdscoService');
const cacheService = require('../services/cacheService');

/**
 * Scheduled Jobs
 * - Fetch CDSCO alerts every 15 minutes
 * - Clean old analysis logs weekly
 * - Generate daily reports
 */

// Job: Fetch CDSCO alerts every 15 minutes
const fetchCDSCOAlerts = cron.schedule('*/15 * * * *', async () => {
  try {
    console.log('Fetching latest CDSCO alerts...');
    const alerts = await cdscoService.fetchAlerts();
    
    // Update cache
    await cacheService.cacheAlerts(alerts);
    
    console.log(`Fetched ${alerts.length} CDSCO alerts`);
  } catch (error) {
    console.error('Error fetching CDSCO alerts:', error.message);
  }
});

// Job: Clean old analysis logs (older than 90 days) - Run weekly on Sunday
const cleanOldLogs = cron.schedule('0 2 * * 0', async () => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const deleted = await AnalysisLog.destroy({
      where: {
        createdAt: {
          [require('sequelize').Op.lt]: cutoffDate
        }
      }
    });

    console.log(`Cleaned ${deleted} old analysis logs`);
  } catch (error) {
    console.error('Error cleaning old logs:', error.message);
  }
});

// Job: Generate daily statistics - Run daily at midnight
const generateDailyStats = cron.schedule('0 0 * * *', async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayLogs = await AnalysisLog.findAll({
      where: {
        createdAt: {
          [require('sequelize').Op.gte]: today,
          [require('sequelize').Op.lt]: tomorrow
        }
      }
    });

    const stats = {
      totalAnalyses: todayLogs.length,
      genuine: todayLogs.filter(l => l.verificationResult === 'genuine').length,
      suspicious: todayLogs.filter(l => l.verificationResult === 'suspicious').length,
      counterfeit: todayLogs.filter(l => l.verificationResult === 'counterfeit').length,
      unknown: todayLogs.filter(l => l.verificationResult === 'unknown').length,
      averageProcessingTime: todayLogs.length > 0 
        ? todayLogs.reduce((sum, l) => sum + (l.processingTime || 0), 0) / todayLogs.length 
        : 0,
      generatedAt: new Date().toISOString()
    };

    console.log('Daily Statistics:', stats);
    
    // Cache the stats
    await cacheService.set('stats:daily', stats, 86400);
  } catch (error) {
    console.error('Error generating daily stats:', error.message);
  }
});

// Job: Update medicine reference cache - Run daily at 6 AM
const updateMedicineCache = cron.schedule('0 6 * * *', async () => {
  try {
    const { MedicineReference } = require('../models/database');
    
    const medicines = await MedicineReference.findAll({
      where: { isVerified: true }
    });

    await cacheService.set('medicines:verified', medicines, 86400);
    console.log(`Cached ${medicines.length} verified medicines`);
  } catch (error) {
    console.error('Error updating medicine cache:', error.message);
  }
});

// Initialize all scheduled jobs
const initScheduledJobs = () => {
  fetchCDSCOAlerts.start();
  cleanOldLogs.start();
  generateDailyStats.start();
  updateMedicineCache.start();
  
  console.log('Scheduled jobs initialized');
  
  // Run initial fetch
  cdscoService.fetchAlerts().then(alerts => {
    console.log(`Initial load: ${alerts.length} CDSCO alerts`);
  });
};

// Stop all jobs
const stopScheduledJobs = () => {
  fetchCDSCOAlerts.stop();
  cleanOldLogs.stop();
  generateDailyStats.stop();
  updateMedicineCache.stop();
  
  console.log('Scheduled jobs stopped');
};

module.exports = {
  initScheduledJobs,
  stopScheduledJobs,
  fetchCDSCOAlerts,
  cleanOldLogs,
  generateDailyStats,
  updateMedicineCache
};