/**
 * Tenants Seeder
 * Sample tenants for testing
 */
const Tenant = require('../models/Tenant');

const tenants = [
  {
    name: 'John Smith',
    phone: '+1-555-0101',
    email: 'john.smith@email.com',
    idPassport: 'US123456789',
    status: 'active',
    notes: 'Excellent tenant, always pays on time',
    emergencyContact: {
      name: 'Jane Smith',
      phone: '+1-555-0102',
      relationship: 'Spouse',
    },
  },
  {
    name: 'Maria Garcia',
    phone: '+1-555-0201',
    email: 'maria.garcia@email.com',
    idPassport: 'US987654321',
    status: 'active',
    notes: 'Graduate student, quiet and respectful',
    emergencyContact: {
      name: 'Carlos Garcia',
      phone: '+1-555-0202',
      relationship: 'Father',
    },
  },
  {
    name: 'Tech Solutions Inc.',
    phone: '+1-555-0301',
    email: 'contact@techsolutions.com',
    idPassport: 'EIN12-3456789',
    status: 'active',
    notes: 'Corporate tenant, signed 2-year lease',
    emergencyContact: {
      name: 'David Chen',
      phone: '+1-555-0302',
      relationship: 'CEO',
    },
  },
  {
    name: 'Sarah Johnson',
    phone: '+1-555-0401',
    email: 'sarah.j@email.com',
    idPassport: 'US456789123',
    status: 'inactive',
    notes: 'Previous tenant, moved out last month',
    emergencyContact: {
      name: 'Mike Johnson',
      phone: '+1-555-0402',
      relationship: 'Brother',
    },
  },
];

const seed = async () => {
  console.log('Seeding tenants...');
  const inserted = await Tenant.insertMany(tenants);
  console.log(`✅ Seeded ${inserted.length} tenants`);
  return inserted;
};

const clean = async () => {
  await Tenant.deleteMany({});
  console.log('✅ Cleaned tenants');
};

module.exports = { seed, clean, data: tenants };
