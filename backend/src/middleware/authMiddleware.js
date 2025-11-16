import { verifyAccessToken } from '../utils/tokenUtils.js';
import { sendError } from '../utils/responseFormatter.js';
import { HTTP_STATUS } from '../config/constants.js';
import User from '../models/User.model.js';

/**
 * ============================================================================
 * AUTHENTICATION MIDDLEWARE (COOKIE-BASED)
 * ============================================================================
 * 
 * This middleware protects routes that require user authentication.
 * It verifies the JWT access token from httpOnly cookies and attaches user info to the request.
 * 
 * SECURITY APPROACH: COOKIE-BASED AUTHENTICATION
 * - Tokens are stored in httpOnly cookies (cannot be accessed by JavaScript)
 * - Protection against XSS (Cross-Site Scripting) attacks
 * - Browser automatically sends cookies with each request
 * - More secure than localStorage-based token storage
 * 
 * HOW IT WORKS:
 * 1. Extract access token from httpOnly cookie (req.cookies.accessToken)
 * 2. Verify token signature and expiration using tokenUtils
 * 3. Check if user still exists and is active in database
 * 4. Attach user info to req.user for use in controllers
 * 5. If any step fails, return 401 Unauthorized error
 * 
 * IMPORTANT: 
 * - Requires cookie-parser middleware to be set up in app.js
 * - Frontend must send requests with credentials: 'include'
 * - CORS must be configured with credentials: true
 * 
 * USAGE:
 * Apply this middleware to any route that requires authentication:
 *   router.get('/dashboard', authenticate, getStudentDashboard);
 * 
 * After this middleware runs successfully, controllers can access:
 *   req.user.userId - MongoDB ObjectId of the user
 *   req.user.role - User role (student/teacher/admin)
 * ============================================================================
 */

/**
 * Authenticate user by verifying JWT access token from cookies
 * 
 * Extracts token from httpOnly cookie, verifies it, checks user exists,
 * and attaches user info to request object for downstream use.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @example
 * // In routes file:
 * router.get('/profile', authenticate, getProfile);
 * 
 * // In controller (after authenticate middleware):
 * const userId = req.user.userId; // Available because authenticate added it
 * 
 * // Frontend must include credentials:
 * fetch('/api/students/dashboard', {
 *   credentials: 'include' // Sends cookies automatically
 * });
 */
export const authenticate = async (req, res, next) => {
  try {
    // ============================================================
    // Extract access token from httpOnly cookie
    // Browser automatically sends cookies with credentials: 'include'
    // ============================================================
    const token = req.cookies?.accessToken;

    // Check if token exists in cookies
    if (!token) {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        'Access token is required. Please login to access this resource (authMiddleware.js)'
      );
    }

    // ============================================================
    // Verify token signature and decode payload
    // Checks: signature validity, expiration, token type
    // ============================================================
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      // Token is invalid, expired, or malformed
      // Clear the invalid cookie
      res.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        `Invalid or expired access token: ${error.message}. Please login again (authMiddleware.js)`
      );
    }

    // ============================================================
    // Verify user still exists in database
    // User might have been deleted after token was issued
    // ============================================================
    const user = await User.findById(decoded.userId).select('role isActive');

    if (!user) {
      // User was deleted - clear cookie and deny access
      res.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        'User associated with this token no longer exists. Please login again (authMiddleware.js)'
      );
    }

    // ============================================================
    // Check if user account is active
    // Admin may have deactivated the account
    // ============================================================
    if (!user.isActive) {
      return sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        'Your account has been deactivated. Please contact administrator (authMiddleware.js)'
      );
    }

    // ============================================================
    // Authentication successful
    // Attach user info to request object for use in controllers
    // ============================================================
    req.user = {
      userId: decoded.userId,
      role: user.role,
    };

    // User is authenticated - proceed to next middleware/controller
    next();
  } catch (error) {
    console.error(`❌ Authentication error: ${error.message} (authMiddleware.js)`);
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Authentication failed due to server error (authMiddleware.js)'
    );
  }
};

/**
 * Optional authentication (doesn't fail if no token provided)
 * 
 * Similar to authenticate, but allows requests without tokens to proceed.
 * Useful for routes that have different behavior for authenticated vs guest users.
 * Sets req.user to null if no valid token is found.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @example
 * // Route accessible to both authenticated and guest users:
 * router.get('/public-data', optionalAuthenticate, getPublicData);
 * 
 * // In controller:
 * if (req.user) {
 *   // User is authenticated - show personalized data
 *   const userData = await getUserData(req.user.userId);
 * } else {
 *   // User is guest - show generic data
 *   const publicData = await getPublicData();
 * }
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    // Extract token from cookie
    const token = req.cookies?.accessToken;

    // No token provided - proceed as guest user
    if (!token) {
      req.user = null; // Explicitly set to null for guest users
      return next();
    }

    // Token provided - try to verify it
    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('role isActive');

      // Valid token and user exists and is active
      if (user && user.isActive) {
        req.user = {
          userId: decoded.userId,
          role: user.role,
        };
      } else {
        // User doesn't exist or is inactive - proceed as guest
        req.user = null;
      }
    } catch (error) {
      // Invalid/expired token - proceed as guest (don't fail the request)
      req.user = null;
    }

    next();
  } catch (error) {
    console.error(`❌ Optional authentication error: ${error.message} (authMiddleware.js)`);
    req.user = null;
    next();
  }
};