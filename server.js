const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');

// Load configuration
const config = require('./src/config');
const { sanitizeMiddleware } = require('./src/utils/sanitizer');

// MongoDB Memory Server - optional (dev dependency)
let MongoMemoryServer;
try {
  MongoMemoryServer = require('mongodb-memory-server').MongoMemoryServer;
} catch (e) {
  // Not available in production builds
  MongoMemoryServer = null;
}

const app = express();

// CORS Configuration - environment-aware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (config.security.cors.origins.indexOf(origin) !== -1 || config.isDevelopment) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: config.security.cors.credentials,
  optionsSuccessStatus: config.security.cors.optionsSuccessStatus,
};

// Security middleware
app.use(helmet(config.security.helmet));
app.use(cors(corsOptions));

// Sanitize data to prevent NoSQL injection
app.use(mongoSanitize());

// Body parsing middleware
app.use(express.json({ limit: config.app.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.app.bodyLimit }));

// XSS protection - sanitize user input
app.use(sanitizeMiddleware);

// Logging middleware
app.use(morgan(config.app.logFormat));

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, config.app.staticDir)));

// Rate limiting for API routes only (not static files)
const apiLimiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.maxRequests,
  message: config.security.rateLimit.message,
  standardHeaders: true,
  legacyHeaders: false,
});

// API Routes (with rate limiting)
app.use('/api/auth', apiLimiter, require('./src/routes/auth'));
app.use('/api/users', apiLimiter, require('./src/routes/users'));
app.use('/api/properties', apiLimiter, require('./src/routes/properties'));
app.use('/api/tenants', apiLimiter, require('./src/routes/tenants'));
app.use('/api/leases', apiLimiter, require('./src/routes/leases'));
app.use('/api/payments', apiLimiter, require('./src/routes/payments'));
app.use('/api/dashboard', apiLimiter, require('./src/routes/dashboard'));

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/pages/login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/dashboard/index.html'));
});

app.get('/properties', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/pages/properties.html'));
});

app.get('/tenants', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/pages/tenants.html'));
});

app.get('/leases', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/pages/leases.html'));
});

app.get('/payments', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/pages/payments.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Database connection
const connectDB = async () => {
  try {
    let mongoURI = config.database.uri;

    // If no MongoDB URI is provided, use MongoDB Memory Server for development (if available)
    if (!mongoURI) {
      if (MongoMemoryServer && config.database.useMemoryServer) {
        console.log('No MONGODB_URI found, starting MongoDB Memory Server...');
        const mongod = await MongoMemoryServer.create();
        mongoURI = mongod.getUri();
        console.log('MongoDB Memory Server started successfully');
      } else {
        console.error('No MONGODB_URI provided and MongoDB Memory Server not available');
        console.error('Please set MONGODB_URI environment variable');
        process.exit(1);
      }
    }

    await mongoose.connect(mongoURI, config.database.options);
    console.log('MongoDB connected successfully');
    console.log(`Database: ${mongoURI.includes('memory') ? 'In-Memory (Development)' : 'External MongoDB'}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const { initializeAuth } = require('./src/middleware/auth');

// Initialize application
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Initialize authentication system
    await initializeAuth();

    // Start HTTP server
    app.listen(config.app.port, () => {
      console.log(`🏠 ${config.app.name} Server running on port ${config.app.port}`);
      console.log(`📊 Dashboard: http://localhost:${config.app.port}/dashboard`);
      console.log(`🔐 Authentication: Ready`);
      console.log(`🌍 Environment: ${config.env}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
