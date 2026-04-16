const Redis = require('ioredis');

/**
 * Redis Cache Service
 */
class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.init();
  }

  async init() {
    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy: (times) => {
          if (times > 3) {
            console.log('Redis connection failed, running without cache');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
        maxRetriesPerRequest: 1
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        console.log('Redis connected');
      });

      this.client.on('error', (err) => {
        console.log('Redis error:', err.message);
        this.isConnected = false;
      });
    } catch (error) {
      console.log('Redis initialization failed, running without cache');
      this.isConnected = false;
    }
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (!this.isConnected || !this.client) return null;
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error.message);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, expirySeconds = 3600) {
    if (!this.isConnected || !this.client) return false;
    
    try {
      await this.client.setex(key, expirySeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error.message);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key) {
    if (!this.isConnected || !this.client) return false;
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error.message);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!this.isConnected || !this.client) return false;
    
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get or set cache pattern
   */
  async getOrSet(key, fetchFn, expirySeconds = 3600) {
    const cached = await this.get(key);
    if (cached) return cached;

    const value = await fetchFn();
    if (value) {
      await this.set(key, value, expirySeconds);
    }
    return value;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern) {
    if (!this.isConnected || !this.client) return;
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidate error:', error.message);
    }
  }

  /**
   * Cache medicine analysis results
   */
  async cacheAnalysis(imageHash, result) {
    const key = `analysis:${imageHash}`;
    return await this.set(key, result, 1800); // 30 min cache
  }

  /**
   * Get cached analysis
   */
  async getCachedAnalysis(imageHash) {
    const key = `analysis:${imageHash}`;
    return await this.get(key);
  }

  /**
   * Cache CDSCO alerts
   */
  async cacheAlerts(alerts) {
    return await this.set('cdsco:active_alerts', alerts, 300); // 5 min cache
  }

  /**
   * Get cached CDSCO alerts
   */
  async getCachedAlerts() {
    return await this.get('cdsco:active_alerts');
  }

  /**
   * Close connection
   */
  async close() {
    if (this.client) {
      await this.client.quit();
    }
  }
}

module.exports = new CacheService();