/**
 * migrate-mongo configuration
 * https://github.com/seppevs/migrate-mongo
 */
require('dotenv').config();

const config = {
  mongodb: {
    // Connection URL for MongoDB
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017',

    // Database name
    databaseName: process.env.DB_NAME || 'home-system',

    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },

  // The migrations directory
  migrationsDir: 'src/migrations',

  // The mongodb collection where the applied changes are stored
  changelogCollectionName: 'changelog',

  // The file extension to use for migrations
  migrationFileExtension: '.js',

  // Enable use of file hash (crc32) in filename and target for up/down operation
  useFileHash: false,

  // Don't attempt to cast ObjectId to string
  moduleSystem: 'commonjs',
};

module.exports = config;
