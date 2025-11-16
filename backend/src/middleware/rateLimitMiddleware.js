import rateLimit from 'express-rate-limit';
import { HTTP_STATUS } from '../config/constants.js';

/**
 * ============================================================================
 * RATE LIMITING MIDDLEWARE
 * ============================================================================
 * 
 * This middleware prevents abuse by limiting the number of requests a client
 * can make to the API within a time window.
 * 
 * WHY THIS EXISTS:
 * - Prevents brute force attacks (e.g., password guessing)
 * - Protects against DDoS attacks
 * - Prevents API abuse and excessive resource usage
 * - Required for production security
 * 
 * HOW IT WORKS:
 * 1. Tracks requests by IP address
 * 2. Counts requests within time window (e.g., 15 minutes)
 * 3. If limit exceeded, blocks further requests with 429 error
 * 4. Window resets after specified time
 * 
 * RATE LIMIT TYPES:
 * - General API rate limit: Applied to all routes (100 req/15min)
 * - Auth rate limit: Stricter for login/signup (5 req/15min)
 * - Custom limits: Can be applied to specific routes
 * 
 * CONFIGURATION:
 * Settings from .env file:
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds
 * - RATE_LIMIT_MAX_REQUESTS: Max requests per window
 * ============================================================================
 */

/**
 * General API rate limiter for all routes
 * 
 * Allows 100 requests per 15 minutes per IP address.
 * This is the default rate limit for all API endpoints.
 * 
 * @example
 * // In app.js:
 * import { generalLimiter } from './middleware/rateLimitMiddleware.js';
 * app.use('/api', generalLimiter); // Apply to all /api/* routes
 */
export const generalLimiter = rateLimit({
  // Time window: 15 minutes (from .env or default)
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  
  // Max requests per window: 100 (from .env or default)
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // Message sent when limit is exceeded
  message: {
    success: false,
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
    message: 'Too many requests from this IP. Please try again after 15 minutes (rateLimitMiddleware.js)',
  },
  
  // HTTP status code for rate limit exceeded
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
  
  // Headers to include in response
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,  // Disable `X-RateLimit-*` headers
  
  // Custom handler for when limit is exceeded (optional)
  handler: (req, res) => {
    console.warn(`⚠️  Rate limit exceeded for IP: ${req.ip} on ${req.originalUrl} (rateLimitMiddleware.js)`);
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      message: 'Too many requests. Please slow down and try again later (rateLimitMiddleware.js)',
    });
  },
});

/**
 * Strict rate limiter for authentication routes
 * 
 * Allows only 5 requests per 15 minutes to prevent brute force attacks.
 * Apply this to login, signup, and password reset routes.
 * 
 * @example
 * // In authRoutes.js:
 * import { authLimiter } from '../middleware/rateLimitMiddleware.js';
 * router.post('/login', authLimiter, loginController);
 * router.post('/signup', authLimiter, signupController);
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 requests per window (strict for security)
  
  message: {
    success: false,
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
    message: 'Too many authentication attempts. Please try again after 15 minutes (rateLimitMiddleware.js)',
  },
  
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  
  // Skip rate limiting for successful requests (only count failed attempts)
  skipSuccessfulRequests: true, // Don't count successful logins toward limit
  
  handler: (req, res) => {
    console.warn(`⚠️  Auth rate limit exceeded for IP: ${req.ip} on ${req.originalUrl} (rateLimitMiddleware.js)`);
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      message: 'Too many authentication attempts. Your IP has been temporarily blocked (rateLimitMiddleware.js)',
    });
  },
});

/**
 * Moderate rate limiter for data modification routes
 * 
 * Allows 30 requests per 15 minutes for routes that modify data.
 * Apply to POST, PUT, PATCH, DELETE routes that aren't auth-related.
 * 
 * @example
 * // In teacherRoutes.js:
 * import { modifyLimiter } from '../middleware/rateLimitMiddleware.js';
 * router.post('/attendance', authenticate, modifyLimiter, markAttendance);
 * router.patch('/attendance/:id', authenticate, modifyLimiter, editAttendance);
 */
export const modifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window
  
  message: {
    success: false,
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
    message: 'Too many data modification requests. Please try again later (rateLimitMiddleware.js)',
  },
  
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Create custom rate limiter with specific settings
 * 
 * Factory function to create rate limiters with custom parameters.
 * Useful for special routes that need unique rate limiting.
 * 
 * @param {Number} windowMs - Time window in milliseconds
 * @param {Number} max - Maximum number of requests per window
 * @param {String} message - Custom message when limit exceeded
 * @returns {Function} - Express rate limiter middleware
 * 
 * @example
 * // Create custom limiter for file uploads (10 uploads per hour):
 * const uploadLimiter = createLimiter(60 * 60 * 1000, 10, 'Too many uploads');
 * router.post('/upload', uploadLimiter, uploadFile);
 */
export const createLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      message: message || 'Rate limit exceeded (rateLimitMiddleware.js)',
    },
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
  });
};