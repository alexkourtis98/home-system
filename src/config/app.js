/**
 * Application configuration
 */
module.exports = {
  name: 'HomeSystem',
  port: parseInt(process.env.PORT, 10) || 3000,

  // Request body limits
  bodyLimit: process.env.BODY_LIMIT || '10mb',

  // Static files directory (relative to project root)
  staticDir: 'dist',

  // Logging
  logFormat: process.env.LOG_FORMAT || 'combined',
};
