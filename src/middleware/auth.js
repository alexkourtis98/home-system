const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');

// JWT Secret from config
const JWT_SECRET = config.auth.jwt.secret;

// Validate JWT secret is not using default in production
if (config.isProduction && JWT_SECRET === 'home-system-secret-key-2024') {
  console.error('CRITICAL SECURITY WARNING: Using default JWT_SECRET in production!');
  console.error('Please set a strong JWT_SECRET environment variable.');
  process.exit(1);
}

// Admin user configuration from config
const ADMIN_USER = {
  id: 'admin',
  username: config.auth.defaultAdmin.email.split('@')[0], // Use email prefix as username
  email: config.auth.defaultAdmin.email,
  name: config.auth.defaultAdmin.name,
  role: 'admin',
};

// Hash admin password on startup
let ADMIN_PASSWORD_HASH = null;

const initializeAuth = async () => {
  try {
    const adminPassword = config.auth.defaultAdmin.password;

    // Warn if using default password
    if (adminPassword === 'admin123') {
      console.warn('⚠️  WARNING: Using default admin password. Please change ADMIN_PASSWORD in .env');
    }

    // Generate hash from environment variable password
    ADMIN_PASSWORD_HASH = await bcrypt.hash(adminPassword, config.auth.password.saltRounds);
    console.log('✓ Authentication system initialized');
  } catch (error) {
    console.error('Failed to initialize authentication:', error);
    process.exit(1);
  }
};

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required',
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    req.user = user;
    next();
  });
};

/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'tenant',
    },
    JWT_SECRET,
    { expiresIn: config.auth.jwt.expiresIn }
  );
};

/**
 * Validate login credentials using bcrypt
 */
const validateLogin = async (username, password) => {
  // Check username match (support both username and email)
  if (username !== ADMIN_USER.username && username !== ADMIN_USER.email) {
    return false;
  }

  // Check if password hash is initialized
  if (!ADMIN_PASSWORD_HASH) {
    console.error('Password hash not initialized!');
    return false;
  }

  // Compare password with hash using bcrypt
  try {
    const isValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    return isValid;
  } catch (error) {
    console.error('Password validation error:', error);
    return false;
  }
};

/**
 * Verify JWT token (for refresh/validation)
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  initializeAuth,
  authenticateToken,
  generateToken,
  validateLogin,
  verifyToken,
  ADMIN_USER,
};
