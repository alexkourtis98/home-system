/**
 * Migration: Add indexes to existing collections
 *
 * Adds performance indexes to properties, tenants, leases, and payments collections.
 */

module.exports = {
  async up(db, client) {
    // Properties indexes
    const propertiesCollection = db.collection('properties');
    await propertiesCollection.createIndex({ status: 1 }, { name: 'idx_status' });
    await propertiesCollection.createIndex({ createdAt: -1 }, { name: 'idx_createdAt' });
    console.log('✓ Properties indexes created');

    // Tenants indexes
    const tenantsCollection = db.collection('tenants');
    await tenantsCollection.createIndex({ email: 1 }, { unique: true, sparse: true, name: 'idx_email_unique' });
    await tenantsCollection.createIndex({ status: 1 }, { name: 'idx_status' });
    await tenantsCollection.createIndex({ phone: 1 }, { name: 'idx_phone' });
    await tenantsCollection.createIndex({ createdAt: -1 }, { name: 'idx_createdAt' });
    console.log('✓ Tenants indexes created');

    // Leases indexes
    const leasesCollection = db.collection('leases');
    await leasesCollection.createIndex({ property: 1 }, { name: 'idx_property' });
    await leasesCollection.createIndex({ tenant: 1 }, { name: 'idx_tenant' });
    await leasesCollection.createIndex({ status: 1 }, { name: 'idx_status' });
    await leasesCollection.createIndex({ startDate: 1 }, { name: 'idx_startDate' });
    await leasesCollection.createIndex({ endDate: 1 }, { name: 'idx_endDate' });
    await leasesCollection.createIndex(
      { property: 1, status: 1, startDate: 1, endDate: 1 },
      { name: 'idx_property_status_dates' }
    );
    console.log('✓ Leases indexes created');

    // Payments indexes
    const paymentsCollection = db.collection('payments');
    await paymentsCollection.createIndex({ lease: 1 }, { name: 'idx_lease' });
    await paymentsCollection.createIndex({ status: 1 }, { name: 'idx_status' });
    await paymentsCollection.createIndex({ dueDate: 1 }, { name: 'idx_dueDate' });
    await paymentsCollection.createIndex({ paymentDate: 1 }, { name: 'idx_paymentDate' });
    await paymentsCollection.createIndex({ lease: 1, status: 1 }, { name: 'idx_lease_status' });
    await paymentsCollection.createIndex({ dueDate: 1, status: 1 }, { name: 'idx_dueDate_status' });
    console.log('✓ Payments indexes created');
  },

  async down(db, client) {
    // Drop properties indexes
    const propertiesCollection = db.collection('properties');
    await propertiesCollection.dropIndex('idx_status').catch(() => {});
    await propertiesCollection.dropIndex('idx_createdAt').catch(() => {});

    // Drop tenants indexes
    const tenantsCollection = db.collection('tenants');
    await tenantsCollection.dropIndex('idx_email_unique').catch(() => {});
    await tenantsCollection.dropIndex('idx_status').catch(() => {});
    await tenantsCollection.dropIndex('idx_phone').catch(() => {});
    await tenantsCollection.dropIndex('idx_createdAt').catch(() => {});

    // Drop leases indexes
    const leasesCollection = db.collection('leases');
    await leasesCollection.dropIndex('idx_property').catch(() => {});
    await leasesCollection.dropIndex('idx_tenant').catch(() => {});
    await leasesCollection.dropIndex('idx_status').catch(() => {});
    await leasesCollection.dropIndex('idx_startDate').catch(() => {});
    await leasesCollection.dropIndex('idx_endDate').catch(() => {});
    await leasesCollection.dropIndex('idx_property_status_dates').catch(() => {});

    // Drop payments indexes
    const paymentsCollection = db.collection('payments');
    await paymentsCollection.dropIndex('idx_lease').catch(() => {});
    await paymentsCollection.dropIndex('idx_status').catch(() => {});
    await paymentsCollection.dropIndex('idx_dueDate').catch(() => {});
    await paymentsCollection.dropIndex('idx_paymentDate').catch(() => {});
    await paymentsCollection.dropIndex('idx_lease_status').catch(() => {});
    await paymentsCollection.dropIndex('idx_dueDate_status').catch(() => {});

    console.log('✓ All collection indexes dropped');
  },
};
