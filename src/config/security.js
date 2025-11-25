/**
 * Security configuration
 */
const env = process.env.NODE_ENV || 'development';

module.exports = {
  // CORS settings
  cors: {
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : [
          'http://localhost:3000',
          'http://localhost:5000',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5000',
        ],
    credentials: true,
    optionsSuccessStatus: 200,
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || (env === 'production' ? 100 : 1000),
    message: 'Too many requests from this IP, please try again later.',
  },

  // Helmet CSP settings
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-eval needed for ApexCharts
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  },
};
