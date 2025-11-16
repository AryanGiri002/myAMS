import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/responseFormatter.js';
import { formatDate, formatDateTime, getStartOfDay, getEndOfDay, parseDate } from '../utils/dateUtils.js';
import { HTTP_STATUS, ATTENDANCE_STATUS, MAX_SESSIONS_PER_CLASS, SESSION_DURATION } from '../config/constants.js';
import Teacher from '../models/Teacher.model.js';
import Student from '../models/Student.model.js';
import Subject from '../models/Subject.model.js';
import ClassSection from '../models/ClassSection.model.js';
import AttendanceRecord from '../models/AttendanceRecord.model.js';

/**
 * ============================================================================
 * TEACHER CONTROLLER
 * ============================================================================
 * 
 * Handles all teacher-specific operations related to attendance management.
 * Teachers can mark attendance, view records, and edit attendance for their classes.
 * 
 * ENDPOINTS:
 * 1. POST   /api/teachers/attendance        - Mark attendance for a class
 * 2. GET    /api/teachers/attendance        - View attendance records (with filters)
 * 3. PATCH  /api/teachers/attendance/:recordId - Edit existing attendance record
 * 4. GET    /api/teachers/classes           - Get teacher's assigned classes
 * 5. GET    /api/teachers/class-students/:classSectionId - Get students in a class
 * 
 * AUTHENTICATION:
 * - All routes require authentication (authenticate middleware)
 * - All routes require teacher or admin role (teacherOrAdmin middleware)
 * 
 * BUSINESS RULES:
 * - Teachers can only mark/edit attendance for their assigned classes
 * - Attendance can only be marked for dates <= today
 * - Each class can have multiple sessions (45-min blocks)
 * - Students must be enrolled in subject and part of class section
 * ============================================================================
 */

/**
 * MARK ATTENDANCE
 * 
 * Creates a new attendance record for a class session.
 * Validates that teacher is assigned to the class and all students are enrolled.
 * Automatically calculates attendance percentage for each student.
 * 
 * Route: POST /api/teachers/attendance
 * Access: Private (Teacher/Admin only)
 * Middleware: authenticate, teacherOrAdmin
 * 
 * @param {Object} req.body - Attendance data
 * @param {String} req.body.classSectionId - MongoDB ObjectId of class section
 * @param {String} req.body.date - Date of class (DD-MM-YYYY format)
 * @param {String} req.body.startTime - Class start time (HH:MM format)
 * @param {String} req.body.endTime - Class end time (HH:MM format)
 * @param {Number} req.body.numSessions - Number of 45-min sessions (1-10)
 * @param {Array} req.body.attendance - Array of student attendance objects
 * @param {String} req.body.attendance[].studentId - Student's MongoDB ObjectId
 * @param {Array} req.body.attendance[].sessions - Array of session statuses
 * @param {Number} req.body.attendance[].sessions[].sessionNumber - Session number (1-10)
 * @param {String} req.body.attendance[].sessions[].status - "present" or "absent"
 * 
 * @example
 * POST /api/teachers/attendance
 * {
 *   "classSectionId": "64cls001...",
 *   "date": "07-11-2025",
 *   "startTime": "09:00",
 *   "endTime": "10:30",
 *   "numSessions": 2,
 *   "attendance": [
 *     {
 *       "studentId": "64stu001...",
 *       "sessions": [
 *         { "sessionNumber": 1, "status": "present" },
 *         { "sessionNumber": 2, "status": "present" }
 *       ]
 *     },
 *     {
 *       "studentId": "64stu002...",
 *       "sessions": [
 *         { "sessionNumber": 1, "status": "present" },
 *         { "sessionNumber": 2, "status": "absent" }
 *       ]
 *     }
 *   ]
 * }
 */
