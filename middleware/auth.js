const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// JWT Secret - MUST be changed in production
const JWT_SECRET = process.env.JWT_SECRET || 'home-system-secret-key-2024';

// Validate JWT secret is not using default in production
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'home-system-secret-key-2024') {
  console.error('CRITICAL SECURITY WARNING: Using default JWT_SECRET in production!');
  console.error('Please set a strong JWT_SECRET environment variable.');
  process.exit(1);
}

// Admin user configuration from environment variables
const ADMIN_USER = {
  id: 'admin',
  username: process.env.ADMIN_USERNAME || 'admin',
  email: process.env.ADMIN_EMAIL || 'admin@home-system.com'
};

// Hash admin password on startup
let ADMIN_PASSWORD_HASH = null;

const initializeAuth = async () => {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    // Warn if using default password
    if (adminPassword === 'admin123') {
      console.warn('⚠️  WARNING: Using default admin password. Please change ADMIN_PASSWORD in .env');
    }

    // Generate hash from environment variable password
    ADMIN_PASSWORD_HASH = await bcrypt.hash(adminPassword, 10);
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
      message: 'Access token required'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
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
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: process.env.SESSION_TIMEOUT || '24h' }
  );
};

/**
 * Validate login credentials using bcrypt
 */
const validateLogin = async (username, password) => {
  // Check username match
  if (username !== ADMIN_USER.username) {
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
  ADMIN_USER
};
