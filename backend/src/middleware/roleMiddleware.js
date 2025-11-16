import { sendError } from '../utils/responseFormatter.js';
import { HTTP_STATUS, USER_ROLES } from '../config/constants.js';

/**
 * ============================================================================
 * ROLE-BASED ACCESS CONTROL MIDDLEWARE
 * ============================================================================
 * 
 * This middleware restricts access to routes based on user roles.
 * It checks if the authenticated user has permission to access the route.
 * 
 * HOW IT WORKS:
 * 1. Assumes authenticate middleware has already run (req.user exists)
 * 2. Checks if req.user.role matches one of the allowed roles
 * 3. If role matches, proceed to controller
 * 4. If role doesn't match, return 403 Forbidden error
 * 
 * USAGE:
 * Apply after authenticate middleware to restrict by role:
 *   router.get('/admin/users', authenticate, restrictTo('admin'), getUsers);
 *   router.post('/teacher/attendance', authenticate, restrictTo('teacher', 'admin'), markAttendance);
 * 
 * IMPORTANT:
 * - Always use authenticate middleware BEFORE restrictTo
 * - Can pass multiple roles: restrictTo('student', 'teacher')
 * ============================================================================
 */

/**
 * Restrict route access to specific user roles
 * 
 * Creates a middleware function that checks if authenticated user's role
 * is included in the list of allowed roles.
 * 
 * @param {...String} allowedRoles - One or more roles that can access the route
 * @returns {Function} - Express middleware function
 * 
 * @example
 * // Only admins can access:
 * router.delete('/users/:id', authenticate, restrictTo('admin'), deleteUser);
 * 
 * // Teachers and admins can access:
 * router.post('/attendance', authenticate, restrictTo('teacher', 'admin'), markAttendance);
 * 
 * // All authenticated users can access (no role restriction):
 * router.get('/profile', authenticate, getProfile);
 */
export const restrictTo = (...allowedRoles) => {
  // Return middleware function that has access to allowedRoles via closure
  return (req, res, next) => {
    // Check if authenticate middleware has run (req.user should exist)
    if (!req.user) {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        'Authentication required. Please login first (roleMiddleware.js)'
      );
    }

    // Check if user's role is in the list of allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        `Access denied. This route is restricted to: ${allowedRoles.join(', ')} (roleMiddleware.js)`
      );
    }

    // User has required role - proceed to controller
    next();
  };
};

/**
 * Middleware to restrict access to students only
 * 
 * Convenience wrapper around restrictTo for common use case.
 * 
 * @example
 * router.get('/student/dashboard', authenticate, studentOnly, getDashboard);
 */
export const studentOnly = restrictTo(USER_ROLES.STUDENT);

/**
 * Middleware to restrict access to teachers only
 * 
 * Convenience wrapper around restrictTo for common use case.
 * 
 * @example
 * router.post('/teacher/attendance', authenticate, teacherOnly, markAttendance);
 */
export const teacherOnly = restrictTo(USER_ROLES.TEACHER);

/**
 * Middleware to restrict access to admins only
 * 
 * Convenience wrapper around restrictTo for common use case.
 * 
 * @example
 * router.delete('/admin/users/:id', authenticate, adminOnly, deleteUser);
 */
export const adminOnly = restrictTo(USER_ROLES.ADMIN);

/**
 * Middleware to allow access to teachers and admins
 * 
 * Convenience wrapper for routes that both teachers and admins can access.
 * 
 * @example
 * router.patch('/attendance/:id', authenticate, teacherOrAdmin, editAttendance);
 */
export const teacherOrAdmin = restrictTo(USER_ROLES.TEACHER, USER_ROLES.ADMIN);
export const studentOrAdmin = restrictTo(USER_ROLES.STUDENT, USER_ROLES.ADMIN);
