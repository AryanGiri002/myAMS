import { ID_PATTERNS, EMAIL_DOMAIN, PASSWORD_REQUIREMENTS, BRANCHES } from '../config/constants.js';

/**
 * Validate PRN format
 * 
 * @param {String} prn - PRN to validate
 * @returns {Boolean} - True if valid, false otherwise
 */
export const isValidPRN = (prn) => {
  return ID_PATTERNS.PRN.test(prn);
};

/**
 * Validate SRN format
 * 
 * @param {String} srn - SRN to validate
 * @returns {Boolean} - True if valid, false otherwise
 */
export const isValidSRN = (srn) => {
  return ID_PATTERNS.SRN.test(srn);
};

/**
 * Validate Teacher ID format
 * 
 * @param {String} teacherId - Teacher ID to validate
 * @returns {Boolean} - True if valid, false otherwise
 */
export const isValidTeacherId = (teacherId) => {
  return ID_PATTERNS.TEACHER_ID.test(teacherId);
};

/**
 * Validate university email domain
 * 
 * @param {String} email - Email to validate
 * @returns {Boolean} - True if email ends with university domain
 */
export const isUniversityEmail = (email) => {
  return email.toLowerCase().endsWith(EMAIL_DOMAIN);
};

/**
 * Validate password strength
 * 
 * @param {String} password - Password to validate
 * @returns {Object} - {isValid: Boolean, errors: Array}
 */
export const validatePassword = (password) => {
  const errors = [];
  
  // Check minimum length
  if (password.length < PASSWORD_REQUIREMENTS.MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters`);
  }
  
  // Check maximum length
  if (password.length > PASSWORD_REQUIREMENTS.MAX_LENGTH) {
    errors.push(`Password must not exceed ${PASSWORD_REQUIREMENTS.MAX_LENGTH} characters`);
  }
  
  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Check for number
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate branch name
 * 
 * @param {String} branch - Branch to validate
 * @returns {Boolean} - True if valid branch
 */
export const isValidBranch = (branch) => {
  return BRANCHES.includes(branch);
};

/**
 * Validate semester number
 * 
 * @param {Number} semester - Semester to validate
 * @returns {Boolean} - True if valid (1-8)
 */
export const isValidSemester = (semester) => {
  return Number.isInteger(semester) && semester >= 1 && semester <= 8;
};

/**
 * Validate MongoDB ObjectId format
 * 
 * @param {String} id - ID to validate
 * @returns {Boolean} - True if valid ObjectId format
 */
export const isValidObjectId = (id) => {
  return /^[a-f\d]{24}$/i.test(id);
};

/**
 * Sanitize string input (remove extra whitespace, trim)
 * 
 * @param {String} input - String to sanitize
 * @returns {String} - Sanitized string
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/\s+/g, ' '); // Replace multiple spaces with single space
};

/**
 * Validate attendance status
 * 
 * @param {String} status - Status to validate
 * @returns {Boolean} - True if valid ('present' or 'absent')
 */
export const isValidAttendanceStatus = (status) => {
  return status === 'present' || status === 'absent';
};

/**
 * Validate time string format (HH:MM)
 * 
 * @param {String} time - Time string to validate
 * @returns {Boolean} - True if valid HH:MM format
 */
export const isValidTimeFormat = (time) => {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
};

/**
 * Validate that end time is after start time
 * 
 * @param {String} startTime - Start time in HH:MM format
 * @param {String} endTime - End time in HH:MM format
 * @returns {Boolean} - True if end time is after start time
 */
export const isEndTimeAfterStartTime = (startTime, endTime) => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return endMinutes > startMinutes;
};