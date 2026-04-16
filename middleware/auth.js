const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models/database');

const JWT_SECRET = process.env.JWT_SECRET || 'medicheck_secret_key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

// Verify JWT Token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Authenticate Middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user from database
    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Register new user
const register = async (userData) => {
  const { email, password, name, role, pharmacyName, licenseNumber } = userData;

  // Check if user exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await User.create({
    email,
    password: hashedPassword,
    name,
    role: role || 'pharmacist',
    pharmacyName,
    licenseNumber
  });

  const token = generateToken(user);
  
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      pharmacyName: user.pharmacyName,
      licenseNumber: user.licenseNumber
    },
    token
  };
};

// Login user
const login = async (email, password) => {
  const user = await User.findOne({ where: { email } });
  
  if (!user) {
    throw new Error('Invalid credentials');
  }

  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      pharmacyName: user.pharmacyName,
      licenseNumber: user.licenseNumber,
      lastLogin: user.lastLogin
    },
    token
  };
};

// Create default admin user
const createDefaultAdmin = async () => {
  const adminExists = await User.findOne({ where: { role: 'admin' } });
  
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.create({
      email: 'admin@medicheck.com',
      password: hashedPassword,
      name: 'System Admin',
      role: 'admin',
      pharmacyName: 'MediCheck HQ',
      isActive: true
    });
    console.log('Default admin created: admin@medicheck.com / admin123');
  }
};

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  register,
  login,
  createDefaultAdmin
};