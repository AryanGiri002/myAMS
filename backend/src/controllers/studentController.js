import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/responseFormatter.js';
import { formatDate, formatDateTime, getStartOfDay, getEndOfDay, parseDate } from '../utils/dateUtils.js';
import { HTTP_STATUS } from '../config/constants.js';
import Student from '../models/Student.model.js';
import AttendanceRecord from '../models/AttendanceRecord.model.js';
import Subject from '../models/Subject.model.js';

/**
 * ============================================================================
 * STUDENT CONTROLLER
 * ============================================================================
 * 
 * Handles all student-specific operations.
 * Students can view their dashboard, enrolled subjects, and attendance records.
 * 
 * ENDPOINTS:
 * 1. GET /api/students/dashboard        - Get student dashboard with enrolled subjects
 * 2. GET /api/students/attendance/:subjectId - Get attendance for a specific subject
 * 
 * AUTHENTICATION:
 * - All routes require authentication (authenticate middleware)
 * - All routes require student role (studentOnly middleware)
 * 
 * NOTE: Students can ONLY view their own data (enforced by req.user.userId)
 * ============================================================================
 */

/**
 * GET STUDENT DASHBOARD
 * 
 * Fetches student profile with enrolled subjects and basic information.
 * Used by frontend to display student's main dashboard page.
 * 
 * Route: GET /api/students/dashboard
 * Access: Private (Student only)
 * Middleware: authenticate, studentOnly
 * 
 * @param {Object} req.user - User info from authenticate middleware
 * @param {String} req.user.userId - MongoDB ObjectId of logged-in user
 * 
 * @example
 * GET /api/students/dashboard
 * Cookies: accessToken (sent automatically)
 * 
 * Response shows student's profile and enrolled subjects with details
 */
export const getStudentDashboard = asyncHandler(async (req, res) => {
  // Find student profile using userId from JWT token
  const student = await Student.findOne({ userId: req.user.userId }).populate(
    'enrolledSubjects.subjectId',
    'subjectCode subjectName branch semester credits isActive'
  );

  // Check if student profile exists
  if (!student) {
    return sendError(
      res,
      HTTP_STATUS.NOT_FOUND,
      'Student profile not found. Please contact administrator (studentController.js)'
    );
  }

  // Format enrolled subjects for frontend
  const enrolledSubjects = student.enrolledSubjects
    .filter((enrollment) => enrollment.subjectId && enrollment.subjectId.isActive) // Only show active subjects
    .map((enrollment) => ({
      subjectId: enrollment.subjectId._id,
      subjectCode: enrollment.subjectId.subjectCode,
      subjectName: enrollment.subjectId.subjectName,
      branch: enrollment.subjectId.branch,
      semester: enrollment.subjectId.semester,
      credits: enrollment.subjectId.credits,
      semesterNumber: enrollment.semesterNumber,
      enrolledAt: formatDateTime(enrollment.enrolledAt),
    }));

  // Return dashboard data
  return sendSuccess(
    res,
    HTTP_STATUS.OK,
    'Dashboard data retrieved successfully (studentController.js)',
    {
      student: {
        studentId: student._id,
        prn: student.prn,
        srn: student.srn,
        name: student.name,
        branch: student.branch,
        semester: student.currentSemester,
        section: student.section,
        enrolledSubjects,
        totalSubjects: enrolledSubjects.length,
      },
    }
  );
});

/**
 * GET ATTENDANCE FOR SPECIFIC SUBJECT
 * 
 * Fetches all attendance records for a student in a specific subject.
 * Calculates cumulative statistics (total present, total absent, percentage).
 * Supports optional date range filtering.
 * 
 * Route: GET /api/students/attendance/:subjectId
 * Access: Private (Student only)
 * Middleware: authenticate, studentOnly
 * 
 * @param {String} req.params.subjectId - MongoDB ObjectId of the subject
 * @param {String} req.query.startDate - Optional start date (DD-MM-YYYY format)
 * @param {String} req.query.endDate - Optional end date (DD-MM-YYYY format)
 * @param {Object} req.user - User info from authenticate middleware
 * 
 * @example
 * // Get all attendance for a subject:
 * GET /api/students/attendance/64xyz111...
 * 
 * // Get attendance for specific date range:
 * GET /api/students/attendance/64xyz111...?startDate=01-01-2025&endDate=31-01-2025
 * 
 * Response includes:
 * - Subject details
 * - Cumulative summary (total classes, present, absent, percentage)
 * - Individual attendance records with session-by-session breakdown
 */
