  import { asyncHandler } from '../utils/asyncHandler.js';
  import { sendSuccess, sendError } from '../utils/responseFormatter.js';
  import { validatePassword } from '../utils/validators.js';
  import { HTTP_STATUS, USER_ROLES } from '../config/constants.js';
  import User from '../models/User.model.js';
  import Student from '../models/Student.model.js';
  import Teacher from '../models/Teacher.model.js';
  import Subject from '../models/Subject.model.js';
  import ClassSection from '../models/ClassSection.model.js';

  /**
   * ============================================================================
   * ADMIN CONTROLLER
   * ============================================================================
   * 
   * Handles all administrative operations for the attendance management system.
   * Only admins can access these endpoints.
   * 
   * ENDPOINTS:
   * USER MANAGEMENT:
   * 1. GET    /api/admin/users                    - Get all users (with filters)
   * 2. GET    /api/admin/users/:userId            - Get user by ID
   * 3. PATCH  /api/admin/users/:userId/deactivate - Deactivate user account
   * 4. PATCH  /api/admin/users/:userId/activate   - Activate user account
   * 5. DELETE /api/admin/users/:userId            - Delete user (cascade delete)
   * 
   * SUBJECT MANAGEMENT:
   * 6. POST   /api/admin/subjects                 - Create new subject
   * 7. GET    /api/admin/subjects                 - Get all subjects (with filters)
   * 8. GET    /api/admin/subjects/:subjectId      - Get subject by ID
   * 9. PATCH  /api/admin/subjects/:subjectId      - Update subject
   * 10. DELETE /api/admin/subjects/:subjectId     - Delete subject (soft delete)
   * 
   * ENROLLMENT MANAGEMENT:
   * 11. POST  /api/admin/students/:studentId/enroll         - Enroll student in subject
   * 12. DELETE /api/admin/students/:studentId/enroll/:subjectId - Remove enrollment
   * 13. POST  /api/admin/subjects/:subjectId/enroll-bulk    - Bulk enroll students
   * 
   * CLASS SECTION MANAGEMENT:
   * 14. POST  /api/admin/class-sections                     - Create class section
   * 15. GET   /api/admin/class-sections                     - Get all class sections
   * 16. PATCH /api/admin/class-sections/:classSectionId     - Update class section
   * 17. POST  /api/admin/class-sections/:classSectionId/add-student    - Add student to section
   * 18. POST  /api/admin/class-sections/:classSectionId/add-students   - Bulk add students
   * 19. DELETE /api/admin/class-sections/:classSectionId/students/:studentId - Remove student
   * 20. DELETE /api/admin/class-sections/:classSectionId    - Delete class section (soft delete)
   * 
   * AUTHENTICATION:
   * - All routes require authentication (authenticate middleware)
   * - All routes require admin role (adminOnly middleware)
   * ============================================================================
   */

  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  /**
   * GET ALL USERS
   * 
   * Retrieves list of all users with optional filtering by role.
   * Includes pagination support.
   * 
   * Route: GET /api/admin/users
   * Access: Admin only
   * 
   * @param {String} req.query.role - Optional: Filter by role (student/teacher/admin)
   * @param {String} req.query.isActive - Optional: Filter by active status (true/false)
   * @param {Number} req.query.page - Optional: Page number (default: 1)
   * @param {Number} req.query.limit - Optional: Records per page (default: 50)
   */
  export const getAllUsers = asyncHandler(async (req, res) => {
    const { role, isActive, page = 1, limit = 50 } = req.query;

    // Build query
    const query = {};

    if (role) {
      // Sanitize input
      const trimmedRole = role.trim();
      if (!Object.values(USER_ROLES).includes(trimmedRole)) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          `Query parameter "role" has invalid value. Must be one of: ${Object.values(USER_ROLES).join(', ')} (adminController.js)`
        );
      }
      query.role = trimmedRole;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const totalUsers = await User.countDocuments(query);

    // Fetch users
    const users = await User.find(query)
      .select('-password -refreshTokens') // Exclude sensitive fields
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Fetch role-specific profiles
    const usersWithProfiles = await Promise.all(
      users.map(async (user) => {
        let profile = null;

        if (user.role === USER_ROLES.STUDENT) {
          const student = await Student.findOne({ userId: user._id }).select('prn srn name branch currentSemester section');
          if (student) {
            profile = {
              studentId: student._id,
              prn: student.prn,
              srn: student.srn,
              name: student.name,
              branch: student.branch,
              semester: student.currentSemester,
              section: student.section,
            };
          }
        } else if (user.role === USER_ROLES.TEACHER) {
          const teacher = await Teacher.findOne({ userId: user._id }).select('teacherId name department');
          if (teacher) {
            profile = {
              teacherId: teacher.teacherId,
              name: teacher.name,
              department: teacher.department,
            };
          }
        }

        return {
          userId: user._id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          profile,
        };
      })
    );

    console.log(`📋 Admin retrieved ${usersWithProfiles.length} users (adminController.js)`);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      'Users retrieved successfully (adminController.js)',
      {
        users: usersWithProfiles,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalUsers / limitNum),
          totalUsers,
          usersPerPage: limitNum,
          hasNextPage: pageNum < Math.ceil(totalUsers / limitNum),
          hasPrevPage: pageNum > 1,
        },
      }
    );
  });

  /**
   * GET USER BY ID
   * 
   * Retrieves detailed information about a specific user.
   * 
   * Route: GET /api/admin/users/:userId
   * Access: Admin only
   */
  export const getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password -refreshTokens');

    if (!user) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        'User not found (adminController.js)'
      );
    }

    // Fetch role-specific profile with detailed information
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
          enrolledSubjects: student.enrolledSubjects.map((enrollment) => ({
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
          assignedSubjects: teacher.assignedSubjects.map((assignment) => ({
            subjectId: assignment.subjectId._id,
            subjectCode: assignment.subjectId.subjectCode,
            subjectName: assignment.subjectId.subjectName,
            semester: assignment.semester,
            branch: assignment.branch,
            section: assignment.section,
          })),
        };
      }
    }

    console.log(`👤 Admin retrieved user details for ${user.email} (adminController.js)`);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      'User details retrieved successfully (adminController.js)',
      {
        user: {
          userId: user._id,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          profile,
        },
      }
    );
  });

  /**
   * DEACTIVATE USER
   * 
   * Deactivates a user account (prevents login but preserves data).
   * 
   * Route: PATCH /api/admin/users/:userId/deactivate
   * Access: Admin only
   */
  export const deactivateUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        'User not found (adminController.js)'
      );
    }

    // Prevent deactivating admin accounts (safety measure)
    if (user.role === USER_ROLES.ADMIN) {
      return sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        'Cannot deactivate admin accounts (adminController.js)'
      );
    }

    if (!user.isActive) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'User account is already deactivated (adminController.js)'
      );
    }

    user.isActive = false;
    await user.save();

    console.log(`⚠️  User ${user.email} (${user.role}) deactivated by admin (adminController.js)`);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      'User account deactivated successfully (adminController.js)',
      {
        userId: user._id,
        email: user.email,
        isActive: user.isActive,
      }
    );
  });

  /**
   * ACTIVATE USER
   * 
   * Reactivates a deactivated user account.
   * 
   * Route: PATCH /api/admin/users/:userId/activate
   * Access: Admin only
   */
  export const activateUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        'User not found (adminController.js)'
      );
    }

    if (user.isActive) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'User account is already active (adminController.js)'
      );
    }

    user.isActive = true;
    await user.save();

    console.log(`✅ User ${user.email} (${user.role}) activated by admin (adminController.js)`);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      'User account activated successfully (adminController.js)',
      {
        userId: user._id,
        email: user.email,
        isActive: user.isActive,
      }
    );
  });

  /**
   * DELETE USER
   * 
   * Permanently deletes a user and their associated profile.
   * Uses cascade delete from User model.
   * 
   * Route: DELETE /api/admin/users/:userId
   * Access: Admin only
   */
  export const deleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        'User not found (adminController.js)'
      );
    }

    // Prevent deleting admin accounts (safety measure)
    if (user.role === USER_ROLES.ADMIN) {
      return sendError(
        res,
        HTTP_STATUS.FORBIDDEN,
        'Cannot delete admin accounts (adminController.js)'
      );
    }

    const userEmail = user.email;
    const userRole = user.role;

    // Delete user (cascade delete will handle Student/Teacher profiles)
    await user.deleteOne();

    console.log(`🗑️  User ${userEmail} (${userRole}) deleted by admin (adminController.js)`);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      'User deleted successfully (adminController.js)',
      {
        deletedUser: {
          email: userEmail,
          role: userRole,
        },
      }
    );
  });

  // ============================================================================
  // SUBJECT MANAGEMENT
  // ============================================================================

  /**
   * CREATE SUBJECT
   * 
   * Creates a new subject/course.
   * 
   * Route: POST /api/admin/subjects
   * Access: Admin only
   */
  export const createSubject = asyncHandler(async (req, res) => {
    const { subjectCode, subjectName, branch, semester, credits, description } = req.body;

    // Validate required fields
    if (!subjectCode || !subjectName || !branch || !semester || !credits) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'Missing required fields: subjectCode, subjectName, branch, semester, credits (adminController.js)'
      );
    }

    // Check if subject code already exists
    const existingSubject = await Subject.findOne({ subjectCode: subjectCode.trim().toUpperCase() });

    if (existingSubject) {
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        `Subject with code ${subjectCode.trim().toUpperCase()} already exists (adminController.js)`
      );
    }

    // Create subject
    const subject = await Subject.create({
      subjectCode: subjectCode.trim().toUpperCase(),
      subjectName: subjectName.trim(),
      branch: branch.trim().toUpperCase(),
      semester,
      credits,
      description: description?.trim() || '',
    });

    console.log(`✅ Subject ${subject.subjectCode} created by admin (adminController.js)`);

    return sendSuccess(
      res,
      HTTP_STATUS.CREATED,
      'Subject created successfully (adminController.js)',
      {
        subject: {
          subjectId: subject._id,
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          branch: subject.branch,
          semester: subject.semester,
          credits: subject.credits,
          description: subject.description,
        },
      }
    );
  });

  /**
   * GET ALL SUBJECTS
   * 
   * Retrieves all subjects with optional filtering.
   * 
   * Route: GET /api/admin/subjects
   * Access: Admin only
   */
  export const getAllSubjects = asyncHandler(async (req, res) => {
    const { branch, semester, isActive } = req.query;

    // Build query
    const query = {};

    if (branch) {
      query.branch = branch.trim().toUpperCase();  // FIX #5: Added trim()
    }

    if (semester) {
      query.semester = parseInt(semester);
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const subjects = await Subject.find(query).sort({ branch: 1, semester: 1, subjectCode: 1 });

    console.log(`📚 Admin retrieved ${subjects.length} subjects (adminController.js)`);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      'Subjects retrieved successfully (adminController.js)',
      {
        subjects: subjects.map((subject) => ({
          subjectId: subject._id,
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          branch: subject.branch,
          semester: subject.semester,
          credits: subject.credits,
          description: subject.description,
          isActive: subject.isActive,
        })),
        totalSubjects: subjects.length,
      }
    );
  });

  /**
   * GET SUBJECT BY ID
   * 
   * Retrieves detailed information about a specific subject.
   * 
   * Route: GET /api/admin/subjects/:subjectId
   * Access: Admin only
   */
  export const getSubjectById = asyncHandler(async (req, res) => {
    const { subjectId } = req.params;

    const subject = await Subject.findById(subjectId);

    if (!subject) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        'Subject not found (adminController.js)'
      );
    }

    // Get enrollment count
    const enrollmentCount = await Student.countDocuments({
      'enrolledSubjects.subjectId': subjectId,
    });

    // Get class sections for this subject
    const classSections = await ClassSection.find({
      subjectId,
      isDeleted: false,
    }).select('sectionName semester branch academicYear');

    console.log(`📖 Admin retrieved subject details for ${subject.subjectCode} (adminController.js)`);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      'Subject details retrieved successfully (adminController.js)',
      {
        subject: {
          subjectId: subject._id,
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          branch: subject.branch,
          semester: subject.semester,
          credits: subject.credits,
          description: subject.description,
          isActive: subject.isActive,
          enrolledStudents: enrollmentCount,
          classSections: classSections.map((cs) => ({
            classSectionId: cs._id,
            sectionName: cs.sectionName,
            semester: cs.semester,
            branch: cs.branch,
            academicYear: cs.academicYear,
          })),
        },
      }
    );
  });

  /**
   * UPDATE SUBJECT
   * 
   * Updates subject information.
   * 
   * Note: subjectCode, branch, and semester cannot be updated.
   * These are core identifiers used in attendance records and class sections.
   * Changing them would break historical data integrity.
   * 
   * Route: PATCH /api/admin/subjects/:subjectId
   * Access: Admin only
   */
  export const updateSubject = asyncHandler(async (req, res) => {
    const { subjectId } = req.params;
    const { subjectName, credits, description, isActive } = req.body;

    const subject = await Subject.findById(subjectId);

    if (!subject) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        'Subject not found (adminController.js)'
      );
    }

    // Update fields if provided
    if (subjectName) subject.subjectName = subjectName.trim();
    if (credits !== undefined) subject.credits = credits;
    if (description !== undefined) subject.description = description.trim();
    if (isActive !== undefined) subject.isActive = isActive;

    await subject.save();

    console.log(`✅ Subject ${subject.subjectCode} updated by admin (adminController.js)`);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      'Subject updated successfully (adminController.js)',
      {
        subject: {
          subjectId: subject._id,
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          branch: subject.branch,
          semester: subject.semester,
          credits: subject.credits,
          description: subject.description,
          isActive: subject.isActive,
        },
      }
    );
  });

  /**
   * DELETE SUBJECT
   * 
   * Soft deletes a subject (sets isActive to false).
   * 
   * Route: DELETE /api/admin/subjects/:subjectId
   * Access: Admin only
   */
  export const deleteSubject = asyncHandler(async (req, res) => {
    const { subjectId } = req.params;

    const subject = await Subject.findById(subjectId);

    if (!subject) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        'Subject not found (adminController.js)'
      );
    }

    subject.isActive = false;
    await subject.save();

    console.log(`🗑️  Subject ${subject.subjectCode} soft deleted by admin (adminController.js)`);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      'Subject deleted successfully (adminController.js)',
      {
        subjectId: subject._id,
        subjectCode: subject.subjectCode,
        isActive: subject.isActive,
      }
    );
  });

  // ============================================================================
  // ENROLLMENT MANAGEMENT
  // ============================================================================

  /**
   * ENROLL STUDENT IN SUBJECT
   * 
   * Enrolls a student in a specific subject.
   * 
   * Route: POST /api/admin/students/:studentId/enroll
   * Access: Admin only
   */
  export const enrollStudent = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const { subjectId, semesterNumber } = req.body;

    if (!subjectId || !semesterNumber) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'Missing required fields: subjectId, semesterNumber (adminController.js)'
      );
    }

    const student = await Student.findById(studentId);

    if (!student) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        'Student not found (adminController.js)'
      );
    }

    const subject = await Subject.findById(subjectId);

    if (!subject) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        'Subject not found (adminController.js)'
      );
    }

    if (!subject.isActive) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'Cannot enroll in inactive subject (adminController.js)'
      );
    }

    // Check if already enrolled
    const isEnrolled = student.enrolledSubjects.some(
      (enrollment) => enrollment.subjectId.toString() === subjectId
    );

    if (isEnrolled) {
      return sendError(
        res,
        HTTP_STATUS.CONFLICT,
        `Student ${student.name} is already enrolled in ${subject.subjectCode} (adminController.js)`
      );
    }

    // Enroll student
    student.enrollInSubject(subjectId, semesterNumber);
    await student.save();

    console.log(`✅ Student ${student.prn} enrolled in ${subject.subjectCode} by admin (adminController.js)`);

    return sendSuccess(
      res,
      HTTP_STATUS.CREATED,
      'Student enrolled successfully (adminController.js)',
      {
        student: {
          studentId: student._id,
          prn: student.prn,
          name: student.name,
        },
        subject: {
          subjectId: subject._id,
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
        },
        semesterNumber,
      }
    );
  });

  /**
   * REMOVE STUDENT ENROLLMENT
   * 
   * Removes a student's enrollment from a subject.
   * 
   * Route: DELETE /api/admin/students/:studentId/enroll/:subjectId
   * Access: Admin only
   */
  export const removeEnrollment = asyncHandler(async (req, res) => {
    const { studentId, subjectId } = req.params;

    const student = await Student.findById(studentId);

    if (!student) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        'Student not found (adminController.js)'
      );
    }

    const subject = await Subject.findById(subjectId);

    if (!subject) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        'Subject not found (adminController.js)'
      );
    }

    // Remove enrollment
    student.unenrollFromSubject(subjectId);
    await student.save();

    console.log(`🗑️  Student ${student.prn} unenrolled from ${subject.subjectCode} by admin (adminController.js)`);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      'Student unenrolled successfully (adminController.js)',
      {
        student: {
          studentId: student._id,
          prn: student.prn,
          name: student.name,
        },
        subject: {
          subjectId: subject._id,
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
        },
      }
    );
  });

  /**
   * BULK ENROLL STUDENTS
   * 
   * Enrolls multiple students in a subject at once.
   * 
   * Route: POST /api/admin/subjects/:subjectId/enroll-bulk
   * Access: Admin only
   */
  export const bulkEnrollStudents = asyncHandler(async (req, res) => {
    const { subjectId } = req.params;
    const { studentIds, semesterNumber } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'Field "studentIds" must be a non-empty array (adminController.js)'
      );
    }

    if (!semesterNumber) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'Field "semesterNumber" is required (adminController.js)'
      );
    }

    const subject = await Subject.findById(subjectId);

    if (!subject) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        'Subject not found (adminController.js)'
      );
    }

    if (!subject.isActive) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'Cannot enroll in inactive subject (adminController.js)'
      );
    }

    const results = {
      enrolled: [],
      alreadyEnrolled: [],
      notFound: [],
    };

    for (const studentId of studentIds) {
      const student = await Student.findById(studentId);

      if (!student) {
        // FIX #7: Make response data consistent
        results.notFound.push({ studentId });
        continue;
      }

      // Check if already enrolled
      const isEnrolled = student.enrolledSubjects.some(
        (enrollment) => enrollment.subjectId.toString() === subjectId
      );

      if (isEnrolled) {
        // FIX #7: Add name to alreadyEnrolled
        results.alreadyEnrolled.push({ 
          studentId: student._id, 
          prn: student.prn, 
          name: student.name 
        });
        continue;
      }

      // Enroll student
      student.enrollInSubject(subjectId, semesterNumber);
      await student.save();

      results.enrolled.push({ studentId: student._id, prn: student.prn, name: student.name });
    }

    console.log(`✅ Bulk enrollment: ${results.enrolled.length} students enrolled in ${subject.subjectCode} by admin (adminController.js)`);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      'Bulk enrollment completed (adminController.js)',
      {
        subject: {
          subjectId: subject._id,
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
        },
        results: {
          totalProcessed: studentIds.length,
          enrolled: results.enrolled,
          alreadyEnrolled: results.alreadyEnrolled,
          notFound: results.notFound,
        },
      }
    );
  });

  // ============================================================================
  // CLASS SECTION MANAGEMENT
  // ============================================================================

  /**
   * CREATE CLASS SECTION
   * 
   * Creates a new class section (subject + teacher + students group).
   * 
   * Route: POST /api/admin/class-sections
   * Access: Admin only
   */

