/**
 * Application-wide constants
 * Centralized location for all constant values used across the application
 */

// User Roles
export const USER_ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
};

// Academic Branches (2-character codes used in SRN)
export const BRANCHES = ['CSE', 'ECE', 'Biotech', 'Mech'];

// Branch Code Mapping (for SRN validation - 2 characters only)
export const BRANCH_CODES = {
  CSE: 'CS', // Computer Science
  ECE: 'EC', // Electronics & Communication
  Biotech: 'BT', // Biotechnology
  Mech: 'MH', // Mechanical
  // Add more mappings as needed
};

// Semester Range
export const SEMESTER_RANGE = {
  MIN: 1,
  MAX: 8,
};

// Attendance Status Options
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
};

// Password Requirements
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  // Must contain: 1 uppercase, 1 lowercase, 1 number
  REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
};

// Email Domain Requirement
export const EMAIL_DOMAIN = '@pesu.pes.edu';

// ID Patterns (for validation)
export const ID_PATTERNS = {
  /**
   * PRN Pattern: PES + 1digit(1-9) + 4digits(year) + 5digits(1-99999)
   * Structure: PES[1-9][0-9]{4}[0-9]{5}
   * Example: PES2202300055
   * Breakdown:
   * - PES: Prefix (fixed)
   * - 2: Single digit (1-9)
   * - 2023: Year of enrollment (4 digits)
   * - 00055: Student number (5 digits, can be 00001 to 99999)
   */
  PRN: /^PES[1-9]\d{4}\d{5}$/,

  /**
   * SRN Pattern: PES + 1digit + UG/PG + 2digits(year) + 2letters(branch) + 3digits
   * Structure: PES[1-9](UG|PG)\d{2}[A-Z]{2}\d{3}
   * Example: PES2UG23CS098
   * Breakdown:
   * - PES: Prefix (fixed)
   * - 2: Single digit (1-9)
   * - UG: Undergraduate OR PG: Postgraduate
   * - 23: Last 2 digits of enrollment year (e.g., 23 for 2023)
   * - CS: Branch code (exactly 2 uppercase letters, e.g., CS, EC, BT, MH)
   * - 098: Student number within branch (3 digits, 001-999)
   */
  SRN: /^PES[1-9](UG|PG)\d{2}[A-Z]{2}\d{3}$/,

  /**
   * Teacher ID Pattern: TCH + 3digits
   * Example: TCH001, TCH102, TCH999
   */
  TEACHER_ID: /^TCH\d{3}$/,
};

// Session Duration (in minutes)
export const SESSION_DURATION = 45;

// Maximum Sessions per Class
export const MAX_SESSIONS_PER_CLASS = 10;

// Pagination Settings
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  ITEMS_PER_PAGE: 70, // As per your requirement
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

// Token Types
export const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
};

// Date Format
export const DATE_FORMAT = 'dd-MM-yyyy'; // Used with date-fns

// Time Format (24-hour)
export const TIME_FORMAT = 'HH:mm'; // Example: 09:00, 14:30

// Database Name
export const DB_NAME = 'AttendanceCluster';

// Subject Credits Range
export const SUBJECT_CREDITS_RANGE = {
  MIN: 1,
  MAX: 10,
};