export const markAttendance = asyncHandler(async (req, res) => {
  const { 
    classSectionId, 
    date, 
    startTime: rawStartTime, 
    endTime: rawEndTime, 
    numSessions, 
    attendance 
  } = req.body;

  // Sanitize string inputs (trim whitespace)
  const startTime = rawStartTime?.trim();
  const endTime = rawEndTime?.trim();

  // Validate required fields
  if (!classSectionId || !date || !startTime || !endTime || !numSessions || !attendance) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Missing required fields: classSectionId, date, startTime, endTime, numSessions, attendance (teacherController.js)'
    );
  }

  // Validate numSessions range (1-10 sessions)
  if (numSessions < 1 || numSessions > MAX_SESSIONS_PER_CLASS) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      `Field "numSessions" must be between 1 and ${MAX_SESSIONS_PER_CLASS} (teacherController.js)`
    );
  }

  // Validate time format (HH:MM)
  const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;

  if (!timeRegex.test(startTime)) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Field "startTime" must be in HH:MM format (e.g., 09:00) (teacherController.js)'
    );
  }

  if (!timeRegex.test(endTime)) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Field "endTime" must be in HH:MM format (e.g., 10:30) (teacherController.js)'
    );
  }

  // Validate that endTime is after startTime
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  if (endMinutes <= startMinutes) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Field "endTime" must be after "startTime" (teacherController.js)'
    );
  }

  // Validate that duration matches numSessions (45 min each)
  const durationMinutes = endMinutes - startMinutes;
  const expectedDuration = numSessions * SESSION_DURATION;

  if (durationMinutes < expectedDuration) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      `Class duration (${durationMinutes} minutes) is too short for ${numSessions} sessions. Need at least ${expectedDuration} minutes (teacherController.js)`
    );
  }

  // Validate attendance array
  if (!Array.isArray(attendance) || attendance.length === 0) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Field "attendance" must be a non-empty array (teacherController.js)'
    );
  }

  // Find teacher profile
  const teacher = await Teacher.findOne({ userId: req.user.userId });

  if (!teacher) {
    return sendError(
      res,
      HTTP_STATUS.NOT_FOUND,
      'Teacher profile not found (teacherController.js)'
    );
  }

  // Find and validate class section
  const classSection = await ClassSection.findById(classSectionId).populate('subjectId');

  if (!classSection) {
    return sendError(
      res,
      HTTP_STATUS.NOT_FOUND,
      'Class section not found (teacherController.js)'
    );
  }

  // Check if class section is active
  if (!classSection.isActive) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Cannot mark attendance for deleted class section (teacherController.js)'
    );
  }

  // Verify teacher is assigned to this class section
  const isAssigned = classSection.teacherId.toString() === teacher._id.toString();

  if (!isAssigned) {
    return sendError(
      res,
      HTTP_STATUS.FORBIDDEN,
      'You are not assigned to teach this class section (teacherController.js)'
    );
  }

  // Parse and validate date
  let attendanceDate;
  try {
    attendanceDate = parseDate(date);
  } catch (error) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      `Field "date" has invalid format. Expected DD-MM-YYYY (teacherController.js)`
    );
  }

  // Check if date is not in the future
  const today = getStartOfDay(new Date());
  if (attendanceDate > today) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Field "date" cannot be a future date. Attendance can only be marked for today or past dates (teacherController.js)'
    );
  }

  // Generate recordId (unique identifier for this attendance record)
  const recordIdDate = formatDate(attendanceDate).replace(/-/g, '');
  const recordId = `ATT_${recordIdDate}_${classSection.subjectId.subjectCode}_SEM${classSection.semester}_SEC${classSection.sectionName}_${String(Date.now()).slice(-3)}`;

  // Validate each student's attendance data
  const validatedAttendance = [];

  for (const studentAttendance of attendance) {
    const { studentId, sessions } = studentAttendance;

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Student with ID ${studentId} not found (teacherController.js)`
      );
    }

    // Check if student is enrolled in this subject
    const isEnrolled = student.enrolledSubjects.some(
      (enrollment) => enrollment.subjectId.toString() === classSection.subjectId._id.toString()
    );

    if (!isEnrolled) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Student ${student.name} (PRN: ${student.prn}) is not enrolled in subject ${classSection.subjectId.subjectCode} (teacherController.js)`
      );
    }

    // Check if student is part of this class section
    const isInSection = classSection.students.some(
      (sid) => sid.studentId.toString() === studentId.toString()
    );

    if (!isInSection) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Student ${student.name} (PRN: ${student.prn}) is not part of this class section (teacherController.js)`
      );
    }

    // Validate sessions array
    if (!Array.isArray(sessions) || sessions.length !== numSessions) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Field "attendance[].sessions" must have exactly ${numSessions} session(s) for student ${student.name} (PRN: ${student.prn}) (teacherController.js)`
      );
    }

    // Validate each session
    let presentCount = 0;
    let absentCount = 0;

    for (const session of sessions) {
      const { sessionNumber, status } = session;

      // Validate session number
      if (sessionNumber < 1 || sessionNumber > numSessions) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          `Field "attendance[].sessions[].sessionNumber" has invalid value ${sessionNumber}. Must be between 1 and ${numSessions} for student ${student.name} (PRN: ${student.prn}) (teacherController.js)`
        );
      }

      // Validate status
      if (!Object.values(ATTENDANCE_STATUS).includes(status)) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          `Field "attendance[].sessions[].status" has invalid value: ${status}. Must be "present" or "absent" for student ${student.name} (PRN: ${student.prn}) (teacherController.js)`
        );
      }

      // Count present/absent
      if (status === ATTENDANCE_STATUS.PRESENT) {
        presentCount++;
      } else {
        absentCount++;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // FIX #1: Validate no duplicate session numbers
    // ═══════════════════════════════════════════════════════════════
    const sessionNumbers = sessions.map(s => s.sessionNumber);
    const uniqueSessionNumbers = new Set(sessionNumbers);

    if (sessionNumbers.length !== uniqueSessionNumbers.size) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Field "attendance[].sessions" contains duplicate session numbers for student ${student.name} (PRN: ${student.prn}). Each session number must be unique (teacherController.js)`
      );
    }

    // Check if all session numbers from 1 to numSessions are present
    const expectedSessions = Array.from({ length: numSessions }, (_, i) => i + 1);
    const missingSessions = expectedSessions.filter(num => !sessionNumbers.includes(num));

    if (missingSessions.length > 0) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Field "attendance[].sessions" is missing session number(s) ${missingSessions.join(', ')} for student ${student.name} (PRN: ${student.prn}) (teacherController.js)`
      );
    }

    // Calculate attendance percentage for this student
    const attendancePercentage = parseFloat(((presentCount / numSessions) * 100).toFixed(2));

    // Add validated attendance
    validatedAttendance.push({
      studentId,
      sessions,
      totalPresent: presentCount,
      totalAbsent: absentCount,
      attendancePercentage,
    });
  }

  // Generate session breakdown (time slots for each session)
  const sessionBreakdown = generateSessionBreakdown(startTime, endTime, numSessions);

  // Create attendance record
  const attendanceRecord = await AttendanceRecord.create({
    recordId,
    subjectId: classSection.subjectId._id,
    classSectionId,
    teacherId: teacher._id,
    date: attendanceDate,
    startTime,
    endTime,
    semester: classSection.semester, 
    numSessions,
    sessionBreakdown,
    attendance: validatedAttendance,
    markedBy: teacher._id, 
    markedAt: new Date(),
    isFinalized: false
  });

  // Populate for response
  await attendanceRecord.populate([
    { path: 'subjectId', select: 'subjectCode subjectName' },
    { path: 'teacherId', select: 'name teacherId' },
    { path: 'classSectionId', select: 'sectionName semester branch' },
  ]);

  // Log success
  console.log(`✅ Attendance marked by teacher ${teacher.teacherId} for class ${classSectionId} on ${date} (teacherController.js)`);

  return sendSuccess(
    res,
    HTTP_STATUS.CREATED,
    'Attendance marked successfully (teacherController.js)',
    {
      attendanceRecord: {
        recordId: attendanceRecord.recordId,
        subject: {
          subjectCode: attendanceRecord.subjectId.subjectCode,
          subjectName: attendanceRecord.subjectId.subjectName,
        },
        section: attendanceRecord.classSectionId.sectionName,
        date: formatDate(attendanceRecord.date),
        startTime: attendanceRecord.startTime,
        endTime: attendanceRecord.endTime,
        numSessions: attendanceRecord.numSessions,
        totalStudents: validatedAttendance.length,
        markedAt: formatDateTime(attendanceRecord.markedAt),
      },
    }
  );
});

