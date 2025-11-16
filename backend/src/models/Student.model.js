import mongoose from 'mongoose';
import { BRANCHES, SEMESTER_RANGE, ID_PATTERNS } from '../config/constants.js';

/**
 * Student Schema - Student profile and academic information
 * Linked to User collection via userId (one-to-one relationship)
 */
const studentSchema = new mongoose.Schema(
  {
    // Reference to User collection (one student per user)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required (Student.model.js)'],
      unique: true,
    },

    // PRN (Primary Registration Number) - NEVER changes, true identifier
    prn: {
      type: String,
      required: [true, 'PRN is required (Student.model.js)'],
      unique: true,
      uppercase: true,
      trim: true,
      validate: {
        validator: function (prn) {
          // Validate PRN format: PES + 1digit(1-9) + 4digits(year) + 5digits(student number)
          return ID_PATTERNS.PRN.test(prn);
        },
        message:
          'Invalid PRN format. Expected format: PES2202300055 (Student.model.js)',
      },
    },

    // SRN (Student Registration Number) - CAN change when branch changes
    srn: {
      type: String,
      required: [true, 'SRN is required (Student.model.js)'],
      uppercase: true,
      trim: true,
      validate: {
        validator: function (srn) {
          // Validate SRN format: PES + 1digit + UG/PG + 2digits(year) + 2letters(branch) + 3digits
          return ID_PATTERNS.SRN.test(srn);
        },
        message:
          'Invalid SRN format. Expected format: PES2UG23CS098 (Student.model.js)',
      },
    },

    // SRN change history (track all SRN changes for audit trail)
    srnHistory: [
      {
        oldSrn: {
          type: String,
          required: true,
        },
        newSrn: {
          type: String,
          required: true,
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User', // Admin who made the change
          required: true,
        },
        reason: {
          type: String, // e.g., "Branch change from CSE to ECE"
          required: true,
        },
      },
    ],

    // Student's full name
    name: {
      type: String,
      required: [true, 'Name is required (Student.model.js)'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters (Student.model.js)'],
      maxlength: [
        100,
        'Name must not exceed 100 characters (Student.model.js)',
      ],
    },

    // Academic branch
    branch: {
      type: String,
      required: [true, 'Branch is required (Student.model.js)'],
      enum: {
        values: BRANCHES,
        message: `Branch must be one of: ${BRANCHES.join(', ')} (Student.model.js)`,
      },
    },

    // Current semester (1-8, manually set by admin)
    currentSemester: {
      type: Number,
      required: [true, 'Current semester is required (Student.model.js)'],
      min: [
        SEMESTER_RANGE.MIN,
        `Semester must be at least ${SEMESTER_RANGE.MIN} (Student.model.js)`,
      ],
      max: [
        SEMESTER_RANGE.MAX,
        `Semester must not exceed ${SEMESTER_RANGE.MAX} (Student.model.js)`,
      ],
    },

    // Section assigned by admin (A, B, C, etc.)
    section: {
      type: String,
      required: [true, 'Section is required (Student.model.js)'],
      uppercase: true,
      trim: true,
    },

    // Array of subjects student is enrolled in
    enrolledSubjects: [
      {
        subjectId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Subject',
          required: true,
        },
        semesterNumber: {
          type: Number,
          required: true,
          min: SEMESTER_RANGE.MIN,
          max: SEMESTER_RANGE.MAX,
        },
        enrolledAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

/**
 * Indexes for optimizing queries
 */


/**
 * CHANGE #3: Updated comment for SRN index with usage clarification
 * SRN can be searched but is NOT unique (can change when branch changes)
 *
 * IMPORTANT USAGE NOTES:
 * - Use SRN for display purposes (e.g., showing on frontend when marking attendance)
 * - Use SRN for searching CURRENT student records only
 * - For historical data (attendance records, grades), ALWAYS use studentId/PRN
 * - Never query historical collections directly by SRN (could return wrong student)
 *
 * Example: When teacher marks attendance, frontend displays SRN for easy identification,
 * but backend stores studentId in attendance record for permanent reference
 */
studentSchema.index({ srn: 1 });

// Compound index for filtering students by branch and semester
studentSchema.index({ branch: 1, currentSemester: 1 });

/**
 * Instance method to add SRN change to history
 */
studentSchema.methods.updateSrn = function (newSrn, changedBy, reason) {
  // Add current SRN to history before updating
  this.srnHistory.push({
    oldSrn: this.srn,
    newSrn: newSrn,
    changedBy: changedBy,
    reason: reason,
  });

  // Update to new SRN
  this.srn = newSrn;
};

/**
 * Instance method to enroll in a subject
 */
studentSchema.methods.enrollInSubject = function (subjectId, semesterNumber) {
  // Check if already enrolled in this subject
  const alreadyEnrolled = this.enrolledSubjects.some(
    enrollment => enrollment.subjectId.toString() === subjectId.toString()
  );

  if (!alreadyEnrolled) {
    this.enrolledSubjects.push({
      subjectId,
      semesterNumber,
      enrolledAt: new Date(), // CHANGE: Explicitly set timestamp
    });
  }
};


/**
 * Instance method to unenroll from a subject
 */
studentSchema.methods.unenrollFromSubject = function (subjectId) {
  // Use Mongoose's .pull() to remove the sub-document
  // that matches the { subjectId: ... } query.
  this.enrolledSubjects.pull({ subjectId: subjectId });
};

// Create and export the Student model
const Student = mongoose.model('Student', studentSchema);

export default Student;
