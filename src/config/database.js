/**
 * Database configuration
 */
const env = process.env.NODE_ENV || 'development';

module.exports = {
  // MongoDB connection URI
  uri: process.env.MONGODB_URI || null,

  // Database name (extracted from URI or default)
  name: process.env.DB_NAME || 'home-system',

  // Use in-memory MongoDB for development when no URI provided
  useMemoryServer: !process.env.MONGODB_URI && env !== 'production',

  // Connection options
  options: {
    maxPoolSize: parseInt(process.env.DB_POOL_SIZE, 10) || 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  },
};
