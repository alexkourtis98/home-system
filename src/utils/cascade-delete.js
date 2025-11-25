/**
 * Cascade Delete Protection Utilities
 * Prevents data corruption by validating delete operations
 */

const Lease = require('../models/Lease');
const Payment = require('../models/Payment');

/**
 * Check if a property can be safely deleted
 * @param {string} propertyId - Property ID to check
 * @returns {Object} - {canDelete: boolean, reason: string, activeLeases: number}
 */
const canDeleteProperty = async (propertyId) => {
  try {
    // Check for active or pending leases
    const activeLeases = await Lease.countDocuments({
      property: propertyId,
      status: { $in: ['active', 'pending'] }
    });

    if (activeLeases > 0) {
      return {
        canDelete: false,
        reason: `Cannot delete property. It has ${activeLeases} active/pending lease(s). Please terminate or complete these leases first.`,
        activeLeases
      };
    }

    // Safe to delete
    return {
      canDelete: true,
      reason: null,
      activeLeases: 0
    };
  } catch (error) {
    console.error('Error checking property delete safety:', error);
    throw error;
  }
};

/**
 * Check if a tenant can be safely deleted
 * @param {string} tenantId - Tenant ID to check
 * @returns {Object} - {canDelete: boolean, reason: string, activeLeases: number}
 */
const canDeleteTenant = async (tenantId) => {
  try {
    // Check for active or pending leases
    const activeLeases = await Lease.countDocuments({
      tenant: tenantId,
      status: { $in: ['active', 'pending'] }
    });

    if (activeLeases > 0) {
      return {
        canDelete: false,
        reason: `Cannot delete tenant. They have ${activeLeases} active/pending lease(s). Please terminate or complete these leases first.`,
        activeLeases
      };
    }

    // Safe to delete
    return {
      canDelete: true,
      reason: null,
      activeLeases: 0
    };
  } catch (error) {
    console.error('Error checking tenant delete safety:', error);
    throw error;
  }
};

/**
 * Cascade delete related records when a lease is deleted
 * @param {string} leaseId - Lease ID being deleted
 * @returns {Object} - {payments: number} - Count of deleted related records
 */
const cascadeDeleteLease = async (leaseId) => {
  try {
    // Delete all payments associated with this lease
    const paymentResult = await Payment.deleteMany({ lease: leaseId });

    return {
      payments: paymentResult.deletedCount
    };
  } catch (error) {
    console.error('Error cascade deleting lease records:', error);
    throw error;
  }
};

/**
 * Cascade delete related records when a property is deleted
 * (Only call this after confirming no active leases exist)
 * @param {string} propertyId - Property ID being deleted
 * @returns {Object} - {leases: number, payments: number}
 */
const cascadeDeleteProperty = async (propertyId) => {
  try {
    // Get all leases for this property (should only be expired/terminated)
    const leases = await Lease.find({ property: propertyId });

    let paymentsDeleted = 0;
    // Delete payments for each lease
    for (const lease of leases) {
      const result = await Payment.deleteMany({ lease: lease._id });
      paymentsDeleted += result.deletedCount;
    }

    // Delete all leases
    const leaseResult = await Lease.deleteMany({ property: propertyId });

    return {
      leases: leaseResult.deletedCount,
      payments: paymentsDeleted
    };
  } catch (error) {
    console.error('Error cascade deleting property records:', error);
    throw error;
  }
};

/**
 * Cascade delete related records when a tenant is deleted
 * (Only call this after confirming no active leases exist)
 * @param {string} tenantId - Tenant ID being deleted
 * @returns {Object} - {leases: number, payments: number}
 */
const cascadeDeleteTenant = async (tenantId) => {
  try {
    // Get all leases for this tenant (should only be expired/terminated)
    const leases = await Lease.find({ tenant: tenantId });

    let paymentsDeleted = 0;
    // Delete payments for each lease
    for (const lease of leases) {
      const result = await Payment.deleteMany({ lease: lease._id });
      paymentsDeleted += result.deletedCount;
    }

    // Delete all leases
    const leaseResult = await Lease.deleteMany({ tenant: tenantId });

    return {
      leases: leaseResult.deletedCount,
      payments: paymentsDeleted
    };
  } catch (error) {
    console.error('Error cascade deleting tenant records:', error);
    throw error;
  }
};

module.exports = {
  canDeleteProperty,
  canDeleteTenant,
  cascadeDeleteLease,
  cascadeDeleteProperty,
  cascadeDeleteTenant
};
