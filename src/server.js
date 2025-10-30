const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const { initializeDatabase } = require('./config/database');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const audit = require('./middleware/audit');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Hide implementation details
app.disable('x-powered-by');

// Helper: parse comma-separated CORS origins from env
const parseOrigins = (value) => {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const allowedOrigins = parseOrigins(process.env.CORS_ORIGIN) || (isProd ? [] : ['http://localhost:5173', 'https://campusconnecting.netlify.app/']);

// Build a flexible CORS origin matcher supporting wildcards like *.netlify.app
const isOriginAllowed = (origin) => {
  if (!origin) return true; // same-origin or non-browser request
  if (!allowedOrigins || allowedOrigins.length === 0) return false;
  if (allowedOrigins.includes(origin)) return true;
  // Support entries like *.netlify.app
  for (const entry of allowedOrigins) {
    if (entry.startsWith('*.')) {
      const suffix = entry.slice(1); // remove leading '*'
      if (origin.endsWith(suffix)) return true;
    }
  }
  return false;
};

// CORS configuration (must be early)
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Serve static files FIRST (before helmet) with CORS headers
// This allows images to be served without CORS/Helmet restrictions
const path = require('path');
const staticMiddleware = express.static(path.join(__dirname, '../uploads'));
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for static files
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else if (!isProd) {
    // In development, allow all for convenience
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  // Cache control for images
  if (req.path.match(/\.(jpg|jpeg|png|gif|webp|mp4)$/i)) {
    res.header('Cache-Control', 'public, max-age=31536000');
  }
  
  next();
}, staticMiddleware);

// Security middleware - configure helmet to allow images from cross-origin
// Applied AFTER static files so they don't get blocked
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:', ...allowedOrigins, 'https:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: isProd ? ["'self'"] : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", ...allowedOrigins]
    }
  }
}));

// Trust proxy settings for accurate IP detection (especially when behind reverse proxy)
// This allows req.ip to work correctly
if (process.env.TRUST_PROXY === 'true' || isProd) {
  app.set('trust proxy', true);
} else {
  // In development, trust proxy for localhost testing
  app.set('trust proxy', 1); // Trust first proxy
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Add request start time for performance tracking
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// API routes with audit logging (except health checks and static files)
app.use('/api', audit({ 
  skip: (req) => {
    // Skip logging for health checks and static files
    return req.path === '/health' || req.path.startsWith('/uploads');
  }
}), routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the API',
    version: '1.0.0'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Initialize database connection and sync models
    await initializeDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;
