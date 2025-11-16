import { sendError } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../config/constants.js';

/**
 * ============================================================================
 * CENTRALIZED ERROR HANDLING MIDDLEWARE
 * ============================================================================
 * 
 * This is the "catch-all" error handler for the entire application.
 * All errors from routes, controllers, and middleware end up here.
 * 
 * HOW IT WORKS:
 * 1. Express automatically passes errors here if:
 *    - next(error) is called in any middleware/route
 *    - An error is thrown in synchronous code
 *    - asyncHandler catches an error in async code
 * 2. This middleware formats the error consistently
 * 3. Logs error details to console for debugging
 * 4. Sends standardized error response to client
 * 
 * ERROR TYPES HANDLED:
 * - Mongoose validation errors (CastError, ValidationError)
 * - JWT errors (JsonWebTokenError, TokenExpiredError)
 * - Duplicate key errors (MongoDB 11000)
 * - Custom application errors
 * - Unexpected server errors
 * 
 * PLACEMENT:
 * This middleware MUST be registered LAST in app.js, after all routes:
 *   app.use('/api/auth', authRoutes);
 *   app.use('/api/students', studentRoutes);
 *   app.use(errorHandler); // ← Last middleware
 * ============================================================================
 */

/**
 * Global error handling middleware
 * 
 * Catches all errors from the application, formats them consistently,
 * and sends appropriate HTTP responses.
 * 
 * @param {Error} err - Error object (from throw, next(err), or asyncHandler)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function (unused in error handlers)
 * 
 * @example
 * // In app.js (MUST be last middleware):
 * app.use(errorHandler);
 * 
 * // Errors automatically come here from anywhere in the app:
 * // 1. Controller throws error: throw new Error('Something went wrong');
 * // 2. Mongoose validation fails: new User({ email: 'invalid' }).save();
 * // 3. Manual error pass: next(new Error('Custom error'));
 */
export const errorHandler = (err, req, res, next) => {
  // Default error values if not specified
  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // Log error details for debugging (in development)
  if (process.env.NODE_ENV === 'development') {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`❌ ERROR CAUGHT (errorMiddleware.js):`);
    console.error(`📍 Path: ${req.method} ${req.originalUrl}`);
    console.error(`🔢 Status: ${statusCode}`);
    console.error(`💬 Message: ${message}`);
    console.error(`📚 Stack: ${err.stack}`);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } else {
    // In production, log less detailed errors (no stack trace)
    console.error(`❌ Error: ${message} | Path: ${req.method} ${req.originalUrl} (errorMiddleware.js)`);
  }

  // Handle specific error types with custom messages

  // 1. MongoDB CastError (Invalid ObjectId format)
  if (err.name === 'CastError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = `Invalid ${err.path}: ${err.value}. Please provide a valid ID (errorMiddleware.js)`;
  }

  // 2. MongoDB Duplicate Key Error (Unique constraint violation)
  if (err.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    const field = Object.keys(err.keyPattern)[0];
    message = `Duplicate value for field: ${field}. This ${field} already exists (errorMiddleware.js)`;
  }

  // 3. Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
    const validationErrors = Object.values(err.errors).map((error) => ({
      field: error.path,
      message: error.message,
    }));
    errors = validationErrors;
    message = 'Validation failed (errorMiddleware.js)';
  }

  // 4. JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Invalid token. Please login again (errorMiddleware.js)';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = 'Token expired. Please login again (errorMiddleware.js)';
  }

  // 5. Multer file upload errors (if you add file uploads later)
  if (err.name === 'MulterError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size too large (errorMiddleware.js)';
    } else {
      message = `File upload error: ${err.message} (errorMiddleware.js)`;
    }
  }

  // Send formatted error response using responseFormatter
  return sendError(res, statusCode, message, errors);
};

/**
 * Handle 404 Not Found errors for undefined routes
 * 
 * This middleware catches requests to routes that don't exist.
 * Place it AFTER all route definitions but BEFORE errorHandler.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @example
 * // In app.js:
 * app.use('/api/auth', authRoutes);
 * app.use('/api/students', studentRoutes);
 * app.use(notFound); // ← Catches undefined routes
 * app.use(errorHandler); // ← Then handles the error
 */
export const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl} (errorMiddleware.js)`);
  error.statusCode = HTTP_STATUS.NOT_FOUND;
  next(error); // Pass to errorHandler
};