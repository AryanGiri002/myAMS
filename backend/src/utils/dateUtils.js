import { format, parse, isValid, startOfDay, endOfDay, parseISO } from 'date-fns';
import { DATE_FORMAT, TIME_FORMAT } from '../config/constants.js';

/**
 * ============================================================================
 * DATE UTILITIES MODULE
 * ============================================================================
 * 
 * This file is your project's "Date Specialist" - a standardized wrapper around
 * the date-fns library that ensures consistent date/time handling across the app.
 * 
 * WHY THIS FILE EXISTS:
 * - JavaScript's native Date object is notoriously difficult and error-prone
 * - date-fns library provides reliable date operations, but we wrap it for consistency
 * - If date format changes (DD-MM-YYYY → MM-DD-YYYY), update once in constants.js
 * - All functions include error handling to prevent crashes from invalid dates
 * 
 * CORE CONCEPTS:
 * 1. FORMATTING (Date → String): Convert Date objects to human-readable strings
 *    Example: new Date() → "07-11-2025"
 * 
 * 2. PARSING (String → Date): Convert user input strings to Date objects for calculations
 *    Example: "07-11-2025" → Date object
 * 
 * 3. VALIDATION: Check if date/time strings are in correct format before processing
 * 
 * 4. CALCULATIONS: Perform date math (add duration, get day boundaries, etc.)
 * 
 * STANDARDIZED FORMATS:
 * - Date: DD-MM-YYYY (e.g., "07-11-2025")
 * - Time: HH:MM in 24-hour format (e.g., "14:30")
 * - DateTime: DD-MM-YYYY HH:MM:SS (e.g., "07-11-2025 14:30:00")
 * ============================================================================
 */

/**
 * FORMAT DATE TO DD-MM-YYYY STRING
 * 
 * Converts a JavaScript Date object into a standardized date string.
 * Used when: Sending dates to frontend, displaying dates to users, storing formatted dates
 * 
 * @param {Date} date - JavaScript Date object to format
 * @returns {String} - Formatted date string in DD-MM-YYYY format
 * @throws {Error} - If date is invalid or null
 * 
 * @example
 * formatDate(new Date('2025-11-07')) // Returns: "07-11-2025"
 * formatDate(new Date()) // Returns: current date as "07-11-2025"
 */
export const formatDate = (date) => {
  try {
    // Validate that date exists and is a valid Date object
    if (!date || !isValid(date)) {
      throw new Error('Invalid date provided (dateUtils.js)');
    }
    
    // Use date-fns format function with DATE_FORMAT constant from config
    return format(date, DATE_FORMAT);
  } catch (error) {
    console.error(`❌ Date formatting error: ${error.message} (dateUtils.js)`);
    throw new Error('Failed to format date (dateUtils.js)');
  }
};

/**
 * PARSE DD-MM-YYYY STRING TO DATE OBJECT
 * 
 * Converts a date string from frontend/user input into a JavaScript Date object.
 * Used when: Processing form submissions, validating date inputs, performing date calculations
 * 
 * @param {String} dateString - Date string in DD-MM-YYYY format
 * @returns {Date} - JavaScript Date object
 * @throws {Error} - If date string is invalid or in wrong format
 * 
 * @example
 * parseDate("07-11-2025") // Returns: Date object representing Nov 7, 2025
 * parseDate("32-13-2025") // Throws error: Invalid date
 */
export const parseDate = (dateString) => {
  try {
    // Parse string using DATE_FORMAT as the expected format
    const parsed = parse(dateString, DATE_FORMAT, new Date());
    
    // Verify the parsed date is actually valid
    if (!isValid(parsed)) {
      throw new Error('Invalid date string (dateUtils.js)');
    }
    
    return parsed;
  } catch (error) {
    console.error(`❌ Date parsing error: ${error.message} (dateUtils.js)`);
    throw new Error(`Failed to parse date: ${dateString}. Expected format: DD-MM-YYYY (dateUtils.js)`);
  }
};

/**
 * FORMAT DATE TO HH:MM TIME STRING (24-HOUR FORMAT)
 * 
 * Extracts and formats the time portion of a Date object.
 * Used when: Displaying class start/end times, attendance record timestamps
 * 
 * @param {Date} date - JavaScript Date object
 * @returns {String} - Formatted time string in HH:MM format (24-hour)
 * @throws {Error} - If date is invalid or null
 * 
 * @example
 * const now = new Date('2025-11-07T14:30:00');
 * formatTime(now) // Returns: "14:30"
 */