/**
 * VIEW ATTENDANCE RECORDS
 * 
 * Retrieves attendance records for classes taught by the logged-in teacher.
 * Supports filtering by class section, subject, date range, and pagination.
 * 
 * Route: GET /api/teachers/attendance
 * Access: Private (Teacher/Admin only)
 * Middleware: authenticate, teacherOrAdmin
 * 
 * @param {String} req.query.classSectionId - Optional: Filter by class section
 * @param {String} req.query.subjectId - Optional: Filter by subject
 * @param {String} req.query.startDate - Optional: Start date (DD-MM-YYYY)
 * @param {String} req.query.endDate - Optional: End date (DD-MM-YYYY)
 * @param {Number} req.query.page - Optional: Page number (default: 1)
 * @param {Number} req.query.limit - Optional: Records per page (default: 20)
 * 
 * @example
 * // Get all attendance records:
 * GET /api/teachers/attendance
 * 
 * // Filter by class section:
 * GET /api/teachers/attendance?classSectionId=64cls001...
 * 
 * // Filter by date range:
 * GET /api/teachers/attendance?startDate=01-01-2025&endDate=31-01-2025
 * 
 * // Pagination:
 * GET /api/teachers/attendance?page=2&limit=10
 */
/**
 * VIEW ATTENDANCE RECORDS
 * * Retrieves attendance records for classes taught by the logged-in teacher.
 * Supports filtering by class section, subject, date range, and pagination.
 * * V2 UPDATE: Now includes the detailed, student-by-student attendance 
 * breakdown in the 'attendanceDetails' field.
 * * Route: GET /api/teachers/attendance
 * Access: Private (Teacher/Admin only)
 * Middleware: authenticate, teacherOrAdmin
 */
