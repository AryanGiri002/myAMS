import mongoose from 'mongoose';
import { ATTENDANCE_STATUS, SEMESTER_RANGE, MAX_SESSIONS_PER_CLASS } from '../config/constants.js';

/**
 * AttendanceRecord Schema - Stores attendance for each class session
 * One record = One class on one specific date with session-by-session attendance
 */
const attendanceRecordSchema = new mongoose.Schema(
  {
    // Unique record identifier (e.g., ATT_03-11-2025_MAT101_SEM3_SECA_001)
    recordId: {
      type: String,
      required: [true, 'Record ID is required (AttendanceRecord.model.js)'],
      unique: true,
      uppercase: true,
      trim: true,
    },

    // Reference to Subject
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject ID is required (AttendanceRecord.model.js)'],
    },

    // Reference to Teacher who conducted the class
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher ID is required (AttendanceRecord.model.js)'],
    },

    // Reference to ClassSection
    classSectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSection',
      required: [true, 'Class Section ID is required (AttendanceRecord.model.js)'],
    },

    // Date of the class (stored as Date object, API returns DD-MM-YYYY)
    date: {
      type: Date,
      required: [true, 'Date is required (AttendanceRecord.model.js)'],
    },

    // Class start time (HH:MM format, e.g., "09:00")
    startTime: {
      type: String,
      required: [true, 'Start time is required (AttendanceRecord.model.js)'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:MM format (AttendanceRecord.model.js)'],
    },

    // Class end time (HH:MM format, e.g., "10:30")
    endTime: {
      type: String,
      required: [true, 'End time is required (AttendanceRecord.model.js)'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:MM format (AttendanceRecord.model.js)'],
    },

    // Semester for this class
    semester: {
      type: Number,
      required: [true, 'Semester is required (AttendanceRecord.model.js)'],
      min: [SEMESTER_RANGE.MIN, `Semester must be at least ${SEMESTER_RANGE.MIN} (AttendanceRecord.model.js)`],
      max: [SEMESTER_RANGE.MAX, `Semester must not exceed ${SEMESTER_RANGE.MAX} (AttendanceRecord.model.js)`],
    },

    // Number of 45-minute sessions in this class (1-10)
    numSessions: {
      type: Number,
      required: [true, 'Number of sessions is required (AttendanceRecord.model.js)'],
      min: [1, 'Must have at least 1 session (AttendanceRecord.model.js)'],
      max: [MAX_SESSIONS_PER_CLASS, `Cannot exceed ${MAX_SESSIONS_PER_CLASS} sessions (AttendanceRecord.model.js)`],
    },

    // Auto-calculated session timings breakdown
    sessionBreakdown: [
      {
        sessionNumber: {
          type: Number,
          required: true,
        },
        startTime: {
          type: String,
          required: true,
        },
        endTime: {
          type: String,
          required: true,
        },
      },
    ],

    // Attendance data for all students in the class
    attendance: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Student',
          required: true,
        },
        
        // Session-by-session attendance
        sessions: [
          {
            sessionNumber: {
              type: Number,
              required: true,
            },
            status: {
              type: String,
              required: true,
              enum: {
                values: Object.values(ATTENDANCE_STATUS),
                message: `Status must be ${Object.values(ATTENDANCE_STATUS).join(' or ')} (AttendanceRecord.model.js)`,
              },
            },
          },
        ],

        // Auto-calculated totals for this student in this class
        totalPresent: {
          type: Number,
          default: 0,
        },
        totalAbsent: {
          type: Number,
          default: 0,
        },
        attendancePercentage: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
      },
    ],

    // Teacher who originally marked attendance
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Marked by is required (AttendanceRecord.model.js)'],
    },

    // Original marking timestamp
    markedAt: {
      type: Date,
      default: Date.now,
    },

    // User (Teacher/Admin) who last modified the record
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Last modification timestamp
    lastModifiedAt: {
      type: Date,
    },

    // Finalization status (false = editable, true = locked)
    // When true, only admin can modify
    isFinalized: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

/**
 * Indexes for optimizing queries
 */

// Compound index for finding specific attendance record
attendanceRecordSchema.index({ subjectId: 1, date: 1, startTime: 1 });

