const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    // Execute the async function and catch any errors
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };

/**
 * ============================================================================
 * ASYNC HANDLER UTILITY
 * ============================================================================
 * 
 * This utility wraps async controller functions to automatically catch errors
 * and pass them to Express's error handling middleware, eliminating the need
 * for repetitive try-catch blocks in every controller.
 * 
 * WHY THIS EXISTS:
 * - Express doesn't automatically catch errors in async functions
 * - Without this, every async controller needs a try-catch block (50+ times!)
 * - This keeps controllers clean and focused on business logic
 * - All errors get forwarded to centralized errorMiddleware.js
 * 
 * HOW IT WORKS:
 * 1. Wraps your async controller function
 * 2. Executes it using Promise.resolve()
 * 3. If the promise rejects (error occurs), catches it
 * 4. Passes error to next() → goes to errorMiddleware.js
 * 
 * USAGE:
 * Instead of:
 *   export const myController = async (req, res) => {
 *     try {
 *       // logic here
 *     } catch (error) {
 *       // handle error
 *     }
 *   }
 * 
 * Use:
 *   export const myController = asyncHandler(async (req, res) => {
 *     // logic here - errors automatically caught!
 *   });
 * ============================================================================
 */

/**
 * Wraps an async Express route handler to catch errors automatically
 * 
 * @param {Function} requestHandler - Async controller function (req, res, next)
 * @returns {Function} - Express middleware function with error handling
 * 
 * @example
 * // In controller file:
 * import { asyncHandler } from '../utils/asyncHandler.js';
 * 
 * export const getStudent = asyncHandler(async (req, res) => {
 *   const student = await Student.findById(req.params.id);
 *   res.json({ data: student });
 *   // If findById fails, error is automatically caught and sent to errorMiddleware
 * });
 */