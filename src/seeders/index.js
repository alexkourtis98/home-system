/**
 * Database Seeder - Main Runner
 *
 * Usage:
 *   npm run seed          - Seed all data
 *   npm run seed:clean    - Clean and reseed all data
 *   node src/seeders/index.js --only=users,properties
 *   node src/seeders/index.js --clean
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');

// Import seeders
const usersSeeder = require('./users.seeder');
const propertiesSeeder = require('./properties.seeder');
const tenantsSeeder = require('./tenants.seeder');

// Seeder registry
const seeders = {
  users: usersSeeder,
  properties: propertiesSeeder,
  tenants: tenantsSeeder,
  // leases and payments depend on properties and tenants existing
};

// Parse command line arguments
const args = process.argv.slice(2);
const isClean = args.includes('--clean');
const onlyArg = args.find((arg) => arg.startsWith('--only='));
const onlySeeders = onlyArg ? onlyArg.split('=')[1].split(',') : null;

const runSeeders = async () => {
  console.log('🌱 Starting database seeding...\n');

  const seederNames = onlySeeders || Object.keys(seeders);
  const results = {};

  // If clean mode, clean in reverse order
  if (isClean) {
    console.log('🧹 Cleaning existing data...\n');
    const reverseNames = [...seederNames].reverse();
    for (const name of reverseNames) {
      if (seeders[name]) {
        await seeders[name].clean();
      }
    }
    console.log('');
  }

  // Run seeders
  for (const name of seederNames) {
    if (seeders[name]) {
      results[name] = await seeders[name].seed();
    } else {
      console.warn(`⚠️  Unknown seeder: ${name}`);
    }
  }

  // Create leases and payments if properties and tenants were seeded
  if (
    (seederNames.includes('properties') || seederNames.includes('tenants')) &&
    !onlySeeders
  ) {
    await createLeasesAndPayments(results.properties, results.tenants);
  }

  console.log('\n✅ Database seeding completed!');
  console.log('\n📊 Summary:');
  for (const [name, count] of Object.entries(results)) {
    if (Array.isArray(count)) {
      console.log(`   ${name}: ${count.length}`);
    } else {
      console.log(`   ${name}: ${count}`);
    }
  }
};

// Create leases and payments (dependent on properties and tenants)
const createLeasesAndPayments = async (properties, tenants) => {
  const Lease = require('../models/Lease');
  const Payment = require('../models/Payment');

  if (isClean) {
    await Payment.deleteMany({});
    await Lease.deleteMany({});
  }

  if (!properties || !tenants || properties.length < 4 || tenants.length < 3) {
    console.log('⚠️  Skipping leases/payments (need properties and tenants)');
    return;
  }

  console.log('Seeding leases...');
  const leases = [
    {
      property: properties[0]._id,
      tenant: tenants[0]._id,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-12-31'),
      monthlyRent: 2500,
      deposit: 5000,
      status: 'active',
      utilities: { electricity: true, water: true, gas: false, internet: true },
      notes: 'Two-year lease agreement',
    },
    {
      property: properties[1]._id,
      tenant: tenants[1]._id,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-05-31'),
      monthlyRent: 1200,
      deposit: 1200,
      status: 'active',
      utilities: { electricity: false, water: true, gas: false, internet: false },
      notes: 'Academic year lease',
    },
    {
      property: properties[3]._id,
      tenant: tenants[2]._id,
      startDate: new Date('2024-03-01'),
      endDate: new Date('2026-02-28'),
      monthlyRent: 4500,
      deposit: 9000,
      status: 'active',
      utilities: { electricity: true, water: true, gas: true, internet: true },
      notes: 'Commercial lease with renewal option',
    },
  ];

  const insertedLeases = await Lease.insertMany(leases);
  console.log(`✅ Seeded ${insertedLeases.length} leases`);

  // Generate payments
  console.log('Seeding payments...');
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
    payments.push({
      lease: insertedLeases[0]._id,
      property: properties[0]._id,
      tenant: tenants[0]._id,
      amount: 2500,
      dueDate: new Date(paymentYear, paymentMonth - 1, 1),
      paidDate: new Date(paymentYear, paymentMonth - 1, -2),
      status: 'paid',
      paymentMethod: 'bank_transfer',
      month: paymentMonth,
      year: paymentYear,
    });

    // Maria's payments
    if (paymentMonth >= 9 || paymentYear > 2024) {
      payments.push({
        lease: insertedLeases[1]._id,
        property: properties[1]._id,
        tenant: tenants[1]._id,
        amount: 1200,
        dueDate: new Date(paymentYear, paymentMonth - 1, 1),
        paidDate: new Date(paymentYear, paymentMonth - 1, 1),
        status: 'paid',
        paymentMethod: 'online',
        month: paymentMonth,
        year: paymentYear,
      });
    }

    // Tech Solutions payments
    const isLate = i === 1;
    payments.push({
      lease: insertedLeases[2]._id,
      property: properties[3]._id,
      tenant: tenants[2]._id,
      amount: 4500,
      dueDate: new Date(paymentYear, paymentMonth - 1, 1),
      paidDate: isLate
        ? new Date(paymentYear, paymentMonth - 1, 8)
        : new Date(paymentYear, paymentMonth - 1, 2),
      status: 'paid',
      paymentMethod: 'check',
      month: paymentMonth,
      year: paymentYear,
      lateFee: isLate ? 150 : 0,
    });
  }

  // Add current month payments
  payments.push({
    lease: insertedLeases[0]._id,
    property: properties[0]._id,
    tenant: tenants[0]._id,
    amount: 2500,
    dueDate: new Date(currentYear, currentMonth - 1, 1),
    status: 'paid',
    paidDate: new Date(currentYear, currentMonth - 1, -1),
    paymentMethod: 'bank_transfer',
    month: currentMonth,
    year: currentYear,
  });

  payments.push({
    lease: insertedLeases[1]._id,
    property: properties[1]._id,
    tenant: tenants[1]._id,
    amount: 1200,
    dueDate: new Date(currentYear, currentMonth - 1, 1),
    status: 'pending',
    paymentMethod: 'online',
    month: currentMonth,
    year: currentYear,
  });

  payments.push({
    lease: insertedLeases[2]._id,
    property: properties[3]._id,
    tenant: tenants[2]._id,
    amount: 4500,
    dueDate: new Date(currentYear, currentMonth - 2, 1),
    status: 'overdue',
    paymentMethod: 'check',
    month: currentMonth - 1 || 12,
    year: currentMonth === 1 ? currentYear - 1 : currentYear,
    lateFee: 200,
  });

  const insertedPayments = await Payment.insertMany(payments);
  console.log(`✅ Seeded ${insertedPayments.length} payments`);
};

// Main execution
const main = async () => {
  try {
    const mongoURI = config.database.uri || 'mongodb://localhost:27017/home-system';
    console.log(`Connecting to MongoDB: ${mongoURI.replace(/\/\/.*@/, '//*****@')}`);

    await mongoose.connect(mongoURI, config.database.options);
    console.log('Connected to MongoDB\n');

    await runSeeders();

    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runSeeders, seeders };
