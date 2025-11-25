/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Provides middleware functions for checking user roles and permissions.
 * Uses hierarchical role levels defined in config.
 */

const config = require('../config');

/**
 * Check if user has one of the allowed roles
 * @param {...string} allowedRoles - Roles that are allowed access
 * @returns {Function} Express middleware
 */
const hasRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        required: allowedRoles,
        current: userRole,
      });
    }

    next();
  };
};

/**
 * Check if user has minimum role level (hierarchical check)
 * Higher level roles automatically have access to lower level resources
 * @param {string} minRole - Minimum role required
 * @returns {Function} Express middleware
 */
const hasMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userRole = req.user.role;
    const userLevel = config.auth.roles[userRole]?.level || 0;
    const requiredLevel = config.auth.roles[minRole]?.level || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient role level.',
        required: minRole,
        current: userRole,
      });
    }

    next();
  };
};

/**
 * Admin only access
 */
const isAdmin = hasRole('admin');

/**
 * Landlord or higher access
 */
const isLandlordOrAbove = hasMinRole('landlord');

/**
 * Manager or higher access
 */
const isManagerOrAbove = hasMinRole('manager');

/**
 * Accountant or higher access (can view financial data)
 */
const isAccountantOrAbove = hasMinRole('accountant');

/**
 * Check if user owns the resource or has admin access
 * @param {Function} getOwnerId - Function to extract owner ID from request (req) => ownerId
 * @returns {Function} Express middleware
 */
const isOwnerOrAdmin = (getOwnerId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Admins always have access
    if (req.user.role === 'admin') {
      return next();
    }

    try {
      const ownerId = await getOwnerId(req);

      if (!ownerId) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found',
        });
      }

      if (ownerId.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not own this resource.',
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking resource ownership',
      });
    }
  };
};

/**
 * Check if user can access property (owns it or is assigned to it)
 * @param {Function} getPropertyId - Function to extract property ID from request
 * @returns {Function} Express middleware
 */
const canAccessProperty = (getPropertyId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Admins always have access
    if (req.user.role === 'admin') {
      return next();
    }

    try {
      const propertyId = await getPropertyId(req);

      if (!propertyId) {
        return res.status(404).json({
          success: false,
          message: 'Property not found',
        });
      }

      // Landlords can access their own properties
      if (req.user.role === 'landlord' && req.user.properties) {
        const hasAccess = req.user.properties.some(
          (p) => p.toString() === propertyId.toString()
        );
        if (hasAccess) return next();
      }

      // Managers and accountants can access all properties
      if (['manager', 'accountant'].includes(req.user.role)) {
        return next();
      }

      // Tenants can only access properties they're renting
      if (req.user.role === 'tenant' && req.user.propertyId) {
        if (req.user.propertyId.toString() === propertyId.toString()) {
          return next();
        }
      }

      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have access to this property.',
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking property access',
      });
    }
  };
};

/**
 * Role-specific permissions matrix
 * Defines what each role can do
 */
const permissions = {
  // Properties
  'properties:read': ['tenant', 'accountant', 'manager', 'landlord', 'admin'],
  'properties:create': ['manager', 'landlord', 'admin'],
  'properties:update': ['manager', 'landlord', 'admin'],
  'properties:delete': ['landlord', 'admin'],

  // Tenants
  'tenants:read': ['accountant', 'manager', 'landlord', 'admin'],
  'tenants:create': ['manager', 'landlord', 'admin'],
  'tenants:update': ['manager', 'landlord', 'admin'],
  'tenants:delete': ['landlord', 'admin'],

  // Leases
  'leases:read': ['tenant', 'accountant', 'manager', 'landlord', 'admin'],
  'leases:create': ['manager', 'landlord', 'admin'],
  'leases:update': ['manager', 'landlord', 'admin'],
  'leases:delete': ['landlord', 'admin'],

  // Payments
  'payments:read': ['tenant', 'accountant', 'manager', 'landlord', 'admin'],
  'payments:create': ['accountant', 'manager', 'landlord', 'admin'],
  'payments:update': ['accountant', 'manager', 'landlord', 'admin'],
  'payments:delete': ['admin'],

  // Users
  'users:read': ['manager', 'landlord', 'admin'],
  'users:create': ['admin'],
  'users:update': ['admin'],
  'users:delete': ['admin'],

  // Dashboard
  'dashboard:read': ['accountant', 'manager', 'landlord', 'admin'],
  'dashboard:full': ['landlord', 'admin'],

  // Reports
  'reports:read': ['accountant', 'manager', 'landlord', 'admin'],
  'reports:export': ['accountant', 'manager', 'landlord', 'admin'],
};

/**
 * Check if user has specific permission
 * @param {string} permission - Permission to check (e.g., 'properties:create')
 * @returns {Function} Express middleware
 */
const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const allowedRoles = permissions[permission];

    if (!allowedRoles) {
      console.warn(`Unknown permission: ${permission}`);
      return res.status(500).json({
        success: false,
        message: 'Invalid permission configuration',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Missing permission: ${permission}`,
      });
    }

    next();
  };
};

module.exports = {
  hasRole,
  hasMinRole,
  hasPermission,
  isAdmin,
  isLandlordOrAbove,
  isManagerOrAbove,
  isAccountantOrAbove,
  isOwnerOrAdmin,
  canAccessProperty,
  permissions,
};
