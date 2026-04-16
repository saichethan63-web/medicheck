const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Worker } = require('worker_threads');
require('dotenv').config();

// Import services
const { initDatabase, createDefaultAdmin } = require('./models/database');
const { authenticate } = require('./middleware/auth');
const { initScheduledJobs } = require('./jobs/scheduledJobs');
const cacheService = require('./services/cacheService');

// Import routes
const analysisRoutes = require('./routes/analysis');
const authRoutes = require('./routes/auth');
const alertRoutes = require('./routes/alerts');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, 'frontend')));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Worker thread pool for image processing
const workerPool = [];
const maxWorkers = parseInt(process.env.WORKER_THREADS) || 4;

const getWorker = () => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'workers', 'imageProcessor.js'));
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
};

// Make worker pool available
app.locals.getWorker = getWorker;

// Public Routes
app.use('/api/auth', authRoutes);

// Protected Routes (require authentication)
app.use('/api/analysis', authenticate, upload.single('image'), analysisRoutes);
app.use('/api/alerts', authenticate, alertRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'MediCheck API is running',
    timestamp: new Date().toISOString(),
    redis: cacheService.isConnected ? 'connected' : 'disconnected'
  });
});

// Serve frontend at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message 
  });
});

// Initialize server
const startServer = async () => {
  try {
    // Initialize database
    await initDatabase();
    console.log('Database initialized');

    // Create default admin
    await createDefaultAdmin();

    // Start scheduled jobs
    initScheduledJobs();

    // Start server
    app.listen(PORT, () => {
      console.log(`MediCheck server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;