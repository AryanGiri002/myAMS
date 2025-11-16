import express from 'express';
import {
  signup,
  login,
  logout,
  refreshAccessToken,
  getProfile,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  validate,
} from '../middleware/validationMiddleware.js';

const router = express.Router();

/**
 * ============================================================================
 * AUTHENTICATION ROUTES
 * ============================================================================
 * 
 * Public routes (no authentication required):
 * - POST /api/auth/signup - Register new user
 * - POST /api/auth/login - Login user
 * - POST /api/auth/refresh - Refresh access token
 * 
 * Protected routes (authentication required):
 * - POST /api/auth/logout - Logout user
 * - GET /api/auth/profile - Get user profile
 * ============================================================================
 */

// ============================================================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================================================

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user (student/teacher/admin)
 * @access  Public
 * @middleware validateRegister - Validates registration data
 */
router.post('/signup',validate, signup);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return access + refresh tokens
 * @access  Public
 * @middleware validateLogin - Validates login credentials
 */
router.post('/login',validate, login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public (but requires valid refresh token in cookie)
 */
router.post('/refresh', refreshAccessToken);

// ============================================================================
// PROTECTED ROUTES (Authentication Required)
// ============================================================================

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate refresh token
 * @access  Private (requires authentication)
 * @middleware authenticate - Verifies JWT access token
 */
router.post('/logout', authenticate, logout);

/**
 * @route   GET /api/auth/profile
 * @desc    Get logged-in user's profile
 * @access  Private (requires authentication)
 * @middleware authenticate - Verifies JWT access token
 */
router.get('/profile', authenticate, getProfile);

export default router;