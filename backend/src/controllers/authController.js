import crypto from 'crypto';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/responseFormatter.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getTokenExpiryDate,
} from '../utils/tokenUtils.js';
import { validatePassword } from '../utils/validators.js';
import { HTTP_STATUS, USER_ROLES } from '../config/constants.js';
import User from '../models/User.model.js';
import Student from '../models/Student.model.js';
import Teacher from '../models/Teacher.model.js';

/**
 * ============================================================================
 * AUTHENTICATION CONTROLLER
 * ============================================================================
 *
 * Handles all authentication-related operations using cookie-based JWT tokens.
 * All tokens are stored in httpOnly cookies for maximum security (XSS protection).
 *
 * ENDPOINTS:
 * 1. POST /api/auth/signup   - Register new user (student/teacher)
 * 2. POST /api/auth/login    - Authenticate user and set cookies
 * 3. POST /api/auth/logout   - Clear cookies and invalidate refresh token
 * 4. POST /api/auth/refresh  - Get new access token using refresh token
 * 5. GET  /api/auth/me       - Get current logged-in user's profile
 *
 * SECURITY FEATURES:
 * - Passwords hashed with bcrypt (pre-save hook in User model)
 * - JWT tokens with separate secrets for access/refresh
 * - httpOnly cookies (JavaScript cannot access tokens)
 * - Refresh token stored in database (can be revoked)
 * - Rate limiting applied to prevent brute force attacks
 * ============================================================================
 */

/**
 * SIGNUP - Register a new user (student or teacher)
 *
 * Creates a User account and associated Student/Teacher profile.
 * Password is automatically hashed by User model's pre-save hook.
 * Does NOT automatically log in user (they must login after signup).
 *
 * Route: POST /api/auth/signup
 * Access: Public (no authentication required)
 * Rate Limit: 5 requests per 15 minutes (authLimiter)
 *
 * @param {Object} req.body - Signup data
 * @param {String} req.body.email - University email (@pesu.pes.edu)
 * @param {String} req.body.password - Plain text password (will be hashed)
 * @param {String} req.body.confirmPassword - Password confirmation
 * @param {String} req.body.role - User role (student/teacher)
 * @param {Object} req.body.roleSpecificData - Student or Teacher specific data
 *
 * @example
 * // Student signup:
 * POST /api/auth/signup
 * {
 *   "email": "student@pesu.pes.edu",
 *   "password": "SecurePass123",
 *   "confirmPassword": "SecurePass123",
 *   "role": "student",
 *   "roleSpecificData": {
 *     "prn": "PES2202300055",
 *     "srn": "PES2UG23CS068",
 *     "name": "John Doe",
 *     "branch": "CSE",
 *     "currentSemester": 3,
 *     "section": "A"
 *   }
 * }
 */
