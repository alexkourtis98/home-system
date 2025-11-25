const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
const { sanitizeMiddleware } = require('./utils/sanitizer');
require('dotenv').config();

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

    // Allowed origins based on environment
    const allowedOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : [
          'http://localhost:5000',
          'http://localhost:43217',
          'http://127.0.0.1:5000',
          'http://127.0.0.1:43217'
        ];

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Note: unsafe-eval needed for ApexCharts
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(cors(corsOptions));

// Sanitize data to prevent NoSQL injection
app.use(mongoSanitize());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// XSS protection - sanitize user input
app.use(sanitizeMiddleware);

// Logging middleware
app.use(morgan('combined'));

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Rate limiting for API routes only (not static files)
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (process.env.NODE_ENV === 'production' ? 100 : 1000), // Higher limit in development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// API Routes (with rate limiting)
app.use('/api/auth', apiLimiter, require('./routes/auth'));
app.use('/api/properties', apiLimiter, require('./routes/properties'));
app.use('/api/tenants', apiLimiter, require('./routes/tenants'));
app.use('/api/leases', apiLimiter, require('./routes/leases'));
app.use('/api/payments', apiLimiter, require('./routes/payments'));
app.use('/api/dashboard', apiLimiter, require('./routes/dashboard'));

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
    let mongoURI = process.env.MONGODB_URI;

    // If no MongoDB URI is provided, use MongoDB Memory Server for development (if available)
    if (!mongoURI) {
      if (MongoMemoryServer) {
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

    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
    console.log(`Database: ${mongoURI.includes('memory') ? 'In-Memory (Development)' : 'External MongoDB'}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 3000;
const { initializeAuth } = require('./middleware/auth');

// Initialize application
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Initialize authentication system
    await initializeAuth();

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`🏠 Home System Server running on port ${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
      console.log(`🔐 Authentication: Ready`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app; 