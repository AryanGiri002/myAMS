import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorMiddleware.js';
import { generalLimiter } from './middleware/rateLimitMiddleware.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

/**
 * ============================================================================
 * UNIVERSITY ATTENDANCE MANAGEMENT SYSTEM - APPLICATION CONFIGURATION
 * ============================================================================
 * 
 * This file configures the Express application with:
 * - Security middleware (helmet, CORS, mongo-sanitize, rate limiting)
 * - Request parsing middleware (JSON, URL-encoded, cookies)
 * - API routes (auth, students, teachers, admin)
 * - Error handling middleware
 * 
 * The configured app is exported and used by server.js to start the server.
 * ============================================================================
 */

// ============================================================================
// INITIALIZE EXPRESS APP
// ============================================================================

const app = express();

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

/**
 * Helmet - Sets various HTTP headers for security
 * Protects against XSS, clickjacking, and other vulnerabilities
 */
app.use(helmet());

/**
 * CORS - Cross-Origin Resource Sharing
 * Allows frontend to make requests to this backend
 */
app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // From .env
    credentials: true,   // Allow cookies (for refresh tokens)
  })
);


// ============================================================================
// REQUEST PARSING MIDDLEWARE
// ============================================================================

/**
 * Express JSON Parser
 * Parses incoming JSON payloads
 */
app.use(express.json({ limit: '10kb' }));

/**
 * Express URL-Encoded Parser
 * Parses URL-encoded data (form submissions)
 */
app.use(express.urlencoded({ extended: true, limit: '30kb' }));

/**
 * Cookie Parser
 * Parses cookies from request headers (needed for refresh tokens)
 */
app.use(cookieParser());

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Rate Limiter - Prevents brute force and DDoS attacks
 * Default: 100 requests per 15 minutes per IP
 */
app.use(generalLimiter);

// ============================================================================
// LOGGING MIDDLEWARE (Development)
// ============================================================================

/**
 * Request Logger (Development only)
 * Logs all incoming requests
 */
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// ============================================================================
// HEALTH CHECK ROUTE
// ============================================================================

/**
 * Health Check Endpoint
 * Used to verify server is running
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * API Info Endpoint
 * Provides basic API information
 */
app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'University Attendance Management System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      students: '/api/students',
      teachers: '/api/teachers',
      admin: '/api/admin',
    },
    documentation: 'See README.md for API documentation',
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * Mount API Routes
 * 
 * Route Structure:
 * - /api/auth/*      - Authentication routes (5 routes)
 * - /api/students/*  - Student routes (2 routes)
 * - /api/teachers/*  - Teacher routes (5 routes)
 * - /api/admin/*     - Admin routes (20 routes)
 * 
 * Total: 32 API endpoints
 */
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/admin', adminRoutes);

// ============================================================================
// 404 HANDLER - Route Not Found
// ============================================================================

/**
 * 404 Not Found Handler
 * Catches all requests to undefined routes
 * Must be placed AFTER all valid routes
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Route ${req.originalUrl} not found`,
    error: 'Not Found',
  });
});

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================

/**
 * Global Error Handler Middleware
 * Catches all errors from routes and middleware
 * Must be placed LAST in middleware chain
 */
app.use(errorHandler);

// ============================================================================
// EXPORT APP
// ============================================================================

/**
 * Export configured Express app
 * This will be imported by server.js to start the server
 */
export default app;