export const signup = asyncHandler(async (req, res) => {
  const { email, password, confirmPassword, role, roleSpecificData } = req.body;

  // Validate password confirmation
  if (password !== confirmPassword) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Password and confirm password do not match (authController.js)'
    );
  }

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Password does not meet requirements (authController.js)',
      passwordValidation.errors.map(err => ({
        field: 'password',
        message: err,
      }))
    );
  }

  // Check if user with this email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return sendError(
      res,
      HTTP_STATUS.CONFLICT,
      'User with this email already exists (authController.js)'
    );
  }

  // Validate role
  if (!Object.values(USER_ROLES).includes(role)) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      `Invalid role. Must be one of: ${Object.values(USER_ROLES).join(', ')} (authController.js)`
    );
  }

  // Admin role can only be created manually (security measure)
  if (role === USER_ROLES.ADMIN) {
    return sendError(
      res,
      HTTP_STATUS.FORBIDDEN,
      'Admin accounts cannot be created through signup. Contact system administrator (authController.js)'
    );
  }

  // Create User document (password will be hashed by pre-save hook)
  const user = await User.create({
    email,
    password, // Will be automatically hashed by User model pre-save hook
    role,
  });

  // Create role-specific profile
  if (role === USER_ROLES.STUDENT) {
    // Validate student-specific data
    const { prn, srn, name, branch, currentSemester, section } =
      roleSpecificData;

    if (!prn || !srn || !name || !branch || !currentSemester || !section) {
      // Rollback: Delete user if student creation fails
      await User.findByIdAndDelete(user._id);
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'Missing required student fields: prn, srn, name, branch, currentSemester, section (authController.js)'
      );
    }

    // Check if PRN already exists (PRN must be unique)
    const existingPRN = await Student.findOne({ prn });
    if (existingPRN) {
      await User.findByIdAndDelete(user._id); // Rollback
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        'PRN already exists. Please check your PRN (authController.js)'
      );
    }

    // Create Student profile
    await Student.create({
      userId: user._id,
      prn,
      srn,
      name,
      branch,
      currentSemester,
      section,
    });
  } else if (role === USER_ROLES.TEACHER) {
    // Validate teacher-specific data
    const { teacherId, name, department } = roleSpecificData;

    if (!teacherId || !name || !department) {
      // Rollback: Delete user if teacher creation fails
      await User.findByIdAndDelete(user._id);
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'Missing required teacher fields: teacherId, name, department (authController.js)'
      );
    }

    // Check if teacherId already exists
    const existingTeacherId = await Teacher.findOne({ teacherId });
    if (existingTeacherId) {
      await User.findByIdAndDelete(user._id); // Rollback
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        'Teacher ID already exists. Please check your Teacher ID (authController.js)'
      );
    }

    // Create Teacher profile
    await Teacher.create({
      userId: user._id,
      teacherId,
      name,
      department,
    });
  }

  // Success - user created (NO auto-login for security)
  return sendSuccess(
    res,
    HTTP_STATUS.CREATED,
    'Account created successfully. Please login with your credentials (authController.js)',
    {
      userId: user._id,
      email: user.email,
      role: user.role,
    }
  );
});

/**
 * LOGIN - Authenticate user and set httpOnly cookies
 *
 * Verifies credentials, generates tokens, stores refresh token in database,
 * and sets both tokens as httpOnly cookies in the response.
 *
 * Route: POST /api/auth/login
 * Access: Public (no authentication required)
 * Rate Limit: 5 requests per 15 minutes (authLimiter)
 *
 * @param {Object} req.body - Login credentials
 * @param {String} req.body.email - University email
 * @param {String} req.body.password - Plain text password
 *
 * @example
 * POST /api/auth/login
 * {
 *   "email": "student@pesu.pes.edu",
 *   "password": "SecurePass123"
 * }
 *
 * Response sets cookies:
 * - accessToken (httpOnly, 1 day expiry)
 * - refreshToken (httpOnly, 7 days expiry)
 */
