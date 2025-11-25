/**
 * Database Seeder
 * Populates the database with sample data for testing and demo purposes
 */

const mongoose = require('mongoose');
const Property = require('../models/Property');
const Tenant = require('../models/Tenant');
const Lease = require('../models/Lease');
const Payment = require('../models/Payment');

// Sample data
const properties = [
  {
    title: 'Luxury Apartment Downtown',
    address: '123 Main Street, Apt 4B, New York, NY 10001',
    size: 1200,
    type: 'apartment',
    status: 'occupied',
    monthlyRent: 2500,
    notes: 'Modern apartment with city views, renovated kitchen'
  },
  {
    title: 'Cozy Studio Near University',
    address: '456 College Ave, Boston, MA 02115',
    size: 500,
    type: 'studio',
    status: 'occupied',
    monthlyRent: 1200,
    notes: 'Perfect for students, close to campus'
  },
  {
    title: 'Family House with Garden',
    address: '789 Oak Lane, Portland, OR 97202',
    size: 2000,
    type: 'house',
    status: 'available',
    monthlyRent: 3200,
    notes: '3 bedroom, 2 bath, large backyard'
  },
  {
    title: 'Commercial Office Space',
    address: '321 Business Blvd, Suite 200, Seattle, WA 98101',
    size: 1500,
    type: 'commercial',
    status: 'occupied',
    monthlyRent: 4500,
    notes: 'Prime location, high-speed internet included'
  },
  {
    title: 'Modern Loft Downtown',
    address: '555 Industrial Way, Chicago, IL 60601',
    size: 900,
    type: 'apartment',
    status: 'maintenance',
    monthlyRent: 1800,
    notes: 'Currently under renovation, available next month'
  }
];

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
      relationship: 'Spouse'
    }
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
      relationship: 'Father'
    }
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
      relationship: 'CEO'
    }
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
      relationship: 'Brother'
    }
  }
];

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    console.log('Clearing existing data...');
    await Property.deleteMany({});
    await Tenant.deleteMany({});
    await Lease.deleteMany({});
    await Payment.deleteMany({});

    // Insert properties
    console.log('Inserting properties...');
    const insertedProperties = await Property.insertMany(properties);
    console.log(`✅ Inserted ${insertedProperties.length} properties`);

    // Insert tenants
    console.log('Inserting tenants...');
    const insertedTenants = await Tenant.insertMany(tenants);
    console.log(`✅ Inserted ${insertedTenants.length} tenants`);

    // Create leases
    console.log('Creating leases...');
    const leases = [
      {
        property: insertedProperties[0]._id,
        tenant: insertedTenants[0]._id,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-12-31'),
        monthlyRent: 2500,
        deposit: 5000,
        status: 'active',
        utilities: {
          electricity: true,
          water: true,
          gas: false,
          internet: true
        },
        notes: 'Two-year lease agreement'
      },
      {
        property: insertedProperties[1]._id,
        tenant: insertedTenants[1]._id,
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-05-31'),
        monthlyRent: 1200,
        deposit: 1200,
        status: 'active',
        utilities: {
          electricity: false,
          water: true,
          gas: false,
          internet: false
        },
        notes: 'Academic year lease'
      },
      {
        property: insertedProperties[3]._id,
        tenant: insertedTenants[2]._id,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2026-02-28'),
        monthlyRent: 4500,
        deposit: 9000,
        status: 'active',
        utilities: {
          electricity: true,
          water: true,
          gas: true,
          internet: true
        },
        notes: 'Commercial lease with renewal option'
      }
    ];

    const insertedLeases = await Lease.insertMany(leases);
    console.log(`✅ Inserted ${insertedLeases.length} leases`);

    // Create payments
    console.log('Creating payments...');
    const payments = [];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Generate payments for the past 6 months
    for (let i = 5; i >= 0; i--) {
      let paymentMonth = currentMonth - i;
      let paymentYear = currentYear;

      if (paymentMonth <= 0) {
        paymentMonth += 12;
        paymentYear -= 1;
      }

      // John Smith's payments (always pays early)
      const johnDueDate = new Date(paymentYear, paymentMonth - 1, 1);
      const johnPaidDate = new Date(paymentYear, paymentMonth - 1, -2); // 3 days before due
      payments.push({
        lease: insertedLeases[0]._id,
        property: insertedProperties[0]._id,
        tenant: insertedTenants[0]._id,
        amount: 2500,
        dueDate: johnDueDate,
        paidDate: johnPaidDate,
        status: 'paid',
        paymentMethod: 'bank_transfer',
        month: paymentMonth,
        year: paymentYear
      });

      // Maria's payments (pays on time)
      if (paymentMonth >= 9 || paymentYear > 2024) {
        const mariaDueDate = new Date(paymentYear, paymentMonth - 1, 1);
        const mariaPaidDate = new Date(paymentYear, paymentMonth - 1, 1);
        payments.push({
          lease: insertedLeases[1]._id,
          property: insertedProperties[1]._id,
          tenant: insertedTenants[1]._id,
          amount: 1200,
          dueDate: mariaDueDate,
          paidDate: mariaPaidDate,
          status: 'paid',
          paymentMethod: 'online',
          month: paymentMonth,
          year: paymentYear
        });
      }

      // Tech Solutions payments (sometimes late)
      const techDueDate = new Date(paymentYear, paymentMonth - 1, 1);
      const isLate = i === 1; // Make one payment late
      const techPaidDate = isLate ? new Date(paymentYear, paymentMonth - 1, 8) : new Date(paymentYear, paymentMonth - 1, 2);
      payments.push({
        lease: insertedLeases[2]._id,
        property: insertedProperties[3]._id,
        tenant: insertedTenants[2]._id,
        amount: 4500,
        dueDate: techDueDate,
        paidDate: isLate ? techPaidDate : techPaidDate,
        status: 'paid',
        paymentMethod: 'check',
        month: paymentMonth,
        year: paymentYear,
        lateFee: isLate ? 150 : 0
      });
    }

    // Add current month payments (some pending, some overdue)
    payments.push({
      lease: insertedLeases[0]._id,
      property: insertedProperties[0]._id,
      tenant: insertedTenants[0]._id,
      amount: 2500,
      dueDate: new Date(currentYear, currentMonth - 1, 1),
      status: 'paid',
      paidDate: new Date(currentYear, currentMonth - 1, -1),
      paymentMethod: 'bank_transfer',
      month: currentMonth,
      year: currentYear
    });

    payments.push({
      lease: insertedLeases[1]._id,
      property: insertedProperties[1]._id,
      tenant: insertedTenants[1]._id,
      amount: 1200,
      dueDate: new Date(currentYear, currentMonth - 1, 1),
      status: 'pending',
      paymentMethod: 'online',
      month: currentMonth,
      year: currentYear
    });

    payments.push({
      lease: insertedLeases[2]._id,
      property: insertedProperties[3]._id,
      tenant: insertedTenants[2]._id,
      amount: 4500,
      dueDate: new Date(currentYear, currentMonth - 2, 1), // Last month - overdue
      status: 'overdue',
      paymentMethod: 'check',
      month: currentMonth - 1 || 12,
      year: currentMonth === 1 ? currentYear - 1 : currentYear,
      lateFee: 200
    });

    const insertedPayments = await Payment.insertMany(payments);
    console.log(`✅ Inserted ${insertedPayments.length} payments`);

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Properties: ${insertedProperties.length}`);
    console.log(`   Tenants: ${insertedTenants.length}`);
    console.log(`   Leases: ${insertedLeases.length}`);
    console.log(`   Payments: ${insertedPayments.length}`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

// Run seeder if called directly
if (require.main === module) {
  const connectDB = async () => {
    try {
      const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/home-system';
      await mongoose.connect(mongoURI);
      console.log('Connected to MongoDB');

      await seedDatabase();

      await mongoose.connection.close();
      console.log('\n👋 Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('Connection error:', error);
      process.exit(1);
    }
  };

  connectDB();
}

module.exports = { seedDatabase };
