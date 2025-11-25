/**
 * Users Seeder
 * Sample users for testing role-based access
 */
const User = require('../models/User');

const users = [
  {
    email: 'landlord@example.com',
    password: 'landlord123',
    name: 'James Property Owner',
    phone: '+1-555-1001',
    role: 'landlord',
    status: 'active',
  },
  {
    email: 'manager@example.com',
    password: 'manager123',
    name: 'Sarah Manager',
    phone: '+1-555-1002',
    role: 'manager',
    status: 'active',
  },
  {
    email: 'accountant@example.com',
    password: 'accountant123',
    name: 'Mike Finance',
    phone: '+1-555-1003',
    role: 'accountant',
    status: 'active',
  },
  {
    email: 'tenant1@example.com',
    password: 'tenant123',
    name: 'John Tenant',
    phone: '+1-555-2001',
    role: 'tenant',
    status: 'active',
  },
  {
    email: 'tenant2@example.com',
    password: 'tenant123',
    name: 'Jane Resident',
    phone: '+1-555-2002',
    role: 'tenant',
    status: 'active',
  },
];

const seed = async () => {
  console.log('Seeding users...');

  for (const userData of users) {
    const existingUser = await User.findOne({ email: userData.email });
    if (!existingUser) {
      await User.create(userData);
    }
  }

  console.log(`✅ Seeded ${users.length} users`);
  return users.length;
};

const clean = async () => {
  // Don't delete admin user
  await User.deleteMany({ role: { $ne: 'admin' } });
  console.log('✅ Cleaned users (except admin)');
};

module.exports = { seed, clean, data: users };
