const express = require('express');
const router = express.Router();
const cdscoService = require('../services/cdscoService');
const cacheService = require('../services/cacheService');
const { CDSCOAlert } = require('../models/database');

// GET /api/alerts - Get active alerts (with caching)
router.get('/', async (req, res) => {
  try {
    const { limit = 50, type, severity, search } = req.query;

    // Try cache first
    const cachedAlerts = await cacheService.getCachedAlerts();
    if (cachedAlerts && !search && !type && !severity) {
      return res.json({ 
        alerts: cachedAlerts.slice(0, parseInt(limit)),
        source: 'cache'
      });
    }

    let alerts;
    if (search) {
      alerts = await cdscoService.searchAlerts(search);
    } else {
      alerts = await cdscoService.getActiveAlerts(parseInt(limit));
    }

    // Filter by type
    if (type) {
      alerts = alerts.filter(a => a.alertType === type);
    }

    // Filter by severity
    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }

    res.json({ alerts, source: 'database' });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/alerts/:id - Get specific alert
router.get('/:id', async (req, res) => {
  try {
    const alert = await CDSCOAlert.findByPk(req.params.id);
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    console.error('Get alert error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/alerts/batch/:batchNumber - Check alerts for specific batch
router.get('/batch/:batchNumber', async (req, res) => {
  try {
    const alerts = await cdscoService.checkBatchAlerts(req.params.batchNumber);
    res.json({ 
      batchNumber: req.params.batchNumber,
      hasAlerts: alerts.length > 0,
      alerts 
    });
  } catch (error) {
    console.error('Check batch alerts error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/alerts/refresh - Manually refresh alerts from CDSCO
router.post('/refresh', async (req, res) => {
  try {
    const alerts = await cdscoService.fetchAlerts();
    await cacheService.cacheAlerts(alerts);
    res.json({ 
      message: 'Alerts refreshed successfully', 
      count: alerts.length 
    });
  } catch (error) {
    console.error('Refresh alerts error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/alerts/stats - Get alert statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { Op } = require('sequelize');
    
    const total = await CDSCOAlert.count({ where: { isActive: true } });
    const byType = await CDSCOAlert.findAll({
      where: { isActive: true },
      attributes: ['alertType', [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']],
      group: ['alertType'],
      raw: true
    });
    const bySeverity = await CDSCOAlert.findAll({
      where: { isActive: true },
      attributes: ['severity', [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']],
      group: ['severity'],
      raw: true
    });

    res.json({
      total,
      byType: byType.reduce((acc, item) => ({ ...acc, [item.alertType]: item.count }), {}),
      bySeverity: bySeverity.reduce((acc, item) => ({ ...acc, [item.severity]: item.count }), {})
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;