// Index for getting all records for a class section and date
attendanceRecordSchema.index({ classSectionId: 1, date: 1 });

// Index for teacher's marking history
attendanceRecordSchema.index({ teacherId: 1 });

// Index for date range queries
attendanceRecordSchema.index({ date: 1 });

// Index for querying student's attendance across all records
attendanceRecordSchema.index({ 'attendance.studentId': 1 });

/**
 * Instance method to calculate totals for a specific student in this record
 */
attendanceRecordSchema.methods.calculateStudentTotals = function (studentId) {
  const studentAttendance = this.attendance.find(
    (att) => att.studentId.toString() === studentId.toString()
  );

  if (studentAttendance) {
    // Count present and absent sessions
    const presentCount = studentAttendance.sessions.filter(
      (s) => s.status === ATTENDANCE_STATUS.PRESENT
    ).length;
    
    const absentCount = studentAttendance.sessions.filter(
      (s) => s.status === ATTENDANCE_STATUS.ABSENT
    ).length;

    // Defensive check: Ensure all sessions are marked
    // In our system, every session MUST be either present or absent (no other status)
    const markedSessions = presentCount + absentCount;
    if (markedSessions !== this.numSessions) {
      throw new Error(
        `Attendance data inconsistent for student ${studentId}: marked ${markedSessions} sessions but expected ${this.numSessions} (AttendanceRecord.model.js)`
      );
    }

    // Calculate percentage (using numSessions is correct since present + absent = numSessions)
    const percentage = (presentCount / this.numSessions) * 100;

    // Update the student's attendance data
    studentAttendance.totalPresent = presentCount;
    studentAttendance.totalAbsent = absentCount;
    studentAttendance.attendancePercentage = parseFloat(percentage.toFixed(2));
  }
};

/**
 * Instance method to recalculate all students' totals in this record
 */
attendanceRecordSchema.methods.recalculateAllTotals = function () {
  this.attendance.forEach((studentAttendance) => {
    const presentCount = studentAttendance.sessions.filter(
      (s) => s.status === ATTENDANCE_STATUS.PRESENT
    ).length;
    
    const absentCount = studentAttendance.sessions.filter(
      (s) => s.status === ATTENDANCE_STATUS.ABSENT
    ).length;

    // Defensive check: Ensure data integrity
    const markedSessions = presentCount + absentCount;
    if (markedSessions !== this.numSessions) {
      console.warn(
        `⚠️  Attendance data inconsistent for student ${studentAttendance.studentId}: marked ${markedSessions} sessions but expected ${this.numSessions} (AttendanceRecord.model.js)`
      );
      // Don't throw error here, just warn and continue (for bulk operations)
    }

    // Calculate percentage
    const percentage = this.numSessions > 0 ? (presentCount / this.numSessions) * 100 : 0;

    studentAttendance.totalPresent = presentCount;
    studentAttendance.totalAbsent = absentCount;
    studentAttendance.attendancePercentage = parseFloat(percentage.toFixed(2));
  });
};

/**
 * Instance method to update record with audit trail
 */
attendanceRecordSchema.methods.updateWithAudit = function (userId) {
  this.lastModifiedBy = userId;
  this.lastModifiedAt = new Date();
};

/**
 * NEW CHANGE #12: Instance method to update a specific student's specific session
 * Use case: Teacher corrects one session's attendance (e.g., marks late arrival)
 * 
 * @param {ObjectId} studentId - ID of the student
 * @param {Number} sessionNumber - Which session to update (1, 2, 3, etc.)
 * @param {String} newStatus - New status ('present' or 'absent')
 * @param {ObjectId} modifiedBy - ID of user making the change (teacher/admin)
 */