export const viewAttendanceRecords = asyncHandler(async (req, res) => {
  const { classSectionId, subjectId, startDate, endDate, page = 1, limit = 20 } = req.query;

  // Find teacher profile
  const teacher = await Teacher.findOne({ userId: req.user.userId });

  if (!teacher) {
    return sendError(
      res,
      HTTP_STATUS.NOT_FOUND,
      'Teacher profile not found (teacherController.js)'
    );
  }

  // Build query
  const query = {
    teacherId: teacher._id, // Only show records for this teacher
  };

  // Optional filters
  if (classSectionId) {
    query.classSectionId = classSectionId;
  }

  if (subjectId) {
    query.subjectId = subjectId;
  }

  // Date range filter
  if (startDate || endDate) {
    query.date = {};

    if (startDate) {
      try {
        const parsedStartDate = parseDate(startDate);
        query.date.$gte = getStartOfDay(parsedStartDate);
      } catch (error) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          `Query parameter "startDate" has invalid format. Expected DD-MM-YYYY (teacherController.js)`
        );
      }
    }

    if (endDate) {
      try {
        const parsedEndDate = parseDate(endDate);
        query.date.$lte = getEndOfDay(parsedEndDate);
      } catch (error) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          `Query parameter "endDate" has invalid format. Expected DD-MM-YYYY (teacherController.js)`
        );
      }
    }
  }

  // Pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Get total count for pagination
  const totalRecords = await AttendanceRecord.countDocuments(query);

  // ═══════════════════════════════════════════════════════════════
  // [CHANGE #1] - Update the .find() query to populate the students
  // ═══════════════════════════════════════════════════════════════
  const attendanceRecords = await AttendanceRecord.find(query)
    .populate('subjectId', 'subjectCode subjectName')
    .populate('classSectionId', 'sectionName semester branch')
    .populate({
      path: 'attendance.studentId', // <-- Populate the studentId INSIDE the attendance array
      model: 'Student', // <-- Tell Mongoose which model to use
      select: 'name prn srn', // <-- Only select the fields you need
    })
    .sort({ date: -1, startTime: 1 }) // Newest date first, morning classes first
    .skip(skip)
    .limit(limitNum);
  // ═══════════════════════════════════════════════════════════════

  // Format records
  const formattedRecords = attendanceRecords.map((record) => ({
    recordId: record.recordId,
    subject: {
      subjectId: record.subjectId._id,
      subjectCode: record.subjectId.subjectCode,
      subjectName: record.subjectId.subjectName,
    },
    section: {
      classSectionId: record.classSectionId._id,
      sectionName: record.classSectionId.sectionName,
      semester: record.classSectionId.semester,
      branch: record.classSectionId.branch,
    },
    date: formatDate(record.date),
    startTime: record.startTime,
    endTime: record.endTime,
    numSessions: record.numSessions,
    totalStudents: record.attendance.length,
    markedAt: formatDateTime(record.markedAt),
    lastModifiedAt: record.lastModifiedAt ? formatDateTime(record.lastModifiedAt) : null,
    isFinalized: record.isFinalized,
    
    // ═══════════════════════════════════════════════════════════════
    // [CHANGE #2] - Add the full attendance breakdown to the response
    // ═══════════════════════════════════════════════════════════════
    attendanceDetails: record.attendance.map(att => ({
      // 'att.studentId' is now a populated object { _id, name, prn, srn }
      student: att.studentId, 
      sessions: att.sessions,
      totalPresent: att.totalPresent,
      totalAbsent: att.totalAbsent,
      attendancePercentage: att.attendancePercentage,
    })),
    // ═══════════════════════════════════════════════════════════════
  }));

  return sendSuccess(
    res,
    HTTP_STATUS.OK,
    'Attendance records retrieved successfully (teacherController.js)',
    {
      records: formattedRecords,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalRecords / limitNum),
        totalRecords,
        recordsPerPage: limitNum,
        hasNextPage: pageNum < Math.ceil(totalRecords / limitNum),
        hasPrevPage: pageNum > 1,
      },
    }
  );
});

