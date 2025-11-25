const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const User = require('../models/User');

// JWT Secret from config
const JWT_SECRET = config.auth.jwt.secret;

// Validate JWT secret is not using default in production
if (config.isProduction && JWT_SECRET === 'home-system-secret-key-2024') {
  console.error('CRITICAL SECURITY WARNING: Using default JWT_SECRET in production!');
  console.error('Please set a strong JWT_SECRET environment variable.');
  process.exit(1);
}

// Legacy admin user configuration (for backward compatibility until migration)
const LEGACY_ADMIN = {
  id: 'admin',
  username: config.auth.defaultAdmin.email.split('@')[0],
  email: config.auth.defaultAdmin.email,
  name: config.auth.defaultAdmin.name,
  role: 'admin',
};

let LEGACY_ADMIN_PASSWORD_HASH = null;

/**
 * Initialize authentication system
 * Creates default admin user if none exists
 */
const initializeAuth = async () => {
  try {
    // Hash legacy admin password for backward compatibility
    const adminPassword = config.auth.defaultAdmin.password;
    LEGACY_ADMIN_PASSWORD_HASH = await bcrypt.hash(adminPassword, config.auth.password.saltRounds);

    // Check if any admin user exists in database
    const adminExists = await User.findOne({ role: 'admin' });

    if (!adminExists) {
      // Create default admin user
      const defaultAdmin = new User({
        email: config.auth.defaultAdmin.email,
        password: config.auth.defaultAdmin.password,
        name: config.auth.defaultAdmin.name,
        role: 'admin',
        status: 'active',
      });

      await defaultAdmin.save();
      console.log('✓ Default admin user created');
    }

    // Warn if using default password
    if (adminPassword === 'admin123') {
      console.warn('⚠️  WARNING: Using default admin password. Please change ADMIN_PASSWORD in .env');
    }

    console.log('✓ Authentication system initialized');
  } catch (error) {
    // If database not ready yet (e.g., during initial setup), just use legacy auth
    if (error.name === 'MongoNotConnectedError' || error.name === 'MongooseServerSelectionError') {
      console.log('✓ Authentication system initialized (legacy mode - database not ready)');
      return;
    }
    console.error('Failed to initialize authentication:', error);
    process.exit(1);
  }
};

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if it's a legacy admin token
    if (decoded.id === 'admin') {
      req.user = { ...LEGACY_ADMIN, ...decoded };
      return next();
    }

    // Load user from database to get fresh data and check status
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Account is not active',
      });
    }

    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'Password recently changed. Please login again.',
      });
    }

    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      properties: user.properties,
      tenantId: user.tenantId,
    };

    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id || user._id,
      email: user.email,
      name: user.name,
      role: user.role || 'tenant',
    },
    JWT_SECRET,
    { expiresIn: config.auth.jwt.expiresIn }
  );
};

/**
 * Validate login credentials
 * Supports both legacy admin and database users
 */
const validateLogin = async (emailOrUsername, password) => {
  // First check legacy admin (for backward compatibility)
  if (
    (emailOrUsername === LEGACY_ADMIN.username || emailOrUsername === LEGACY_ADMIN.email) &&
    LEGACY_ADMIN_PASSWORD_HASH
  ) {
    const isLegacyValid = await bcrypt.compare(password, LEGACY_ADMIN_PASSWORD_HASH);
    if (isLegacyValid) {
      return { user: LEGACY_ADMIN, isLegacy: true };
    }
  }

  // Check database users
  try {
    const user = await User.findByEmailWithPassword(emailOrUsername.toLowerCase());

    if (!user) {
      return null;
    }

    // Check if account is locked
    if (user.isLocked()) {
      return { error: 'Account is temporarily locked. Try again later.' };
    }

    // Check if account is active
    if (user.status !== 'active') {
      return { error: 'Account is not active' };
    }

    // Verify password
    const isValid = await user.comparePassword(password);

    if (!isValid) {
      await user.incLoginAttempts();
      return null;
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        properties: user.properties,
        tenantId: user.tenantId,
      },
      isLegacy: false,
    };
  } catch (error) {
    console.error('Login validation error:', error);
    return null;
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

/**
 * Get current user data (for /api/auth/me endpoint)
 */
const getCurrentUser = async (userId) => {
  if (userId === 'admin') {
    return LEGACY_ADMIN;
  }

  const user = await User.findById(userId).populate('properties', 'name address');
  return user;
};

module.exports = {
  initializeAuth,
  authenticateToken,
  generateToken,
  validateLogin,
  verifyToken,
  getCurrentUser,
  ADMIN_USER: LEGACY_ADMIN, // Backward compatibility
};
