// API Configuration
const API_CONFIG = {
  BASE_URL: 'http://localhost:4000/api',
  TIMEOUT: 30000,
};

// Application Routes
const APP_ROUTES = {
  LANDING: '/index.html',
  LOGIN: '/login.html',
  SIGNUP: '/signup.html',
  STUDENT_DASHBOARD: '/pages/student-dashboard.html',
  STUDENT_ATTENDANCE: '/pages/student-attendance.html',
  TEACHER_DASHBOARD: '/pages/teacher-dashboard.html',
  TEACHER_MARK_ATTENDANCE: '/pages/teacher-mark-attendance.html',
  TEACHER_VIEW_ATTENDANCE: '/pages/teacher-view-attendance.html',
  TEACHER_EDIT_ATTENDANCE: '/pages/teacher-edit-attendance.html',
  TEACHER_CLASS_STUDENTS: '/pages/teacher-class-students.html',
  ADMIN_DASHBOARD: '/pages/admin-dashboard.html',
  ADMIN_USERS: '/pages/admin-users.html',
  ADMIN_SUBJECTS: '/pages/admin-subjects.html',
  ADMIN_CLASS_SECTIONS: '/pages/admin-class-sections.html',
  ADMIN_ENROLLMENTS: '/pages/admin-enrollments.html',
};

// Validation Patterns
const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@pesu\.pes\.edu$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  PRN: /^PES[1-9]\d{9}$/,
  SRN: /^PES[1-9](UG|PG)\d{2}[A-Z]{2}\d{3}$/,
  TEACHER_ID: /^TCH\d{3}$/,
  TIME: /^([01]\d|2[0-3]):([0-5]\d)$/,
  DATE_DD_MM_YYYY: /^\d{2}-\d{2}-\d{4}$/,
};

// Enum Values
const ENUMS = {
  ROLES: ['student', 'teacher', 'admin'],
  BRANCHES: ['CSE', 'ECE', 'Biotech', 'Mech'],
  SEMESTERS: [1, 2, 3, 4, 5, 6, 7, 8],
  ATTENDANCE_STATUS: ['present', 'absent'],
  BRANCH_CODES: {
    CSE: 'CS',
    ECE: 'EC',
    Biotech: 'BT',
    Mech: 'MH',
  },
};

// Error Messages
const ERROR_MESSAGES = {
  'Validation failed': 'Please check your input and try again.',
  'User not found': 'The requested user could not be found.',
  'Access denied': 'You do not have permission to perform this action.',
  'Token expired': 'Your session has expired. Please login again.',
  'Too many requests': 'Too many attempts. Please wait 15 minutes and try again.',
  'Duplicate value': 'This value is already in use. Please use a different one.',
  'Network error': 'Connection failed. Please check your internet and try again.',
  'Email already exists': 'This email is already registered.',
  'Invalid credentials': 'Invalid email or password.',
};

// Toast Duration
const TOAST_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  WARNING: 4000,
  INFO: 3000,
};

// Attendance Color Coding
const ATTENDANCE_COLORS = {
  EXCELLENT: { min: 75, class: 'text-green-600 bg-green-100' },
  WARNING: { min: 60, max: 74, class: 'text-yellow-600 bg-yellow-100' },
  CRITICAL: { max: 59, class: 'text-red-600 bg-red-100' },
};

// Pagination Defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  ADMIN_DEFAULT_LIMIT: 50,
};
