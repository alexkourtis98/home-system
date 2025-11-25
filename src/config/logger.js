/**
 * Logger configuration using Winston
 *
 * Features:
 * - Console logging with colors
 * - Daily rotating file logs
 * - Separate error log file
 * - JSON format for production
 * - Request/response logging
 */
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const env = process.env.NODE_ENV || 'development';
const logDir = process.env.LOG_DIR || 'logs';

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// JSON format for file logs
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define transports
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: consoleFormat,
    level: env === 'development' ? 'debug' : 'info',
  })
);

// File transports (only in non-test environments)
if (env !== 'test') {
  // All logs
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, '%DATE%-combined.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: fileFormat,
      level: 'info',
    })
  );

  // Error logs only
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, '%DATE%-error.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: fileFormat,
      level: 'error',
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: env === 'development' ? 'debug' : 'info',
  transports,
  exitOnError: false,
});

// Stream for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Helper methods for structured logging
logger.logRequest = (req, meta = {}) => {
  logger.info('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id,
    ...meta,
  });
};

logger.logResponse = (req, res, duration, meta = {}) => {
  const level = res.statusCode >= 400 ? 'warn' : 'info';
  logger[level]('Request completed', {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    userId: req.user?.id,
    ...meta,
  });
};

logger.logError = (error, req = null, meta = {}) => {
  const errorMeta = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...meta,
  };

  if (req) {
    errorMeta.method = req.method;
    errorMeta.url = req.originalUrl;
    errorMeta.userId = req.user?.id;
  }

  logger.error('Error occurred', errorMeta);
};

logger.logAuth = (action, userId, success, meta = {}) => {
  const level = success ? 'info' : 'warn';
  logger[level](`Auth: ${action}`, {
    userId,
    success,
    ...meta,
  });
};

logger.logDB = (operation, collection, duration, meta = {}) => {
  logger.debug(`DB: ${operation}`, {
    collection,
    duration: `${duration}ms`,
    ...meta,
  });
};

module.exports = logger;