export const login = asyncHandler(async (req, res) => {
  console.log('===== LOGIN ATTEMPT =====');
  console.log('Incoming cookies:', req.cookies);
  console.log('Incoming body:', req.body);

  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    console.log('Login failed: Missing email or password');
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Email and password are required (authController.js)'
    );
  }

  console.log('Looking up user with email:', email);

  // Find user
  const user = await User.findOne({ email }).select('+password');
  console.log('User lookup result:', user ? 'FOUND' : 'NOT FOUND');

  if (!user) {
    console.log('Login failed: No user found with this email');
    return sendError(
      res,
      HTTP_STATUS.UNAUTHORIZED,
      'Invalid email or password (authController.js)'
    );
  }

  // Check if account is active
  console.log('User active status:', user.isActive);
  if (!user.isActive) {
    console.log('Login failed: User account is deactivated');
    return sendError(
      res,
      HTTP_STATUS.FORBIDDEN,
      'Your account has been deactivated. Please contact administrator (authController.js)'
    );
  }

  // Verify password
  console.log('Checking password...');
  const isPasswordValid = await user.comparePassword(password);
  console.log('Password match:', isPasswordValid);

  if (!isPasswordValid) {
    console.log('Login failed: Incorrect password');
    return sendError(
      res,
      HTTP_STATUS.UNAUTHORIZED,
      'Invalid email or password (authController.js)'
    );
  }

  console.log('Password correct. Generating tokens...');

  // Generate access + refresh tokens
  const accessToken = generateAccessToken({
    userId: user._id,
    role: user.role,
  });

  const refreshToken = generateRefreshToken({
    userId: user._id,
    tokenId: crypto.randomUUID(),
  });

  console.log('Tokens generated:', {
    accessTokenPresent: !!accessToken,
    refreshTokenPresent: !!refreshToken,
  });

  const refreshTokenExpiry = getTokenExpiryDate(
    process.env.JWT_REFRESH_EXPIRY || '7d'
  );

  // Save refresh token
  console.log('Storing refresh token in DB...');
  user.addRefreshToken(refreshToken, refreshTokenExpiry);
  user.lastLogin = new Date();
  await user.save();
  console.log('Refresh token saved. Last login updated.');

  // Fetch role profile
  console.log('Fetching role-specific profile for role:', user.role);

  let profile = null;

  if (user.role === USER_ROLES.STUDENT) {
    console.log('Fetching student profile...');
    const student = await Student.findOne({ userId: user._id }).populate(
      'enrolledSubjects.subjectId',
      'subjectCode subjectName credits'
    );
    profile = student
      ? {
          studentId: student._id,
          prn: student.prn,
          srn: student.srn,
          name: student.name,
          branch: student.branch,
          semester: student.currentSemester,
          section: student.section,
          enrolledSubjects: student.enrolledSubjects.map(e => ({
            subjectId: e.subjectId._id,
            subjectCode: e.subjectId.subjectCode,
            subjectName: e.subjectId.subjectName,
            credits: e.subjectId.credits,
            semesterNumber: e.semesterNumber,
          })),
        }
      : null;
  }

  if (user.role === USER_ROLES.TEACHER) {
    console.log('Fetching teacher profile...');
    const teacher = await Teacher.findOne({ userId: user._id });
    profile = teacher
      ? {
          teacherId: teacher.teacherId,
          name: teacher.name,
          department: teacher.department,
        }
      : null;
  }

  if (user.role === USER_ROLES.ADMIN) {
    console.log('Admin login — no extra profile needed.');
    profile = { name: 'Administrator' };
  }

  // Set cookies
  console.log('Setting cookies...');

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  console.log('Cookies set successfully');
  console.log('===== LOGIN SUCCESS =====');

  // Send response
  return sendSuccess(
    res,
    HTTP_STATUS.OK,
    'Login successful (authController.js)',
    {
      user: {
        userId: user._id,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
        profile,
      },
    }
  );
});

/**
 * LOGOUT - Clear cookies and invalidate refresh token
 *
 * Removes refresh token from database and clears both cookies.
 * User must login again to get new tokens.
 *
 * Route: POST /api/auth/logout
 * Access: Private (requires authentication)
 * Middleware: authenticate
 *
 * @param {Object} req.user - User info from authenticate middleware
 * @param {Object} req.cookies - Cookies from request
 *
 * @example
 * POST /api/auth/logout
 * Cookies: accessToken, refreshToken (sent automatically by browser)
 */
export const logout = asyncHandler(async (req, res) => {
  // Get refresh token from cookie
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    // Find user and remove refresh token from database
    const user = await User.findById(req.user.userId);

    if (user) {
      user.removeRefreshToken(refreshToken);
      await user.save();
    }
  }

  // Clear both cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

  return sendSuccess(
    res,
    HTTP_STATUS.OK,
    'Logged out successfully (authController.js)'
  );
});

/**
 * REFRESH - Get new access token using refresh token
 *
 * Verifies refresh token, checks if it exists in database,
 * generates new access token, and updates cookie.
 *
 * Route: POST /api/auth/refresh
 * Access: Public (no authentication required, but needs refresh token)
 *
 * @param {Object} req.cookies - Cookies from request
 * @param {String} req.cookies.refreshToken - Refresh token from cookie
 *
 * @example
 * POST /api/auth/refresh
 * Cookies: refreshToken (sent automatically by browser)
 *
 * Response sets new accessToken cookie
 */
