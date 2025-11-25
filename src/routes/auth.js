const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  generateToken,
  validateLogin,
  authenticateToken,
  getCurrentUser,
  verifyToken,
} = require('../middleware/auth');
const config = require('../config');

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('Email or username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array(),
        });
      }

      const { username, password } = req.body;

      // Validate credentials
      const result = await validateLogin(username, password);

      if (!result) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Check for specific errors (locked account, etc.)
      if (result.error) {
        return res.status(401).json({
          success: false,
          message: result.error,
        });
      }

      const { user } = result;

      // Generate JWT token
      const token = generateToken(user);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id || user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during login',
      });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/auth/verify
// @desc    Verify JWT token
// @access  Public
router.post('/verify', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Token is required',
    });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  res.json({
    success: true,
    message: 'Token is valid',
    user: decoded,
  });
});

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', authenticateToken, (req, res) => {
  try {
    const token = generateToken(req.user);

    res.json({
      success: true,
      message: 'Token refreshed',
      token,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Public
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful',
  });
});

// @route   GET /api/auth/health
// @desc    Health check endpoint
// @access  Public
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
  });
});

module.exports = router;
