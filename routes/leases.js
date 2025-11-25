const express = require('express');
const { body, validationResult } = require('express-validator');
const Lease = require('../models/Lease');
const Property = require('../models/Property');
const { authenticateToken } = require('../middleware/auth');
const { cascadeDeleteLease } = require('../utils/cascade-delete');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// @route   GET /api/leases
// @desc    Get all leases
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    let filter = {};
    if (status) filter.status = status;

    const leases = await Lease.find(filter)
      .populate('property', 'title address type')
      .populate('tenant', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Lease.countDocuments(filter);

    res.json({
      success: true,
      data: leases,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get leases error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/leases/:id
// @desc    Get single lease
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const lease = await Lease.findById(req.params.id)
      .populate('property')
      .populate('tenant');
    
    if (!lease) {
      return res.status(404).json({
        success: false,
        message: 'Lease not found'
      });
    }

    res.json({
      success: true,
      data: lease
    });
  } catch (error) {
    console.error('Get lease error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/leases
// @desc    Create lease
// @access  Private
router.post('/', [
  body('property').notEmpty().withMessage('Property is required'),
  body('tenant').notEmpty().withMessage('Tenant is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('monthlyRent').isNumeric().withMessage('Monthly rent must be a number')
    .isFloat({ min: 0 }).withMessage('Monthly rent cannot be negative'),
  body('deposit').optional().isNumeric().withMessage('Deposit must be a number')
    .isFloat({ min: 0 }).withMessage('Deposit cannot be negative')
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

    // Validate dates
    const startDate = new Date(req.body.startDate);
    const endDate = new Date(req.body.endDate);
    
    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Check if property is available
    const property = await Property.findById(req.body.property);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    // Check for overlapping leases for the same property
    const overlappingLease = await Lease.findOne({
      property: req.body.property,
      status: { $in: ['active', 'pending'] },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    });

    if (overlappingLease) {
      return res.status(400).json({
        success: false,
        message: 'Property is already leased during this period'
      });
    }

    const lease = new Lease(req.body);
    await lease.save();

    // Update property status to occupied if lease is active
    if (req.body.status === 'active' || !req.body.status) {
      await Property.findByIdAndUpdate(req.body.property, { status: 'occupied' });
    }

    // Populate the lease before returning
    await lease.populate('property', 'title address type');
    await lease.populate('tenant', 'name email phone');

    res.status(201).json({
      success: true,
      message: 'Lease created successfully',
      data: lease
    });
  } catch (error) {
    console.error('Create lease error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/leases/:id
// @desc    Update lease
// @access  Private
router.put('/:id', [
  body('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  body('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  body('monthlyRent').optional().isNumeric().withMessage('Monthly rent must be a number')
    .isFloat({ min: 0 }).withMessage('Monthly rent cannot be negative'),
  body('deposit').optional().isNumeric().withMessage('Deposit must be a number')
    .isFloat({ min: 0 }).withMessage('Deposit cannot be negative'),
  body('status').optional().isIn(['active', 'expired', 'terminated', 'pending']).withMessage('Invalid status')
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

    // Get existing lease first
    const existingLease = await Lease.findById(req.params.id);
    if (!existingLease) {
      return res.status(404).json({
        success: false,
        message: 'Lease not found'
      });
    }

    // Check if dates are being updated
    const startDate = req.body.startDate ? new Date(req.body.startDate) : existingLease.startDate;
    const endDate = req.body.endDate ? new Date(req.body.endDate) : existingLease.endDate;
    const property = req.body.property || existingLease.property;

    // Validate dates if being updated
    if (req.body.startDate || req.body.endDate) {
      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
    }

    // Check for overlapping leases if dates or property changed
    if (req.body.startDate || req.body.endDate || req.body.property) {
      const overlappingLease = await Lease.findOne({
        _id: { $ne: req.params.id }, // Exclude current lease
        property: property,
        status: { $in: ['active', 'pending'] },
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
      });

      if (overlappingLease) {
        return res.status(400).json({
          success: false,
          message: 'Property is already leased during this period'
        });
      }
    }

    // Update the lease
    const lease = await Lease.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('property', 'title address type')
     .populate('tenant', 'name email phone');

    // Handle property status updates
    if (req.body.property && req.body.property.toString() !== existingLease.property.toString()) {
      // Property changed - update both old and new property
      await Property.findByIdAndUpdate(existingLease.property, { status: 'available' });
      if (req.body.status === 'active' || existingLease.status === 'active') {
        await Property.findByIdAndUpdate(req.body.property, { status: 'occupied' });
      }
    } else if (req.body.status) {
      // Status changed - update property
      let propertyStatus = 'available';
      if (req.body.status === 'active') {
        propertyStatus = 'occupied';
      }
      await Property.findByIdAndUpdate(lease.property._id, { status: propertyStatus });
    }

    res.json({
      success: true,
      message: 'Lease updated successfully',
      data: lease
    });
  } catch (error) {
    console.error('Update lease error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/leases/:id
// @desc    Delete lease (with cascade delete of payments)
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const lease = await Lease.findById(req.params.id);

    if (!lease) {
      return res.status(404).json({
        success: false,
        message: 'Lease not found'
      });
    }

    // Cascade delete related records (all payments for this lease)
    const cascadeResult = await cascadeDeleteLease(req.params.id);

    // Update property status to available
    await Property.findByIdAndUpdate(lease.property, { status: 'available' });

    // Delete the lease
    await Lease.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Lease deleted successfully',
      cascadeDeleted: cascadeResult
    });
  } catch (error) {
    console.error('Delete lease error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 