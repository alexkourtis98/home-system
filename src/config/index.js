/**
 * Main configuration loader
 * Loads environment-specific configuration
 */
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';

const config = {
  env,
  isDevelopment: env === 'development',
  isProduction: env === 'production',
  isTest: env === 'test',

  // Application
  app: require('./app'),

  // Database
  database: require('./database'),

  // Security
  security: require('./security'),

  // Auth
  auth: require('./auth'),
};

module.exports = config;