export const formatTime = (date) => {
  try {
    // Validate date exists and is valid
    if (!date || !isValid(date)) {
      throw new Error('Invalid date provided (dateUtils.js)');
    }
    
    // Format using TIME_FORMAT constant (HH:mm)
    return format(date, TIME_FORMAT);
  } catch (error) {
    console.error(`❌ Time formatting error: ${error.message} (dateUtils.js)`);
    throw new Error('Failed to format time (dateUtils.js)');
  }
};

/**
 * FORMAT DATE TO DD-MM-YYYY HH:MM:SS STRING
 * 
 * Converts Date object to full datetime string with seconds.
 * Used when: Displaying last modified timestamps, audit trail timestamps
 * 
 * @param {Date} date - JavaScript Date object
 * @returns {String} - Formatted datetime string
 * @throws {Error} - If date is invalid or null
 * 
 * @example
 * formatDateTime(new Date()) // Returns: "07-11-2025 14:30:45"
 */
export const formatDateTime = (date) => {
  try {
    if (!date || !isValid(date)) {
      throw new Error('Invalid date provided (dateUtils.js)');
    }
    
    // Fixed format with seconds included
    return format(date, 'dd-MM-yyyy HH:mm:ss');
  } catch (error) {
    console.error(`❌ DateTime formatting error: ${error.message} (dateUtils.js)`);
    throw new Error('Failed to format datetime (dateUtils.js)');
  }
};

/**
 * GET START OF DAY (00:00:00.000)
 * 
 * Sets time to midnight (beginning of day) for a given date.
 * CRITICAL for database queries: When searching "all records on Nov 7", you need
 * to search from "Nov 7 00:00:00" to "Nov 7 23:59:59".
 * 
 * Used when: Building date range queries, filtering attendance by date
 * 
 * @param {Date} date - JavaScript Date object
 * @returns {Date} - Date object set to 00:00:00.000 on that day
 * @throws {Error} - If date is invalid or null
 * 
 * @example
 * const someDate = new Date('2025-11-07T14:30:00');
 * getStartOfDay(someDate) // Returns: Date object for "2025-11-07T00:00:00.000"
 */
export const getStartOfDay = (date) => {
  try {
    if (!date || !isValid(date)) {
      throw new Error('Invalid date provided (dateUtils.js)');
    }
    
    // date-fns startOfDay sets hours/minutes/seconds/ms to 0
    return startOfDay(date);
  } catch (error) {
    console.error(`❌ Start of day error: ${error.message} (dateUtils.js)`);
    throw new Error('Failed to get start of day (dateUtils.js)');
  }
};

/**
 * GET END OF DAY (23:59:59.999)
 * 
 * Sets time to last millisecond of the day.
 * CRITICAL for database queries: Upper bound for "all records on this day".
 * 
 * Used when: Building date range queries, filtering attendance by date
 * 
 * @param {Date} date - JavaScript Date object
 * @returns {Date} - Date object set to 23:59:59.999 on that day
 * @throws {Error} - If date is invalid or null
 * 
 * @example
 * const someDate = new Date('2025-11-07T14:30:00');
 * getEndOfDay(someDate) // Returns: Date object for "2025-11-07T23:59:59.999"
 */
export const getEndOfDay = (date) => {
  try {
    if (!date || !isValid(date)) {
      throw new Error('Invalid date provided (dateUtils.js)');
    }
    
    // date-fns endOfDay sets time to last millisecond of the day
    return endOfDay(date);
  } catch (error) {
    console.error(`❌ End of day error: ${error.message} (dateUtils.js)`);
    throw new Error('Failed to get end of day (dateUtils.js)');
  }
};

/**
 * VALIDATE DATE STRING FORMAT (DD-MM-YYYY)
 * 
 * Checks if a string can be parsed as a valid date in DD-MM-YYYY format.
 * Returns true/false instead of throwing error (safe for validation middleware).
 * 
 * Used when: Validating user input before processing, API request validation
 * 
 * @param {String} dateString - Date string to validate
 * @returns {Boolean} - True if valid DD-MM-YYYY format, false otherwise
 * 
 * @example
 * isValidDateString("07-11-2025") // Returns: true
 * isValidDateString("32-13-2025") // Returns: false (invalid date)
 * isValidDateString("2025-11-07") // Returns: false (wrong format)
 */
export const isValidDateString = (dateString) => {
  try {
    // Try to parse with expected format
    const parsed = parse(dateString, DATE_FORMAT, new Date());
    // Return validation result (no error thrown)
    return isValid(parsed);
  } catch (error) {
    // If parsing fails, return false
    return false;
  }
};

