const express = require('express');
const Property = require('../models/Property');
const Tenant = require('../models/Tenant');
const Lease = require('../models/Lease');
const Payment = require('../models/Payment');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// @route   GET /api/dashboard
// @desc    Get dashboard statistics
// @access  Private
router.get('/', async (req, res) => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Get property statistics
    const totalProperties = await Property.countDocuments();
    const occupiedProperties = await Property.countDocuments({ status: 'occupied' });
    const availableProperties = await Property.countDocuments({ status: 'available' });
    const maintenanceProperties = await Property.countDocuments({ status: 'maintenance' });

    // Get tenant statistics
    const totalTenants = await Tenant.countDocuments();
    const activeTenants = await Tenant.countDocuments({ status: 'active' });

    // Get lease statistics
    const totalLeases = await Lease.countDocuments();
    const activeLeases = await Lease.countDocuments({ status: 'active' });
    const expiredLeases = await Lease.countDocuments({ status: 'expired' });

    // Get monthly payment statistics
    const currentMonthPayments = await Payment.find({
      month: currentMonth,
      year: currentYear
    }).populate('property', 'title')
      .populate('tenant', 'name');

    const totalExpectedRent = currentMonthPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const paidPayments = currentMonthPayments.filter(p => p.status === 'paid');
    const totalCollectedRent = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const pendingPayments = currentMonthPayments.filter(p => p.status === 'pending');
    const overduePayments = currentMonthPayments.filter(p => p.status === 'overdue' || 
      (p.status === 'pending' && new Date() > p.dueDate));

    // Get recent activities
    const recentLeases = await Lease.find()
      .populate('property', 'title address')
      .populate('tenant', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentPayments = await Payment.find()
      .populate('property', 'title')
      .populate('tenant', 'name')
      .sort({ updatedAt: -1 })
      .limit(5);

    // Calculate occupancy rate
    const occupancyRate = totalProperties > 0 ? ((occupiedProperties / totalProperties) * 100).toFixed(1) : 0;

    // Get monthly rent trends (last 6 months)
    const rentTrends = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - 1 - i, 1);
      const month = targetDate.getMonth() + 1;
      const year = targetDate.getFullYear();
      
      const monthPayments = await Payment.find({ month, year, status: 'paid' });
      const monthlyTotal = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);
      
      rentTrends.push({
        month: targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: monthlyTotal
      });
    }

    // Get properties by type distribution
    const propertyTypes = await Property.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get upcoming lease expirations (next 3 months)
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    
    const upcomingExpirations = await Lease.find({
      status: 'active',
      endDate: {
        $gte: currentDate,
        $lte: threeMonthsFromNow
      }
    }).populate('property', 'title address')
      .populate('tenant', 'name')
      .sort({ endDate: 1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        summary: {
          totalProperties,
          occupiedProperties,
          availableProperties,
          maintenanceProperties,
          totalTenants,
          activeTenants,
          totalLeases,
          activeLeases,
          expiredLeases,
          occupancyRate: parseFloat(occupancyRate)
        },
        monthly: {
          month: currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          totalExpectedRent,
          totalCollectedRent,
          pendingRent: totalExpectedRent - totalCollectedRent,
          totalPayments: currentMonthPayments.length,
          paidPayments: paidPayments.length,
          pendingPayments: pendingPayments.length,
          overduePayments: overduePayments.length,
          collectionRate: totalExpectedRent > 0 ? ((totalCollectedRent / totalExpectedRent) * 100).toFixed(1) : 0
        },
        charts: {
          rentTrends,
          propertyTypes: propertyTypes.map(type => ({
            type: type._id,
            count: type.count
          }))
        },
        recent: {
          leases: recentLeases.map(lease => ({
            id: lease._id,
            property: lease.property.title,
            tenant: lease.tenant.name,
            startDate: lease.startDate,
            monthlyRent: lease.monthlyRent,
            status: lease.status,
            createdAt: lease.createdAt
          })),
          payments: recentPayments.map(payment => ({
            id: payment._id,
            property: payment.property.title,
            tenant: payment.tenant.name,
            amount: payment.amount,
            status: payment.status,
            dueDate: payment.dueDate,
            paidDate: payment.paidDate,
            updatedAt: payment.updatedAt
          }))
        },
        alerts: {
          upcomingExpirations: upcomingExpirations.map(lease => ({
            id: lease._id,
            property: lease.property.title,
            tenant: lease.tenant.name,
            endDate: lease.endDate,
            monthlyRent: lease.monthlyRent
          })),
          overduePayments: overduePayments.map(payment => ({
            id: payment._id,
            property: payment.property.title,
            tenant: payment.tenant.name,
            amount: payment.amount,
            dueDate: payment.dueDate,
            daysOverdue: Math.floor((currentDate - payment.dueDate) / (1000 * 60 * 60 * 24))
          }))
        }
      }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics (alias for compatibility)
// @access  Private
router.get('/stats', async (req, res) => {
  // Redirect to main dashboard route
  req.url = '/';
  router.handle(req, res);
});

module.exports = router; 