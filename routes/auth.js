const express = require('express');
const router = express.Router();
const { register, login } = require('../middleware/auth');

// POST /api/auth/register - Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, pharmacyName, licenseNumber } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const result = await register({ email, password, name, role, pharmacyName, licenseNumber });
    res.status(201).json(result);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/login - Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await login(email, password);
    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message });
  }
});

// GET /api/auth/verify - Verify token
router.get('/verify', require('../middleware/auth').authenticate, (req, res) => {
  res.json({ 
    valid: true, 
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      pharmacyName: req.user.pharmacyName
    }
  });
});

module.exports = router;