import express from 'express';
import {
  markAttendance,
  viewAttendanceRecords,
  editAttendanceRecord,
  getAssignedClasses,
  getClassStudents,
} from '../controllers/teacherController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { teacherOrAdmin } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';

const router = express.Router();

/**
 * ============================================================================
 * TEACHER ROUTES
 * ============================================================================
 * 
 * All routes require authentication and teacher/admin role.
 * 
 * Routes:
 * - POST   /api/teachers/attendance - Mark attendance for a class
 * - GET    /api/teachers/attendance - View attendance records (with filters)
 * - PATCH  /api/teachers/attendance/:recordId - Edit existing attendance record
 * - GET    /api/teachers/classes - Get teacher's assigned classes
 * - GET    /api/teachers/class-students/:classSectionId - Get students in a class
 * ============================================================================
 */

// ============================================================================
// ATTENDANCE MANAGEMENT
// ============================================================================

/**
 * @route   POST /api/teachers/attendance
 * @desc    Mark attendance for a class session
 * @access  Private (Teacher/Admin only)
 * @middleware authenticate - Verifies JWT access token
 * @middleware teacherOrAdmin - Checks user has teacher or admin role
 * @middleware validate - Validates attendance data
 * 
 * @example
 * POST /api/teachers/attendance
 * Body: {
 *   classSectionId, date, startTime, endTime, numSessions, attendance: [...]
 * }
 */
router.post(
  '/attendance',
  authenticate,
  teacherOrAdmin,
  validate,
  markAttendance
);

/**
 * @route   GET /api/teachers/attendance
 * @desc    View attendance records with optional filters
 * @access  Private (Teacher/Admin only)
 * @middleware authenticate - Verifies JWT access token
 * @middleware teacherOrAdmin - Checks user has teacher or admin role
 * 
 * @query classSectionId - Filter by class section
 * @query subjectId - Filter by subject
 * @query startDate - Filter by start date (DD-MM-YYYY)
 * @query endDate - Filter by end date (DD-MM-YYYY)
 * @query page - Page number for pagination
 * @query limit - Records per page
 * 
 * @example GET /api/teachers/attendance?classSectionId=64abc...&page=1&limit=20
 */
router.get(
  '/attendance',
  authenticate,
  teacherOrAdmin,
  viewAttendanceRecords
);

/**
 * @route   PATCH /api/teachers/attendance/:recordId
 * @desc    Edit an existing attendance record
 * @access  Private (Teacher/Admin only)
 * @middleware authenticate - Verifies JWT access token
 * @middleware teacherOrAdmin - Checks user has teacher or admin role
 * 
 * @example
 * PATCH /api/teachers/attendance/ATT_07112025_MAT101_SEM3_SECA_001
 * Body: { attendance: [...], isFinalized: true }
 */
router.patch(
  '/attendance/:recordId',
  authenticate,
  teacherOrAdmin,
  editAttendanceRecord
);

// ============================================================================
// CLASS MANAGEMENT
// ============================================================================

/**
 * @route   GET /api/teachers/classes
 * @desc    Get all class sections assigned to the logged-in teacher
 * @access  Private (Teacher/Admin only)
 * @middleware authenticate - Verifies JWT access token
 * @middleware teacherOrAdmin - Checks user has teacher or admin role
 * 
 * @example GET /api/teachers/classes
 */
router.get(
  '/classes',
  authenticate,
  teacherOrAdmin,
  getAssignedClasses
);

/**
 * @route   GET /api/teachers/class-students/:classSectionId
 * @desc    Get list of students in a specific class section
 * @access  Private (Teacher/Admin only)
 * @middleware authenticate - Verifies JWT access token
 * @middleware teacherOrAdmin - Checks user has teacher or admin role
 * 
 * @example GET /api/teachers/class-students/64abc123...
 */
router.get(
  '/class-students/:classSectionId',
  authenticate,
  teacherOrAdmin,
  getClassStudents
);

export default router;