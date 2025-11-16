import { validationResult } from 'express-validator';
import { sendValidationError } from '../utils/responseFormatter.js';

/**
 * ============================================================================
 * VALIDATION MIDDLEWARE
 * ============================================================================
 * 
 * This middleware processes validation results from express-validator and
 * returns formatted error responses if validation fails.
 * 
 * HOW IT WORKS:
 * 1. Collects validation errors from express-validator checks
 * 2. If errors exist, format them using responseFormatter
 * 3. Return 422 Unprocessable Entity with detailed error list
 * 4. If no errors, proceed to controller
 * 
 * USAGE:
 * Apply after express-validator validation rules in routes:
 * 
 *   router.post('/signup',
 *     [
 *       body('email').isEmail().withMessage('Invalid email'),
 *       body('password').isLength({ min: 8 }).withMessage('Password too short')
 *     ],
 *     validate,  // ← This middleware checks validation results
 *     signupController
 *   );
 * 
 * express-validator MUST be imported in route files where validation rules are defined.
 * ============================================================================
 */

/**
 * Validate request data using express-validator results
 * 
 * Checks if any validation errors occurred and returns formatted error response.
 * If no errors, allows request to proceed to controller.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @example
 * // In routes file:
 * import { body } from 'express-validator';
 * import { validate } from '../middleware/validationMiddleware.js';
 * 
 * router.post('/signup',
 *   [
 *     body('email')
 *       .isEmail().withMessage('Invalid email format')
 *       .normalizeEmail(),
 *     body('password')
 *       .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
 *   ],
 *   validate, // Processes validation results
 *   signupController
 * );
 * 
 * // If validation fails, response will be:
 * {
 *   "success": false,
 *   "statusCode": 422,
 *   "message": "Validation failed",
 *   "errors": [
 *     { "field": "email", "message": "Invalid email format" },
 *     { "field": "password", "message": "Password must be at least 8 characters" }
 *   ]
 * }
 */
export const validate = (req, res, next) => {
  // Extract validation errors from request (populated by express-validator)
  const errors = validationResult(req);

  // If there are no validation errors, proceed to controller
  if (errors.isEmpty()) {
    return next();
  }

  // Validation failed - format and return errors
  // sendValidationError formats errors in our standard API response format
  return sendValidationError(res, errors.array());
};

/**
 * Helper function to create reusable validation chains
 * 
 * This is a utility to organize validation rules by entity/route.
 * Not directly used as middleware, but helps keep route files clean.
 * 
 * @param {Array} validations - Array of express-validator validation chains
 * @returns {Array} - Same array (for consistency/future expansion)
 * 
 * @example
 * // In a separate validations file (e.g., authValidations.js):
 * import { body } from 'express-validator';
 * import { createValidation } from '../middleware/validationMiddleware.js';
 * 
 * export const signupValidation = createValidation([
 *   body('email').isEmail().normalizeEmail(),
 *   body('password').isLength({ min: 8 })
 * ]);
 * 
 * // In routes file:
 * router.post('/signup', signupValidation, validate, signupController);
 */
export const createValidation = (validations) => {
  return validations;
};