/**
 * EDIT ATTENDANCE RECORD
 * 
 * Updates an existing attendance record.
 * Can modify student attendance status, session timings, or finalize the record.
 * Finalized records cannot be edited (prevents tampering).
 * 
 * Route: PATCH /api/teachers/attendance/:recordId
 * Access: Private (Teacher/Admin only)
 * Middleware: authenticate, teacherOrAdmin
 * 
 * @param {String} req.params.recordId - AttendanceRecord's recordId (not MongoDB _id)
 * @param {Object} req.body - Fields to update
 * @param {Array} req.body.attendance - Optional: Updated attendance array
 * @param {String} req.body.startTime - Optional: Updated start time
 * @param {String} req.body.endTime - Optional: Updated end time
 * @param {Boolean} req.body.isFinalized - Optional: Finalize record
 * 
 * @example
 * // Update student attendance:
 * PATCH /api/teachers/attendance/ATT_07112025_MAT101_SEM3_SECA_001
 * {
 *   "attendance": [
 *     {
 *       "studentId": "64stu001...",
 *       "sessions": [
 *         { "sessionNumber": 1, "status": "present" },
 *         { "sessionNumber": 2, "status": "absent" }  // Changed from present
 *       ]
 *     }
 *   ]
 * }
 * 
 * // Finalize record (prevents further edits):
 * PATCH /api/teachers/attendance/ATT_07112025_MAT101_SEM3_SECA_001
 * {
 *   "isFinalized": true
 * }
 */