attendanceRecordSchema.methods.updateStudentSession = function (
  studentId, 
  sessionNumber, 
  newStatus, 
  modifiedBy
) {
  // Validate new status
  if (!Object.values(ATTENDANCE_STATUS).includes(newStatus)) {
    throw new Error(
      `Invalid status: ${newStatus}. Must be 'present' or 'absent' (AttendanceRecord.model.js)`
    );
  }

  // Find student in attendance array
  const studentAttendance = this.attendance.find(
    (att) => att.studentId.toString() === studentId.toString()
  );

  if (!studentAttendance) {
    throw new Error(
      `Student ${studentId} not found in attendance record (AttendanceRecord.model.js)`
    );
  }

  // Find the specific session
  const session = studentAttendance.sessions.find(
    (s) => s.sessionNumber === sessionNumber
  );

  if (!session) {
    throw new Error(
      `Session ${sessionNumber} not found. Valid sessions: 1-${this.numSessions} (AttendanceRecord.model.js)`
    );
  }

  // Update the session status
  session.status = newStatus;

  // Recalculate totals for this student
  this.calculateStudentTotals(studentId);

  // Update audit trail
  this.updateWithAudit(modifiedBy);
};

/**
 * NEW CHANGE #13: Instance method to update all sessions for a specific student at once
 * Use case: Teacher edits multiple sessions for one student in one operation
 * 
 * @param {ObjectId} studentId - ID of the student
 * @param {Array} sessionsData - Array of objects: [{sessionNumber: 1, status: 'present'}, ...]
 * @param {ObjectId} modifiedBy - ID of user making the change (teacher/admin)
 */
attendanceRecordSchema.methods.updateStudentAllSessions = function (
  studentId, 
  sessionsData, 
  modifiedBy
) {
  // Find student in attendance array
  const studentAttendance = this.attendance.find(
    (att) => att.studentId.toString() === studentId.toString()
  );

  if (!studentAttendance) {
    throw new Error(
      `Student ${studentId} not found in attendance record (AttendanceRecord.model.js)`
    );
  }

  // Validate that sessionsData is an array
  if (!Array.isArray(sessionsData) || sessionsData.length === 0) {
    throw new Error(
      `sessionsData must be a non-empty array (AttendanceRecord.model.js)`
    );
  }

  // Update each session
  sessionsData.forEach((sessionUpdate) => {
    // Validate session update structure
    if (!sessionUpdate.sessionNumber || !sessionUpdate.status) {
      throw new Error(
        `Each session update must have sessionNumber and status (AttendanceRecord.model.js)`
      );
    }

    // Validate status
    if (!Object.values(ATTENDANCE_STATUS).includes(sessionUpdate.status)) {
      throw new Error(
        `Invalid status: ${sessionUpdate.status}. Must be 'present' or 'absent' (AttendanceRecord.model.js)`
      );
    }

    // Find the session to update
    const session = studentAttendance.sessions.find(
      (s) => s.sessionNumber === sessionUpdate.sessionNumber
    );
    
    if (session) {
      session.status = sessionUpdate.status;
    } else {
      console.warn(
        `⚠️  Session ${sessionUpdate.sessionNumber} not found for student ${studentId} (AttendanceRecord.model.js)`
      );
    }
  });

  // Recalculate totals for this student
  this.calculateStudentTotals(studentId);

  // Update audit trail
  this.updateWithAudit(modifiedBy);
};

/**
 * NEW CHANGE #14: Instance method to update attendance for multiple students at once
 * Use case: Teacher edits and resubmits the entire attendance list
 * @param {Array} newAttendanceData - Array of student attendance objects
 * @param {ObjectId} modifiedBy - ID of user making the change (teacher/admin)
 */
attendanceRecordSchema.methods.updateAttendance = function (newAttendanceData, modifiedBy) {
  if (!Array.isArray(newAttendanceData)) {
    throw new Error("Attendance data must be a non-empty array (AttendanceRecord.model.js)");
  }

  // Loop through each student in the new data
  newAttendanceData.forEach(studentUpdate => {
    const { studentId, sessions } = studentUpdate;

    if (!studentId || !sessions) {
      throw new Error(
        `Invalid attendance object for student ${studentId}. 'studentId' and 'sessions' are required. (AttendanceRecord.model.js)`
      );
    }

    // Use your existing method to update this specific student
    // This will also handle recalculating totals and the audit trail
    this.updateStudentAllSessions(studentId, sessions, modifiedBy);
  });
};

// Create and export the AttendanceRecord model
const AttendanceRecord = mongoose.model('AttendanceRecord', attendanceRecordSchema);

export default AttendanceRecord;