/**
 * Request Logger Middleware
 *
 * Logs incoming requests and outgoing responses with timing.
 * Replaces Morgan for more structured logging.
 */
const logger = require('../config/logger');

const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log incoming request
  logger.logRequest(req);

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.logResponse(req, res, duration);
  });

  next();
};

module.exports = requestLogger;
