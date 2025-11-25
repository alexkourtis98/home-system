/**
 * Migration: Create users collection
 *
 * Creates the users collection with appropriate indexes
 * for the role-based access control system.
 */

module.exports = {
  async up(db, client) {
    // Create users collection with validation
    await db.createCollection('users', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['email', 'password', 'name', 'role', 'status'],
          properties: {
            email: {
              bsonType: 'string',
              pattern: '^\\w+([.-]?\\w+)*@\\w+([.-]?\\w+)*(\\.\\w{2,3})+$',
              description: 'must be a valid email address',
            },
            password: {
              bsonType: 'string',
              minLength: 6,
              description: 'must be at least 6 characters',
            },
            name: {
              bsonType: 'string',
              maxLength: 100,
              description: 'must be a string with max 100 characters',
            },
            role: {
              enum: ['tenant', 'accountant', 'manager', 'landlord', 'admin'],
              description: 'must be a valid role',
            },
            status: {
              enum: ['active', 'inactive', 'suspended'],
              description: 'must be a valid status',
            },
          },
        },
      },
    });

    // Create indexes
    const usersCollection = db.collection('users');

    // Unique index on email
    await usersCollection.createIndex({ email: 1 }, { unique: true, name: 'idx_email_unique' });

    // Index on role for filtering
    await usersCollection.createIndex({ role: 1 }, { name: 'idx_role' });

    // Index on status for filtering
    await usersCollection.createIndex({ status: 1 }, { name: 'idx_status' });

    // Compound index for role + status queries
    await usersCollection.createIndex({ role: 1, status: 1 }, { name: 'idx_role_status' });

    // Index on createdAt for sorting
    await usersCollection.createIndex({ createdAt: -1 }, { name: 'idx_createdAt' });

    console.log('✓ Users collection created with indexes');
  },

  async down(db, client) {
    await db.collection('users').drop();
    console.log('✓ Users collection dropped');
  },
};
