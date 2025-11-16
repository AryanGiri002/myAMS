import express from 'express';
import {
  getAttendanceBySubject,
  getStudentDashboard,
} from '../controllers/studentController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { studentOrAdmin } from '../middleware/roleMiddleware.js';

const router = express.Router();

/**
 * ============================================================================
 * STUDENT ROUTES
 * ============================================================================
 * 
 * All routes require authentication and student/admin role.
 * 
 * Routes:
 * - GET /api/students/attendance/subject/:subjectId - Get attendance for a subject
 * - GET /api/students/attendance/overall - Get overall attendance across all subjects
 * ============================================================================
 */

// ============================================================================
// ATTENDANCE ROUTES
// ============================================================================

/**
 * @route   GET /api/students/attendance/subject/:subjectId
 * @desc    Get student's attendance for a specific subject
 * @access  Private (Student/Admin only)
 * @middleware authenticate - Verifies JWT access token
 * @middleware studentOrAdmin - Checks user has student or admin role
 * 
 * @example GET /api/students/attendance/subject/64abc123...
 */
router.get(
  '/attendance/subject/:subjectId',
  authenticate,
  studentOrAdmin,
  getAttendanceBySubject
);

/**
 * @route   GET /api/students/attendance/overall
 * @desc    Get student's overall attendance across all enrolled subjects
 * @access  Private (Student/Admin only)
 * @middleware authenticate - Verifies JWT access token
 * @middleware studentOrAdmin - Checks user has student or admin role
 * 
 * @example GET /api/students/attendance/dashboard
 */
router.get(
  '/attendance/dashboard',
  authenticate,
  studentOrAdmin,
  getStudentDashboard
);

export default router;