export const editAttendanceRecord = asyncHandler(async (req, res) => {
  const { recordId } = req.params;
  const { 
    attendance, 
    startTime: rawStartTime, 
    endTime: rawEndTime, 
    isFinalized 
  } = req.body;

  // Sanitize string inputs
  const startTime = rawStartTime?.trim();
  const endTime = rawEndTime?.trim();

  // Find teacher profile
  const teacher = await Teacher.findOne({ userId: req.user.userId });

  if (!teacher) {
    return sendError(
      res,
      HTTP_STATUS.NOT_FOUND,
      'Teacher profile not found (teacherController.js)'
    );
  }

  // Find attendance record by recordId (not _id)
  const attendanceRecord = await AttendanceRecord.findOne({ recordId }).populate('classSectionId');

  if (!attendanceRecord) {
    return sendError(
      res,
      HTTP_STATUS.NOT_FOUND,
      'Attendance record not found (teacherController.js)'
    );
  }

  // Check if teacher owns this record
  if (attendanceRecord.teacherId.toString() !== teacher._id.toString()) {
    return sendError(
      res,
      HTTP_STATUS.FORBIDDEN,
      'You can only edit your own attendance records (teacherController.js)'
    );
  }

  // Check if record is already finalized
  if (attendanceRecord.isFinalized) {
    return sendError(
      res,
      HTTP_STATUS.BAD_REQUEST,
      'Cannot edit finalized attendance record (teacherController.js)'
    );
  }

  // Validate time format if provided
  if (startTime) {
    const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(startTime)) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'Field "startTime" must be in HH:MM format (e.g., 09:00) (teacherController.js)'
      );
    }
  }

  if (endTime) {
    const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(endTime)) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        'Field "endTime" must be in HH:MM format (e.g., 10:30) (teacherController.js)'
      );
    }
  }

  // Update attendance if provided
  if (attendance && Array.isArray(attendance)) {
      try {
        // Pass the user ID (req.user.userId) for the audit trail
        attendanceRecord.updateAttendance(attendance, req.user.userId);
      } catch (error) {
        return sendError(
          res,
          HTTP_STATUS.BAD_REQUEST,
          `Failed to update attendance: ${error.message} (teacherController.js)`
        );
      }
  }

  // Update time if provided
  if (startTime) {
    attendanceRecord.startTime = startTime;
  }

  if (endTime) {
    attendanceRecord.endTime = endTime;
  }

  // Regenerate session breakdown if time changed
  if (startTime || endTime) {
    attendanceRecord.sessionBreakdown = generateSessionBreakdown(
      attendanceRecord.startTime,
      attendanceRecord.endTime,
      attendanceRecord.numSessions
    );
  }

  // Finalize if requested
  if (isFinalized === true) {
    attendanceRecord.isFinalized = true;
  }

  // Update lastModifiedAt timestamp
  attendanceRecord.lastModifiedAt = new Date();

  // Save changes
  await attendanceRecord.save();

  // Populate for response
  await attendanceRecord.populate([
    { path: 'subjectId', select: 'subjectCode subjectName' },
    { path: 'classSectionId', select: 'sectionName' },
  ]);

  // Log success
  console.log(`✅ Attendance record ${recordId} edited by teacher ${teacher.teacherId} (teacherController.js)`);

  return sendSuccess(
    res,
    HTTP_STATUS.OK,
    'Attendance record updated successfully (teacherController.js)',
    {
      attendanceRecord: {
        recordId: attendanceRecord.recordId,
        subject: {
          subjectCode: attendanceRecord.subjectId.subjectCode,
          subjectName: attendanceRecord.subjectId.subjectName,
        },
        section: attendanceRecord.classSectionId.sectionName,
        date: formatDate(attendanceRecord.date),
        startTime: attendanceRecord.startTime,
        endTime: attendanceRecord.endTime,
        numSessions: attendanceRecord.numSessions,
        totalStudents: attendanceRecord.attendance.length,
        markedAt: formatDateTime(attendanceRecord.markedAt),
        lastModifiedAt: formatDateTime(attendanceRecord.lastModifiedAt),
        isFinalized: attendanceRecord.isFinalized,
      },
    }
  );
});

/**
 * GET TEACHER'S ASSIGNED CLASSES
 * 
 * Retrieves all class sections assigned to the logged-in teacher.
 * Useful for showing teacher their schedule and which classes they can mark attendance for.
 * 
 * Route: GET /api/teachers/classes
 * Access: Private (Teacher/Admin only)
 * Middleware: authenticate, teacherOrAdmin
 * 
 * @example
 * GET /api/teachers/classes
 */
export const getAssignedClasses = asyncHandler(async (req, res) => {
  // Find teacher profile with assigned subjects
  const teacher = await Teacher.findOne({ userId: req.user.userId }).populate(
    'assignedSubjects.subjectId',
    'subjectCode subjectName credits'
  );

  if (!teacher) {
    return sendError(
      res,
      HTTP_STATUS.NOT_FOUND,
      'Teacher profile not found (teacherController.js)'
    );
  }

  // Find all class sections where this teacher is assigned
  const classSections = await ClassSection.find({
    teacherId: teacher._id,
    isActive: true, // Only active sections
  }).populate('subjectId', 'subjectCode subjectName branch semester credits');

  // Format class sections
  const formattedClasses = classSections.map((classSection) => ({
    classSectionId: classSection._id,
    subject: {
      subjectId: classSection.subjectId._id,
      subjectCode: classSection.subjectId.subjectCode,
      subjectName: classSection.subjectId.subjectName,
      credits: classSection.subjectId.credits,
    },
    sectionName: classSection.sectionName,
    semester: classSection.semester,
    branch: classSection.branch,
    academicYear: classSection.academicYear,
    totalStudents: classSection.students.length
  }));

  return sendSuccess(
    res,
    HTTP_STATUS.OK,
    'Assigned classes retrieved successfully (teacherController.js)',
    {
      teacher: {
        teacherId: teacher.teacherId,
        name: teacher.name,
        department: teacher.department,
      },
      assignedClasses: formattedClasses,
      totalClasses: formattedClasses.length,
    }
  );
});

