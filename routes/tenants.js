const express = require('express');
const { body, validationResult } = require('express-validator');
const Tenant = require('../models/Tenant');
const { authenticateToken } = require('../middleware/auth');
const { canDeleteTenant, cascadeDeleteTenant } = require('../utils/cascade-delete');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// @route   GET /api/tenants
// @desc    Get all tenants
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    let filter = {};
    if (status) filter.status = status;

    const tenants = await Tenant.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Tenant.countDocuments(filter);

    res.json({
      success: true,
      data: tenants,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/tenants/:id
// @desc    Get single tenant
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    res.json({
      success: true,
      data: tenant
    });
  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/tenants
// @desc    Create tenant
// @access  Private
router.post('/', [
  body('name').notEmpty().withMessage('Name is required'),
  body('phone').notEmpty().withMessage('Phone is required')
    .matches(/^[\d\s\+\-\(\)]+$/).withMessage('Phone must contain only numbers, spaces, +, -, (, )')
    .isLength({ min: 6, max: 20 }).withMessage('Phone must be between 6-20 characters'),
  body('email').isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('idPassport').notEmpty().withMessage('ID/Passport is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Check if tenant with same email or ID already exists
    const existingTenant = await Tenant.findOne({
      $or: [
        { email: req.body.email },
        { idPassport: req.body.idPassport }
      ]
    });

    if (existingTenant) {
      return res.status(400).json({
        success: false,
        message: 'Tenant with this email or ID already exists'
      });
    }

    const tenant = new Tenant(req.body);
    await tenant.save();

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      data: tenant
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Tenant with this information already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/tenants/:id
// @desc    Update tenant
// @access  Private
router.put('/:id', [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('phone').optional().notEmpty().withMessage('Phone cannot be empty')
    .matches(/^[\d\s\+\-\(\)]+$/).withMessage('Phone must contain only numbers, spaces, +, -, (, )')
    .isLength({ min: 6, max: 20 }).withMessage('Phone must be between 6-20 characters'),
  body('email').optional().isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('idPassport').optional().notEmpty().withMessage('ID/Passport cannot be empty'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Check if updating email/ID conflicts with existing tenants
    if (req.body.email || req.body.idPassport) {
      const conflictQuery = {
        _id: { $ne: req.params.id }
      };
      
      if (req.body.email && req.body.idPassport) {
        conflictQuery.$or = [
          { email: req.body.email },
          { idPassport: req.body.idPassport }
        ];
      } else if (req.body.email) {
        conflictQuery.email = req.body.email;
      } else if (req.body.idPassport) {
        conflictQuery.idPassport = req.body.idPassport;
      }

      const existingTenant = await Tenant.findOne(conflictQuery);
      if (existingTenant) {
        return res.status(400).json({
          success: false,
          message: 'Another tenant with this email or ID already exists'
        });
      }
    }

    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      data: tenant
    });
  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/tenants/:id
// @desc    Delete tenant (with cascade delete protection)
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    // Check if tenant exists
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Check if tenant can be safely deleted
    const { canDelete, reason, activeLeases } = await canDeleteTenant(req.params.id);

    if (!canDelete) {
      return res.status(400).json({
        success: false,
        message: reason,
        activeLeases
      });
    }

    // Cascade delete related records (expired/terminated leases and their payments)
    const cascadeResult = await cascadeDeleteTenant(req.params.id);

    // Delete the tenant
    await Tenant.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Tenant deleted successfully',
      cascadeDeleted: cascadeResult
    });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 