/**
 * CREATE CLASS SECTION
 * * Creates a new class section (subject + teacher + students group).
 * * V3 UPDATE (Confirmed):
 * - FIX #1 (V2): Automatically finds students and adds them to the 'students' array.
 * - FIX #2 (V2): Atomically updates the 'assignedSubjects' array for the teacher.
 * - FIX #3 (V3): Correctly formats the student array to match the 
 * ClassSection.model.js schema: [ { studentId: id1 }, { studentId: id2 } ]
 * * Route: POST /api/admin/class-sections
 * Access: Admin only
 */
export const createClassSection = asyncHandler(async (req, res) => {
  const { subjectId, teacherId, semester, branch, sectionName, academicYear, maxStudents } = req.body;

  if (!subjectId || !teacherId || !semester || !branch || !sectionName || !academicYear) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Missing required fields: subjectId, teacherId, semester, branch, sectionName, academicYear (adminController.js)'
    );
  }

  // Validate subject exists
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Subject not found (adminController.js)');
  }

  // Validate teacher exists
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Teacher not found (adminController.js)');
  }

  // FIX #2: Validate maxStudents if provided
  if (maxStudents !== undefined) {
    const maxStudentsNum = parseInt(maxStudents);
    if (isNaN(maxStudentsNum) || maxStudentsNum < 1 || maxStudentsNum > 200) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'Field "maxStudents" must be a number between 1 and 200 (adminController.js)'
      );
    }
  }

  // FIX #3: Validate semester and branch match the subject
  if (semester !== subject.semester) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      `Field "semester" (${semester}) does not match subject's semester (${subject.semester}). Subject ${subject.subjectCode} is for semester ${subject.semester} (adminController.js)`
    );
  }

  if (branch.trim().toUpperCase() !== subject.branch.toUpperCase()) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      `Field "branch" (${branch}) does not match subject's branch (${subject.branch}). Subject ${subject.subjectCode} is for ${subject.branch} branch (adminController.js)`
    );
  }

  // ============================================================================
  // [NEW LOGIC - FIX #1]: Find all matching students to auto-enroll
  // ============================================================================
  const studentQuery = {
    branch: branch.trim().toUpperCase(),
    currentSemester: semester,
    section: sectionName.trim().toUpperCase(),
    'enrolledSubjects.subjectId': subjectId,
  };

  const matchingStudents = await Student.find(studentQuery).select('_id');

  // Convert the array of { _id: ... } to [ { studentId: ... } ]
  // This matches the ClassSection.model.js schema
  const studentObjects = matchingStudents.map(student => ({
    studentId: student._id
  }));
  // ============================================================================

  // Create class section
  let classSection;
  try {
    classSection = await ClassSection.create({
      subjectId,
      teacherId,
      semester,
      branch: branch.trim().toUpperCase(),
      sectionName: sectionName.trim().toUpperCase(),
      academicYear: academicYear.trim(),
      maxStudents: maxStudents ? parseInt(maxStudents) : 60,
      students: studentObjects, // <-- Use the new array of objects
    });
  } catch (createError) {
    // Handle potential creation error (e.g., duplicate key if one exists)
    console.error('Failed to create class section:', createError);
    return sendError(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, `Failed to create class section: ${createError.message} (adminController.js)`);
  }

  // ============================================================================
  // [NEW LOGIC - FIX #2]: Update the teacher's 'assignedSubjects' array
  // ============================================================================
  try {
    // Use the instance method from Teacher.model.js
    teacher.assignSubject(
      subjectId,
      semester,
      classSection.branch, // Use value from created section
      classSection.sectionName // Use value from created section
    );
    await teacher.save();
  } catch (teacherError) {
    // ROLLBACK: If teacher update fails, delete the class section we just made
    await ClassSection.findByIdAndDelete(classSection._id);
    
    console.error(`Teacher update failed for T:${teacher._id} on CS:${classSection._id}. Rolling back.`, teacherError);
    
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Class section was not created. Failed to update teacher assignment, operation rolled back. (adminController.js)'
    );
  }
  // ============================================================================

  console.log(`✅ Class section created: ${subject.subjectCode} - ${sectionName} by admin. ${studentObjects.length} students auto-enrolled. (adminController.js)`);

  return sendSuccess(
    res,
    HTTP_STATUS.CREATED,
    'Class section created successfully (adminController.js)',
    {
      classSection: {
        classSectionId: classSection._id,
        subject: { subjectId: subject._id, subjectCode: subject.subjectCode, subjectName: subject.subjectName },
        teacher: { teacherId: teacher._id, name: teacher.name },
        semester: classSection.semester,
        branch: classSection.branch,
        sectionName: classSection.sectionName,
        academicYear: classSection.academicYear,
        maxStudents: classSection.maxStudents,
        autoEnrolledStudents: studentObjects.length, 
      },
    }
  );
});

  /**
   * GET ALL CLASS SECTIONS
   * 
   * Route: GET /api/admin/class-sections
   * Access: Admin only
   */
  export const getAllClassSections = asyncHandler(async (req, res) => {
    const { branch, semester, subjectId } = req.query;
    // while demoing the filtering in this fxn just demo by chosing a particular subject & nothing else, make a note of these in the documentation as well , and tell the frontend guys as well
    const query = { isActive: true };

    if (branch) query.branch = branch.trim().toUpperCase();  // FIX #5: Added trim()
    if (semester) query.semester = parseInt(semester);
    if (subjectId) query.subjectId = subjectId;

    const classSections = await ClassSection.find(query)
      .populate('subjectId', 'subjectCode subjectName')
      .populate('teacherId', 'name teacherId')
      .sort({ branch: 1, semester: 1, sectionName: 1 });

    console.log(`🏫 Admin retrieved ${classSections.length} class sections (adminController.js)`);

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      'Class sections retrieved successfully (adminController.js)',
      {
        classSections: classSections.map((cs) => ({
          classSectionId: cs._id,
          subject: { subjectCode: cs.subjectId.subjectCode, subjectName: cs.subjectId.subjectName },
          teacher: { name: cs.teacherId.name, teacherId: cs.teacherId.teacherId },
          semester: cs.semester,
          branch: cs.branch,
          sectionName: cs.sectionName,
          academicYear: cs.academicYear,
          totalStudents: cs.students.length,
          maxStudents: cs.maxStudents,
        })),
        totalSections: classSections.length,
      }
    );
  });

  /**
   * UPDATE CLASS SECTION
   * 
   * Route: PATCH /api/admin/class-sections/:classSectionId
   * Access: Admin only
   */
  export const updateClassSection = asyncHandler(async (req, res) => {
    const { classSectionId } = req.params;
    const { teacherId, maxStudents, academicYear } = req.body;

    const classSection = await ClassSection.findById(classSectionId);

    if (!classSection) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, 'Class section not found (adminController.js)');
    }

    if (teacherId) {
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) {
        return sendError(res, HTTP_STATUS.NOT_FOUND, 'Teacher not found (adminController.js)');
      }
      classSection.teacherId = teacherId;
    }

    // FIX #2: Validate maxStudents if provided
    //please note that max student is not a entity of classSection, this is a mistake(although it doesn't raise an error)we just won't show this feature that we can update the max strength od a classSection, plz keep this in mind for frontend
    //so basically what works here is updating the teacher & the academic year(range) for a given classSection
    if (maxStudents !== undefined) {
      const maxStudentsNum = parseInt(maxStudents);
      if (isNaN(maxStudentsNum) || maxStudentsNum < 1 || maxStudentsNum > 200) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          'Field "maxStudents" must be a number between 1 and 200 (adminController.js)'
        );
      }
      classSection.maxStudents = maxStudentsNum;
    }

    if (academicYear) classSection.academicYear = academicYear.trim();

    await classSection.save();

    console.log(`✅ Class section ${classSectionId} updated by admin (adminController.js)`);

    return sendSuccess(res, HTTP_STATUS.OK, 'Class section updated successfully (adminController.js)', {
      classSectionId: classSection._id,
    });
  });

  /**
   * ADD STUDENT TO CLASS SECTION
   * 
   * Route: POST /api/admin/class-sections/:classSectionId/add-student
   * Access: Admin only
   */
  export const addStudentToSection = asyncHandler(async (req, res) => {
    const { classSectionId } = req.params;
    const { studentId } = req.body;

    if (!studentId) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Field "studentId" is required (adminController.js)');
    }

    const classSection = await ClassSection.findById(classSectionId);
    if (!classSection) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, 'Class section not found (adminController.js)');
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, 'Student not found (adminController.js)');
    }

    // Add student using instance method
    try {
      classSection.addStudent(studentId);
      await classSection.save();
    } catch (error) {
      // FIX #4: Add (adminController.js) suffix
      return sendError(res, HTTP_STATUS.BAD_REQUEST, `${error.message} (adminController.js)`);
    }

    console.log(`✅ Student ${student.prn} added to class section ${classSectionId} by admin (adminController.js)`);

    return sendSuccess(res, HTTP_STATUS.OK, 'Student added to class section successfully (adminController.js)');
  });

  /**
   * BULK ADD STUDENTS TO CLASS SECTION
   * 
   * Route: POST /api/admin/class-sections/:classSectionId/add-students
   * Access: Admin only
   */
  export const bulkAddStudentsToSection = asyncHandler(async (req, res) => {
    const { classSectionId } = req.params;
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Field "studentIds" must be a non-empty array (adminController.js)');
    }

    const classSection = await ClassSection.findById(classSectionId);
    if (!classSection) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, 'Class section not found (adminController.js)');
    }

    const results = { added: [], alreadyAdded: [], notFound: [], maxCapacityReached: false };

    for (const studentId of studentIds) {
      const student = await Student.findById(studentId);
      if (!student) {
        results.notFound.push(studentId);
        continue;
      }

      try {
        classSection.addStudent(studentId);
        results.added.push({ studentId: student._id, prn: student.prn, name: student.name });
      } catch (error) {
        if (error.message.includes('already in')) {
          results.alreadyAdded.push({ studentId: student._id, prn: student.prn });
        } else if (error.message.includes('maximum capacity')) {
          results.maxCapacityReached = true;
          break;
        }
      }
    }

    await classSection.save();

    console.log(`✅ Bulk add: ${results.added.length} students added to class section by admin (adminController.js)`);

    return sendSuccess(res, HTTP_STATUS.OK, 'Bulk add students completed (adminController.js)', { results });
  });

  /**
   * REMOVE STUDENT FROM CLASS SECTION
   * 
   * Route: DELETE /api/admin/class-sections/:classSectionId/students/:studentId
   * Access: Admin only
   */
  export const removeStudentFromSection = asyncHandler(async (req, res) => {
    const { classSectionId, studentId } = req.params;

    const classSection = await ClassSection.findById(classSectionId);
    if (!classSection) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, 'Class section not found (adminController.js)');
    }

    // FIX #1: Validate student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        'Student not found (adminController.js)'
      );
    }

    classSection.removeStudent(studentId);
    await classSection.save();

    console.log(`🗑️  Student ${student.prn} removed from class section by admin (adminController.js)`);

    return sendSuccess(res, HTTP_STATUS.OK, 'Student removed from class section successfully (adminController.js)');
  });

  /**
   * DELETE CLASS SECTION
   * 
   * Route: DELETE /api/admin/class-sections/:classSectionId
   * Access: Admin only
   */
  export const deleteClassSection = asyncHandler(async (req, res) => {
    const { classSectionId } = req.params;

    const classSection = await ClassSection.findById(classSectionId);
    if (!classSection) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, 'Class section not found (adminController.js)');
    }

    classSection.isActive = false;
    await classSection.save();

    console.log(`🗑️  Class section ${classSectionId} soft deleted by admin (adminController.js)`);

    return sendSuccess(res, HTTP_STATUS.OK, 'Class section deleted successfully (adminController.js)');
  });