/**
 * GET STUDENTS IN A CLASS SECTION
 * 
 * Retrieves list of students enrolled in a specific class section.
 * Useful when teacher needs to see who should be present for attendance marking.
 * 
 * Route: GET /api/teachers/class-students/:classSectionId
 * Access: Private (Teacher/Admin only)
 * Middleware: authenticate, teacherOrAdmin
 * 
 * @param {String} req.params.classSectionId - MongoDB ObjectId of class section
 * 
 * @example
 * GET /api/teachers/class-students/64cls001...
 */
export const getClassStudents = asyncHandler(async (req, res) => {
  const { classSectionId } = req.params;

  // Find teacher profile
  const teacher = await Teacher.findOne({ userId: req.user.userId });

  if (!teacher) {
    return sendError(
      res,
      HTTP_STATUS.NOT_FOUND,
      'Teacher profile not found (teacherController.js)'
    );
  }

  // Find class section
  const classSection = await ClassSection.findById(classSectionId)
    .populate('subjectId', 'subjectCode subjectName')
    .populate('students', 'prn srn name branch currentSemester section');

  if (!classSection) {
    return sendError(
      res,
      HTTP_STATUS.NOT_FOUND,
      'Class section not found (teacherController.js)'
    );
  }

  // Verify teacher is assigned to this class
  if (classSection.teacherId.toString() !== teacher._id.toString()) {
    return sendError(
      res,
      HTTP_STATUS.FORBIDDEN,
      'You are not assigned to this class section (teacherController.js)'
    );
  }

  // Format student list
  const students = classSection.students.map((student) => ({
    studentId: student.studentId,
    prn: student.prn,
    srn: student.srn,
    name: student.name,
    branch: student.branch,
    semester: student.currentSemester,
    section: student.section,
  }));

  return sendSuccess(
    res,
    HTTP_STATUS.OK,
    'Class students retrieved successfully (teacherController.js)',
    {
      classSection: {
        classSectionId: classSection._id,
        subject: {
          subjectCode: classSection.subjectId.subjectCode,
          subjectName: classSection.subjectId.subjectName,
        },
        sectionName: classSection.sectionName,
        semester: classSection.semester,
        branch: classSection.branch,
      },
      students,
      totalStudents: students.length,
    }
  );
});

/**
 * ============================================================================
 * HELPER FUNCTIONS
 * ============================================================================
 */

/**
 * Generate session breakdown (time slots for each 45-min session)
 * 
 * Divides class time into equal 45-minute sessions.
 * 
 * @param {String} startTime - Class start time (HH:MM)
 * @param {String} endTime - Class end time (HH:MM)
 * @param {Number} numSessions - Number of sessions
 * @returns {Array} Array of session objects with start/end times
 * 
 * @example
 * generateSessionBreakdown("09:00", "10:30", 2)
 * Returns:
 * [
 *   { sessionNumber: 1, startTime: "09:00", endTime: "09:45" },
 *   { sessionNumber: 2, startTime: "09:45", endTime: "10:30" }
 * ]
 */
function generateSessionBreakdown(startTime, endTime, numSessions) {
  const sessionBreakdown = [];

  // Parse start time
  const [startHour, startMinute] = startTime.split(':').map(Number);
  let currentTime = new Date();
  currentTime.setHours(startHour, startMinute, 0, 0);

  for (let i = 1; i <= numSessions; i++) {
    const sessionStart = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;

    // Add SESSION_DURATION (45 minutes) for session end
    currentTime.setMinutes(currentTime.getMinutes() + SESSION_DURATION);

    const sessionEnd = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;

    sessionBreakdown.push({
      sessionNumber: i,
      startTime: sessionStart,
      endTime: sessionEnd,
    });
  }

  return sessionBreakdown;
}