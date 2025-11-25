/**
 * Authentication configuration
 */
module.exports = {
  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET || 'home-system-secret-key-2024',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // Default admin account (for initial setup)
  defaultAdmin: {
    email: process.env.ADMIN_EMAIL || 'admin@home-system.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    name: process.env.ADMIN_NAME || 'System Admin',
  },

  // Password requirements
  password: {
    minLength: 6,
    saltRounds: 10,
  },

  // User roles and their hierarchy (higher number = more permissions)
  roles: {
    tenant: { level: 1, name: 'Tenant', description: 'Property tenant with limited access' },
    accountant: { level: 2, name: 'Accountant', description: 'Financial data access' },
    manager: { level: 3, name: 'Manager', description: 'Property management access' },
    landlord: { level: 4, name: 'Landlord', description: 'Property owner access' },
    admin: { level: 5, name: 'Admin', description: 'Full system access' },
  },
};
