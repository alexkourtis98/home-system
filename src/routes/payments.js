const express = require('express');
const { body, validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Lease = require('../models/Lease');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// @route   GET /api/payments
// @desc    Get all payments
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, month, year } = req.query;
    
    let filter = {};
    if (status) filter.status = status;
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    const payments = await Payment.find(filter)
      .populate('lease', 'startDate endDate monthlyRent')
      .populate('property', 'title address')
      .populate('tenant', 'name email phone')
      .sort({ dueDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(filter);

    res.json({
      success: true,
      data: payments,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/payments/:id
// @desc    Get single payment
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('lease')
      .populate('property')
      .populate('tenant');
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/payments
// @desc    Create payment
// @access  Private
router.post('/', [
  body('lease').notEmpty().withMessage('Lease is required'),
  body('amount').isNumeric().withMessage('Amount must be a number')
    .isFloat({ min: 0 }).withMessage('Amount cannot be negative'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1-12'),
  body('year').isInt({ min: 2020 }).withMessage('Valid year is required')
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

    // Get lease information
    const lease = await Lease.findById(req.body.lease).populate('property tenant');
    if (!lease) {
      return res.status(404).json({
        success: false,
        message: 'Lease not found'
      });
    }

    // Check if payment for this month/year already exists
    const existingPayment = await Payment.findOne({
      lease: req.body.lease,
      month: req.body.month,
      year: req.body.year
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Payment for this month already exists'
      });
    }

    // Create payment with lease information
    const paymentData = {
      ...req.body,
      property: lease.property._id,
      tenant: lease.tenant._id
    };

    const payment = new Payment(paymentData);
    await payment.save();

    // Populate the payment before returning
    await payment.populate('lease', 'startDate endDate monthlyRent');
    await payment.populate('property', 'title address');
    await payment.populate('tenant', 'name email phone');

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: payment
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/payments/:id
// @desc    Update payment
// @access  Private
router.put('/:id', [
  body('amount').optional().isNumeric().withMessage('Amount must be a number')
    .isFloat({ min: 0 }).withMessage('Amount cannot be negative'),
  body('dueDate').optional().isISO8601().withMessage('Valid due date is required'),
  body('paidDate').optional().isISO8601().withMessage('Valid paid date is required'),
  body('status').optional().isIn(['pending', 'paid', 'overdue', 'partial']).withMessage('Invalid status'),
  body('paymentMethod').optional().isIn(['cash', 'bank_transfer', 'check', 'online', 'other']).withMessage('Invalid payment method'),
  body('lateFee').optional().isNumeric().withMessage('Late fee must be a number')
    .isFloat({ min: 0 }).withMessage('Late fee cannot be negative')
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

    // If marking as paid, set paidDate if not provided
    if (req.body.status === 'paid' && !req.body.paidDate) {
      req.body.paidDate = new Date();
    }

    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('lease', 'startDate endDate monthlyRent')
     .populate('property', 'title address')
     .populate('tenant', 'name email phone');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: payment
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PATCH /api/payments/:id/toggle-status
// @desc    Toggle payment status between paid/pending
// @access  Private
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Toggle between paid and pending
    const newStatus = payment.status === 'paid' ? 'pending' : 'paid';
    const updateData = { status: newStatus };
    
    // Set or clear paidDate
    if (newStatus === 'paid') {
      updateData.paidDate = new Date();
    } else {
      updateData.paidDate = null;
    }

    const updatedPayment = await Payment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('lease', 'startDate endDate monthlyRent')
     .populate('property', 'title address')
     .populate('tenant', 'name email phone');

    res.json({
      success: true,
      message: `Payment marked as ${newStatus}`,
      data: updatedPayment
    });
  } catch (error) {
    console.error('Toggle payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/payments/:id
// @desc    Delete payment
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/payments/generate-monthly
// @desc    Generate monthly payments for all active leases
// @access  Private
router.post('/generate-monthly', [
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1-12'),
  body('year').isInt({ min: 2020 }).withMessage('Valid year is required')
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

    const { month, year } = req.body;
    
    // Get all active leases
    const activeLeases = await Lease.find({ status: 'active' }).populate('property tenant');
    
    if (activeLeases.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active leases found'
      });
    }

    const createdPayments = [];
    const errors_list = [];

    for (const lease of activeLeases) {
      try {
        // Check if payment already exists
        const existingPayment = await Payment.findOne({
          lease: lease._id,
          month,
          year
        });

        if (!existingPayment) {
          // Create due date (first day of the month)
          const dueDate = new Date(year, month - 1, 1);

          const payment = new Payment({
            lease: lease._id,
            property: lease.property._id,
            tenant: lease.tenant._id,
            amount: lease.monthlyRent,
            dueDate,
            month,
            year,
            status: 'pending'
          });

          await payment.save();
          await payment.populate('lease', 'startDate endDate monthlyRent');
          await payment.populate('property', 'title address');
          await payment.populate('tenant', 'name email phone');
          
          createdPayments.push(payment);
        }
      } catch (error) {
        errors_list.push({
          lease: lease._id,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Generated ${createdPayments.length} monthly payments`,
      data: createdPayments,
      errors: errors_list
    });
  } catch (error) {
    console.error('Generate monthly payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 