/**
 * VALIDATE TIME STRING FORMAT (HH:MM)
 * 
 * Checks if a string is in valid 24-hour time format using regex.
 * Returns true/false instead of throwing error (safe for validation).
 * 
 * Used when: Validating class start/end times, attendance record times
 * 
 * @param {String} timeString - Time string to validate
 * @returns {Boolean} - True if valid HH:MM format, false otherwise
 * 
 * @example
 * isValidTimeString("14:30") // Returns: true
 * isValidTimeString("23:59") // Returns: true
 * isValidTimeString("25:00") // Returns: false (25 hours invalid)
 * isValidTimeString("14:30:00") // Returns: false (includes seconds)
 */
export const isValidTimeString = (timeString) => {
  // Regex breakdown:
  // ^([01]\d|2[0-3]) → Hours: 00-19 or 20-23
  // : → Literal colon
  // ([0-5]\d)$ → Minutes: 00-59
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(timeString);
};

/**
 * PARSE ISO STRING TO DATE OBJECT
 * 
 * Converts an ISO 8601 datetime string (standard format from APIs/databases)
 * into a JavaScript Date object.
 * 
 * Used when: Processing dates from MongoDB, external APIs, or JSON responses
 * 
 * @param {String} isoString - ISO format date string (e.g., "2025-11-07T14:30:00.000Z")
 * @returns {Date} - JavaScript Date object
 * @throws {Error} - If ISO string is invalid
 * 
 * @example
 * parseISOString("2025-11-07T14:30:00.000Z") // Returns: Date object
 * parseISOString("invalid") // Throws error
 */
export const parseISOString = (isoString) => {
  try {
    // date-fns parseISO handles ISO 8601 format
    const parsed = parseISO(isoString);
    
    if (!isValid(parsed)) {
      throw new Error('Invalid ISO date string (dateUtils.js)');
    }
    
    return parsed;
  } catch (error) {
    console.error(`❌ ISO string parsing error: ${error.message} (dateUtils.js)`);
    throw new Error('Failed to parse ISO date string (dateUtils.js)');
  }
};

/**
 * GET CURRENT DATE AS DD-MM-YYYY STRING
 * 
 * Quick helper to get today's date in standardized format.
 * 
 * Used when: Setting default date values, generating attendance record IDs
 * 
 * @returns {String} - Current date in DD-MM-YYYY format
 * 
 * @example
 * getCurrentDate() // Returns: "07-11-2025" (today's date)
 */
export const getCurrentDate = () => {
  return formatDate(new Date());
};

/**
 * GET CURRENT TIME AS HH:MM STRING
 * 
 * Quick helper to get current time in standardized 24-hour format.
 * 
 * Used when: Auto-filling time fields, timestamps
 * 
 * @returns {String} - Current time in HH:MM format
 * 
 * @example
 * getCurrentTime() // Returns: "14:30" (current time)
 */
export const getCurrentTime = () => {
  return formatTime(new Date());
};

/**
 * CALCULATE END TIME FROM START TIME + DURATION
 * 
 * Business logic function that adds minutes to a start time to calculate when
 * something ends. Essential for attendance system where classes have multiple sessions.
 * 
 * Used when: Generating session breakdown, calculating class end times
 * 
 * @param {String} startTime - Start time in HH:MM format (e.g., "09:00")
 * @param {Number} durationMinutes - Duration to add in minutes (e.g., 45)
 * @returns {String} - End time in HH:MM format (e.g., "09:45")
 * @throws {Error} - If startTime is invalid or calculation fails
 * 
 * @example
 * calculateEndTime("09:00", 45)  // Returns: "09:45"
 * calculateEndTime("23:30", 45)  // Returns: "00:15" (next day)
 * calculateEndTime("14:00", 90)  // Returns: "15:30"
 */
export const calculateEndTime = (startTime, durationMinutes) => {
  try {
    // Split "HH:MM" into hours and minutes as numbers
    const [hours, minutes] = startTime.split(':').map(Number);
    
    // Create a Date object with the start time (date doesn't matter, only time)
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    // Add duration in milliseconds (minutes × 60 × 1000)
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    
    // Format the result back to HH:MM string
    return formatTime(endDate);
  } catch (error) {
    console.error(`❌ End time calculation error: ${error.message} (dateUtils.js)`);
    throw new Error('Failed to calculate end time (dateUtils.js)');
  }
};