export const getAttendanceBySubject = asyncHandler(async (req, res) => {
  const { subjectId } = req.params;
  const { startDate, endDate } = req.query;

  // Find student profile
  const student = await Student.findOne({ userId: req.user.userId });

  if (!student) {
    return sendError(
      res,
      HTTP_STATUS.NOT_FOUND,
      'Student profile not found (studentController.js)'
    );
  }

  // Verify student is enrolled in this subject
  const isEnrolled = student.enrolledSubjects.some(
    (enrollment) => enrollment.subjectId.toString() === subjectId
  );

  if (!isEnrolled) {
    return sendError(
      res,
      HTTP_STATUS.FORBIDDEN,
      'You are not enrolled in this subject (studentController.js)'
    );
  }

  // Get subject details
  const subject = await Subject.findById(subjectId);

  if (!subject) {
    return sendError(
      res,
      HTTP_STATUS.NOT_FOUND,
      'Subject not found (studentController.js)'
    );
  }

  // Build date range query
  let dateQuery = {};

  if (startDate || endDate) {
    dateQuery = {};

    if (startDate) {
      try {
        const parsedStartDate = parseDate(startDate);
        dateQuery.$gte = getStartOfDay(parsedStartDate);
      } catch (error) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          `Invalid start date format. Expected DD-MM-YYYY (studentController.js)`
        );
      }
    }

    if (endDate) {
      try {
        const parsedEndDate = parseDate(endDate);
        dateQuery.$lte = getEndOfDay(parsedEndDate);
      } catch (error) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          `Invalid end date format. Expected DD-MM-YYYY (studentController.js)`
        );
      }
    }
  }

  // Query attendance records for this student and subject
  const attendanceRecords = await AttendanceRecord.find({
    subjectId,
    'attendance.studentId': student._id,
    ...(Object.keys(dateQuery).length > 0 && { date: dateQuery }),
  })
    .populate('teacherId', 'name teacherId')
    .populate('classSectionId', 'sectionName')
    .sort({ date: -1, startTime: 1 }); // Chronological

  // If no attendance records found
  if (attendanceRecords.length === 0) {
    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      'No attendance records found for this subject (studentController.js)',
      {
        subject: {
          subjectId: subject._id,
          subjectCode: subject.subjectCode,
          subjectName: subject.subjectName,
          branch: subject.branch,
          semester: subject.semester,
        },
        summary: {
          totalClasses: 0,
          totalSessions: 0,
          presentCount: 0,
          absentCount: 0,
          attendancePercentage: 0,
          fractionPresent: '0/0',
        },
        records: [],
      }
    );
  }

  // Calculate cumulative statistics across all records
  let cumulativeTotalSessions = 0;
  let cumulativePresentCount = 0;
  let cumulativeAbsentCount = 0;

  // Format individual records and extract student's attendance
  const formattedRecords = attendanceRecords.map((record) => {
    // Find this student's attendance in the record
    const studentAttendance = record.attendance.find(
      (att) => att.studentId.toString() === student._id.toString()
    );

    if (studentAttendance) {
      // Add to cumulative totals
      cumulativeTotalSessions += record.numSessions;
      cumulativePresentCount += studentAttendance.totalPresent;
      cumulativeAbsentCount += studentAttendance.totalAbsent;

      // Format session breakdown
      const sessions = studentAttendance.sessions.map((session) => {
        // Find corresponding session timing from sessionBreakdown
        const sessionTiming = record.sessionBreakdown.find(
          (sb) => sb.sessionNumber === session.sessionNumber
        );

        return {
          sessionNumber: session.sessionNumber,
          time: sessionTiming
            ? `${sessionTiming.startTime}-${sessionTiming.endTime}`
            : 'N/A',
          status: session.status,
        };
      });

      return {
        recordId: record.recordId,
        date: formatDate(record.date),
        startTime: record.startTime,
        endTime: record.endTime,
        numSessions: record.numSessions,
        teacher: record.teacherId
          ? {
              name: record.teacherId.name,
              teacherId: record.teacherId.teacherId,
            }
          : { name: 'Unknown', teacherId: 'N/A' },
        section: record.classSectionId?.sectionName || 'N/A',
        sessions,
        presentInThisClass: studentAttendance.totalPresent,
        absentInThisClass: studentAttendance.totalAbsent,
        attendancePercentage: studentAttendance.attendancePercentage,
        markedAt: formatDateTime(record.markedAt),
        lastModifiedAt: record.lastModifiedAt
          ? formatDateTime(record.lastModifiedAt)
          : null,
        isFinalized: record.isFinalized,
      };
    }

    return null;
  }).filter((record) => record !== null); // Remove null entries

  // Calculate overall percentage
  const overallPercentage =
    cumulativeTotalSessions > 0
      ? parseFloat(((cumulativePresentCount / cumulativeTotalSessions) * 100).toFixed(2))
      : 0;

  // Return complete attendance data
  return sendSuccess(
    res,
    HTTP_STATUS.OK,
    'Attendance retrieved successfully (studentController.js)',
    {
      subject: {
        subjectId: subject._id,
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        branch: subject.branch,
        semester: subject.semester,
      },
      summary: {
        totalClasses: attendanceRecords.length, // Number of classes held
        totalSessions: cumulativeTotalSessions, // Total 45-min sessions
        presentCount: cumulativePresentCount,
        absentCount: cumulativeAbsentCount,
        attendancePercentage: overallPercentage,
        fractionPresent: `${cumulativePresentCount}/${cumulativeTotalSessions}`,
      },
      records: formattedRecords,
      dateRange: {
        startDate: startDate || 'Semester start',
        endDate: endDate || 'Current date',
      },
    }
  );
});