const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { hasPermission, isAdmin } = require('../middleware/rbac');
const User = require('../models/User');
const config = require('../config');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// @route   GET /api/users
// @desc    Get all users (with pagination and filters)
// @access  Private (manager+)
router.get('/', hasPermission('users:read'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter = {};

    if (req.query.role) {
      filter.role = req.query.role;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('properties', 'name'),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// @route   GET /api/users/roles
// @desc    Get available roles
// @access  Private (admin only)
router.get('/roles', isAdmin, (req, res) => {
  res.json({
    success: true,
    data: config.auth.roles,
  });
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (manager+ or self)
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid user ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      // Users can view their own profile
      const isOwnProfile = req.user.id.toString() === req.params.id;
      const hasReadAccess = ['manager', 'landlord', 'admin'].includes(req.user.role);

      if (!isOwnProfile && !hasReadAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const user = await User.findById(req.params.id)
        .select('-password')
        .populate('properties', 'name address');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);

// @route   POST /api/users
// @desc    Create new user
// @access  Private (admin only)
router.post(
  '/',
  hasPermission('users:create'),
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: config.auth.password.minLength })
      .withMessage(`Password must be at least ${config.auth.password.minLength} characters`),
    body('name').notEmpty().withMessage('Name is required'),
    body('role')
      .isIn(Object.keys(config.auth.roles))
      .withMessage('Invalid role'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { email, password, name, role, phone, properties, tenantId } = req.body;

      // Check if email already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered',
        });
      }

      const user = new User({
        email: email.toLowerCase(),
        password,
        name,
        role,
        phone,
        properties,
        tenantId,
      });

      await user.save();

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (admin or self for limited fields)
router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('role')
      .optional()
      .isIn(Object.keys(config.auth.roles))
      .withMessage('Invalid role'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const isOwnProfile = req.user.id.toString() === req.params.id;
      const isAdminUser = req.user.role === 'admin';

      if (!isOwnProfile && !isAdminUser) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Fields users can update themselves
      const selfUpdateFields = ['name', 'phone', 'profile'];
      // Fields only admins can update
      const adminOnlyFields = ['role', 'status', 'properties', 'tenantId'];

      const updates = {};

      for (const [key, value] of Object.entries(req.body)) {
        if (selfUpdateFields.includes(key)) {
          updates[key] = value;
        } else if (adminOnlyFields.includes(key) && isAdminUser) {
          updates[key] = value;
        }
      }

      // Handle email change (check uniqueness)
      if (req.body.email && req.body.email !== user.email) {
        if (!isAdminUser) {
          return res.status(403).json({
            success: false,
            message: 'Only admins can change email',
          });
        }
        const existingUser = await User.findOne({
          email: req.body.email.toLowerCase(),
        });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email already in use',
          });
        }
        updates.email = req.body.email.toLowerCase();
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password');

      res.json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);

// @route   PUT /api/users/:id/password
// @desc    Change user password
// @access  Private (admin or self)
router.put(
  '/:id/password',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('currentPassword')
      .if((value, { req }) => req.user.id.toString() === req.params.id)
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: config.auth.password.minLength })
      .withMessage(`Password must be at least ${config.auth.password.minLength} characters`),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const isOwnProfile = req.user.id.toString() === req.params.id;
      const isAdminUser = req.user.role === 'admin';

      if (!isOwnProfile && !isAdminUser) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const user = await User.findById(req.params.id).select('+password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // If changing own password, verify current password
      if (isOwnProfile) {
        const isMatch = await user.comparePassword(req.body.currentPassword);
        if (!isMatch) {
          return res.status(400).json({
            success: false,
            message: 'Current password is incorrect',
          });
        }
      }

      user.password = req.body.newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (admin only)
router.delete(
  '/:id',
  hasPermission('users:delete'),
  [param('id').isMongoId().withMessage('Invalid user ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      // Prevent self-deletion
      if (req.user.id.toString() === req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account',
        });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      await User.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);

// @route   PUT /api/users/:id/status
// @desc    Update user status (activate/deactivate/suspend)
// @access  Private (admin only)
router.put(
  '/:id/status',
  isAdmin,
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('status')
      .isIn(['active', 'inactive', 'suspended'])
      .withMessage('Invalid status'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      // Prevent self-status change
      if (req.user.id.toString() === req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change your own status',
        });
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        message: `User status changed to ${req.body.status}`,
        data: user,
      });
    } catch (error) {
      console.error('Update status error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);

module.exports = router;
