import express from 'express';
import {
  // User Management
  getAllUsers,
  getUserById,
  deactivateUser,
  activateUser,
  deleteUser,
  
  // Subject Management
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  
  // Enrollment Management
  enrollStudent,
  removeEnrollment,
  bulkEnrollStudents,
  
  // Class Section Management
  createClassSection,
  getAllClassSections,
  updateClassSection,
  addStudentToSection,
  bulkAddStudentsToSection,
  removeStudentFromSection,
  deleteClassSection,
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validationMiddleware.js';

const router = express.Router();

/**
 * ============================================================================
 * ADMIN ROUTES
 * ============================================================================
 * 
 * All routes require authentication and admin role.
 * 
 * USER MANAGEMENT (5 routes):
 * - GET    /api/admin/users - Get all users
 * - GET    /api/admin/users/:userId - Get user by ID
 * - PATCH  /api/admin/users/:userId/deactivate - Deactivate user
 * - PATCH  /api/admin/users/:userId/activate - Activate user
 * - DELETE /api/admin/users/:userId - Delete user
 * 
 * SUBJECT MANAGEMENT (5 routes):
 * - POST   /api/admin/subjects - Create subject
 * - GET    /api/admin/subjects - Get all subjects
 * - GET    /api/admin/subjects/:subjectId - Get subject by ID
 * - PATCH  /api/admin/subjects/:subjectId - Update subject
 * - DELETE /api/admin/subjects/:subjectId - Delete subject
 * 
 * ENROLLMENT MANAGEMENT (3 routes):
 * - POST   /api/admin/students/:studentId/enroll - Enroll student
 * - DELETE /api/admin/students/:studentId/enroll/:subjectId - Remove enrollment
 * - POST   /api/admin/subjects/:subjectId/enroll-bulk - Bulk enroll
 * 
 * CLASS SECTION MANAGEMENT (7 routes):
 * - POST   /api/admin/class-sections - Create class section
 * - GET    /api/admin/class-sections - Get all class sections
 * - PATCH  /api/admin/class-sections/:classSectionId - Update class section
 * - POST   /api/admin/class-sections/:classSectionId/add-student - Add student
 * - POST   /api/admin/class-sections/:classSectionId/add-students - Bulk add students
 * - DELETE /api/admin/class-sections/:classSectionId/students/:studentId - Remove student
 * - DELETE /api/admin/class-sections/:classSectionId - Delete class section
 * ============================================================================
 */

// ============================================================================
// USER MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with optional filters
 * @access  Private (Admin only)
 * @query role - Filter by role (student/teacher/admin)
 * @query isActive - Filter by active status (true/false)
 * @query page - Page number
 * @query limit - Records per page
 */
router.get('/users', authenticate, adminOnly, getAllUsers);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    Get detailed user information by ID
 * @access  Private (Admin only)
 */
router.get('/users/:userId', authenticate, adminOnly, getUserById);

/**
 * @route   PATCH /api/admin/users/:userId/deactivate
 * @desc    Deactivate a user account (soft delete)
 * @access  Private (Admin only)
 */
router.patch('/users/:userId/deactivate', authenticate, adminOnly, deactivateUser);

/**
 * @route   PATCH /api/admin/users/:userId/activate
 * @desc    Activate a deactivated user account
 * @access  Private (Admin only)
 */
router.patch('/users/:userId/activate', authenticate, adminOnly, activateUser);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Permanently delete a user (cascade delete)
 * @access  Private (Admin only)
 */
router.delete('/users/:userId', authenticate, adminOnly, deleteUser);

// ============================================================================
// SUBJECT MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   POST /api/admin/subjects
 * @desc    Create a new subject
 * @access  Private (Admin only)
 * @middleware validateCreateSubject - Validates subject data
 */
router.post('/subjects', authenticate, adminOnly, validate, createSubject);

/**
 * @route   GET /api/admin/subjects
 * @desc    Get all subjects with optional filters
 * @access  Private (Admin only)
 * @query branch - Filter by branch
 * @query semester - Filter by semester
 * @query isActive - Filter by active status
 */
router.get('/subjects', authenticate, adminOnly, getAllSubjects);

/**
 * @route   GET /api/admin/subjects/:subjectId
 * @desc    Get detailed subject information by ID
 * @access  Private (Admin only)
 */
router.get('/subjects/:subjectId', authenticate, adminOnly, getSubjectById);

/**
 * @route   PATCH /api/admin/subjects/:subjectId
 * @desc    Update subject information
 * @access  Private (Admin only)
 */
router.patch('/subjects/:subjectId', authenticate, adminOnly, updateSubject);

/**
 * @route   DELETE /api/admin/subjects/:subjectId
 * @desc    Soft delete a subject (set isActive to false)
 * @access  Private (Admin only)
 */
router.delete('/subjects/:subjectId', authenticate, adminOnly, deleteSubject);

// ============================================================================
// ENROLLMENT MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   POST /api/admin/students/:studentId/enroll
 * @desc    Enroll a student in a subject
 * @access  Private (Admin only)
 * @middleware validateEnrollStudent - Validates enrollment data
 */
router.post(
  '/students/:studentId/enroll',
  authenticate,
  adminOnly,
  validate,
  enrollStudent
);

/**
 * @route   DELETE /api/admin/students/:studentId/enroll/:subjectId
 * @desc    Remove student's enrollment from a subject
 * @access  Private (Admin only)
 */
router.delete(
  '/students/:studentId/enroll/:subjectId',
  authenticate,
  adminOnly,
  removeEnrollment
);

/**
 * @route   POST /api/admin/subjects/:subjectId/enroll-bulk
 * @desc    Bulk enroll multiple students in a subject
 * @access  Private (Admin only)
 */
router.post(
  '/subjects/:subjectId/enroll-bulk',
  authenticate,
  adminOnly,
  bulkEnrollStudents
);

// ============================================================================
// CLASS SECTION MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   POST /api/admin/class-sections
 * @desc    Create a new class section
 * @access  Private (Admin only)
 * @middleware validateCreateClassSection - Validates class section data
 */
router.post(
  '/class-sections',
  authenticate,
  adminOnly,
  validate,
  createClassSection
);

/**
 * @route   GET /api/admin/class-sections
 * @desc    Get all class sections with optional filters
 * @access  Private (Admin only)
 * @query branch - Filter by branch
 * @query semester - Filter by semester
 * @query subjectId - Filter by subject
 */
router.get('/class-sections', authenticate, adminOnly, getAllClassSections);

/**
 * @route   PATCH /api/admin/class-sections/:classSectionId
 * @desc    Update class section information
 * @access  Private (Admin only)
 */
router.patch(
  '/class-sections/:classSectionId',
  authenticate,
  adminOnly,
  updateClassSection
);

/**
 * @route   POST /api/admin/class-sections/:classSectionId/add-student
 * @desc    Add a single student to a class section
 * @access  Private (Admin only)
 */
router.post(
  '/class-sections/:classSectionId/add-student',
  authenticate,
  adminOnly,
  addStudentToSection
);

/**
 * @route   POST /api/admin/class-sections/:classSectionId/add-students
 * @desc    Bulk add multiple students to a class section
 * @access  Private (Admin only)
 */
router.post(
  '/class-sections/:classSectionId/add-students',
  authenticate,
  adminOnly,
  bulkAddStudentsToSection
);

/**
 * @route   DELETE /api/admin/class-sections/:classSectionId/students/:studentId
 * @desc    Remove a student from a class section
 * @access  Private (Admin only)
 */
router.delete(
  '/class-sections/:classSectionId/students/:studentId',
  authenticate,
  adminOnly,
  removeStudentFromSection
);

/**
 * @route   DELETE /api/admin/class-sections/:classSectionId
 * @desc    Soft delete a class section
 * @access  Private (Admin only)
 */
router.delete(
  '/class-sections/:classSectionId',
  authenticate,
  adminOnly,
  deleteClassSection
);

export default router;