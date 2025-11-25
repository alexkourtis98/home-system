const express = require('express');
const { body, validationResult } = require('express-validator');
const Property = require('../models/Property');
const { authenticateToken } = require('../middleware/auth');
const { canDeleteProperty, cascadeDeleteProperty } = require('../utils/cascade-delete');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// @route   GET /api/properties
// @desc    Get all properties
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;
    
    let filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const properties = await Property.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Property.countDocuments(filter);

    res.json({
      success: true,
      data: properties,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/properties/:id
// @desc    Get single property
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    res.json({
      success: true,
      data: property
    });
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/properties
// @desc    Create property
// @access  Private
router.post('/', [
  body('title').notEmpty().withMessage('Title is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('size').notEmpty().withMessage('Size is required'),
  body('type').isIn(['apartment', 'house', 'studio', 'commercial', 'other']).withMessage('Invalid property type'),
  body('monthlyRent').optional().isNumeric().withMessage('Monthly rent must be a number')
    .isFloat({ min: 0 }).withMessage('Monthly rent cannot be negative')
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

    const property = new Property(req.body);
    await property.save();

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: property
    });
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/properties/:id
// @desc    Update property
// @access  Private
router.put('/:id', [
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('address').optional().notEmpty().withMessage('Address cannot be empty'),
  body('size').optional().notEmpty().withMessage('Size cannot be empty'),
  body('type').optional().isIn(['apartment', 'house', 'studio', 'commercial', 'other']).withMessage('Invalid property type'),
  body('status').optional().isIn(['available', 'occupied', 'maintenance', 'unavailable']).withMessage('Invalid status'),
  body('monthlyRent').optional().isNumeric().withMessage('Monthly rent must be a number')
    .isFloat({ min: 0 }).withMessage('Monthly rent cannot be negative')
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

    const property = await Property.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: property
    });
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/properties/:id
// @desc    Delete property (with cascade delete protection)
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    // Check if property exists
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check if property can be safely deleted
    const { canDelete, reason, activeLeases } = await canDeleteProperty(req.params.id);

    if (!canDelete) {
      return res.status(400).json({
        success: false,
        message: reason,
        activeLeases
      });
    }

    // Cascade delete related records (expired/terminated leases and their payments)
    const cascadeResult = await cascadeDeleteProperty(req.params.id);

    // Delete the property
    await Property.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Property deleted successfully',
      cascadeDeleted: cascadeResult
    });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 