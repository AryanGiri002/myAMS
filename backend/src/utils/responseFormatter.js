import { HTTP_STATUS } from '../config/constants.js';

/**
 * Format successful API responses
 * 
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code (200, 201, etc.)
 * @param {String} message - Success message
 * @param {Object|Array} data - Response data
 * @param {Object} pagination - Optional pagination info
 */
export const sendSuccess = (res, statusCode = HTTP_STATUS.OK, message = 'Success', data = null, pagination = null) => {
  const response = {
    success: true,
    statusCode,
    message,
    data,
  };

  // Add pagination if provided
  if (pagination) {
    response.pagination = pagination;
  }

  return res.status(statusCode).json(response);
};

/**
 * Format error API responses
 * 
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code (400, 401, 404, etc.)
 * @param {String} message - Error message
 * @param {Array} errors - Optional array of detailed errors
 */
export const sendError = (res, statusCode = HTTP_STATUS.BAD_REQUEST, message = 'Error', errors = null) => {
  const response = {
    success: false,
    statusCode,
    message,
  };

  // Add detailed errors if provided
  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Format validation error responses from express-validator
 * 
 * @param {Object} res - Express response object
 * @param {Array} validationErrors - Array of validation errors from express-validator
 */
export const sendValidationError = (res, validationErrors) => {
  // Transform express-validator errors to our format
  const formattedErrors = validationErrors.map((err) => ({
    field: err.path || err.param,
    message: err.msg,
  }));

  return sendError(
    res,
    HTTP_STATUS.UNPROCESSABLE_ENTITY,
    'Validation failed (responseFormatter.js)',
    formattedErrors
  );
};

/**
 * Format paginated responses
 * 
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items for current page
 * @param {Number} currentPage - Current page number
 * @param {Number} totalItems - Total number of items in database
 * @param {Number} itemsPerPage - Items per page
 * @param {String} message - Success message
 */
export const sendPaginatedResponse = (res, data, currentPage, totalItems, itemsPerPage, message = 'Data retrieved successfully') => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const pagination = {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
  };

  return sendSuccess(res, HTTP_STATUS.OK, message, data, pagination);
};