export const refreshAccessToken = asyncHandler(async (req, res) => {
  // Get refresh token from cookie
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return sendError(
      res,
      HTTP_STATUS.UNAUTHORIZED,
      'Refresh token is required. Please login again (authController.js)'
    );
  }

  // Verify refresh token signature and decode payload
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    // Clear invalid refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return sendError(
      res,
      HTTP_STATUS.UNAUTHORIZED,
      `Invalid or expired refresh token: ${error.message}. Please login again (authController.js)`
    );
  }

  // Find user and check if refresh token exists in database
  const user = await User.findById(decoded.userId);

  if (!user) {
    return sendError(
      res,
      HTTP_STATUS.UNAUTHORIZED,
      'User not found. Please login again (authController.js)'
    );
  }

  // Check if user is active
  if (!user.isActive) {
    return sendError(
      res,
      HTTP_STATUS.FORBIDDEN,
      'Your account has been deactivated. Please contact administrator (authController.js)'
    );
  }

  // Check if refresh token exists in user's refreshTokens array
  const tokenExists = user.refreshTokens.some(
    rt => rt.token === refreshToken && new Date(rt.expiresAt) > new Date()
  );

  if (!tokenExists) {
    // Token was revoked or expired in database
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return sendError(
      res,
      HTTP_STATUS.UNAUTHORIZED,
      'Refresh token has been revoked or expired. Please login again (authController.js)'
    );
  }

  // Generate new access token
  const newAccessToken = generateAccessToken({
    userId: user._id,
    role: user.role,
  });

  // Set new access token cookie
  res.cookie('accessToken', newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });

  return sendSuccess(
    res,
    HTTP_STATUS.OK,
    'Access token refreshed successfully (authController.js)',
    {
      message: 'New access token has been set in cookie',
    }
  );
});

/**
 * GET CURRENT USER - Get logged-in user's profile
 *
 * Returns complete user information including role-specific profile.
 * Used by frontend to check if user is still logged in after page refresh.
 *
 * Route: GET /api/auth/me
 * Access: Private (requires authentication)
 * Middleware: authenticate
 *
 * @param {Object} req.user - User info from authenticate middleware
 *
 * @example
 * GET /api/auth/me
 * Cookies: accessToken (sent automatically by browser)
 */
export const getProfile = asyncHandler(async (req, res) => {
  // Find user (req.user.userId comes from authenticate middleware)
  const user = await User.findById(req.user.userId).select('-password');

  if (!user) {
    return sendError(
      res,
      HTTP_STATUS.NOT_FOUND,
      'User not found (authController.js)'
    );
  }

  // Fetch role-specific profile
  let profile = null;

  if (user.role === USER_ROLES.STUDENT) {
    const student = await Student.findOne({ userId: user._id }).populate(
      'enrolledSubjects.subjectId',
      'subjectCode subjectName credits'
    );

    if (student) {
      profile = {
        studentId: student._id,
        prn: student.prn,
        srn: student.srn,
        name: student.name,
        branch: student.branch,
        semester: student.currentSemester,
        section: student.section,
        enrolledSubjects: student.enrolledSubjects.map(enrollment => ({
          subjectId: enrollment.subjectId._id,
          subjectCode: enrollment.subjectId.subjectCode,
          subjectName: enrollment.subjectId.subjectName,
          credits: enrollment.subjectId.credits,
          semesterNumber: enrollment.semesterNumber,
        })),
      };
    }
  } else if (user.role === USER_ROLES.TEACHER) {
    const teacher = await Teacher.findOne({ userId: user._id }).populate(
      'assignedSubjects.subjectId',
      'subjectCode subjectName'
    );

    if (teacher) {
      profile = {
        teacherId: teacher.teacherId,
        name: teacher.name,
        department: teacher.department,
        assignedSubjects: teacher.assignedSubjects.map(assignment => ({
          subjectId: assignment.subjectId._id,
          subjectCode: assignment.subjectId.subjectCode,
          subjectName: assignment.subjectId.subjectName,
          semester: assignment.semester,
          branch: assignment.branch,
          section: assignment.section,
        })),
      };
    }
  } else if (user.role === USER_ROLES.ADMIN) {
    profile = {
      name: 'Administrator',
    };
  }

  return sendSuccess(
    res,
    HTTP_STATUS.OK,
    'User profile retrieved successfully (authController.js)',
    {
      user: {
        userId: user._id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        profile,
      },
    }
  );
});
