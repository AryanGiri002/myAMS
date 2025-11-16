import mongoose from 'mongoose';
import { BRANCHES, SEMESTER_RANGE, ID_PATTERNS } from '../config/constants.js';

/**
 * Teacher Schema - Teacher profile and teaching assignments
 * Linked to User collection via userId (one-to-one relationship)
 */
const teacherSchema = new mongoose.Schema(
  {
    // Reference to User collection (one teacher per user)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required (Teacher.model.js)'],
      unique: true,
    },

    // Unique teacher ID (e.g., TCH001, TCH002)
    teacherId: {
      type: String,
      required: [true, 'Teacher ID is required (Teacher.model.js)'],
      unique: true,
      uppercase: true,
      trim: true,
      validate: {
        validator: function (teacherId) {
          // Validate Teacher ID format: TCH + 3digits
          return ID_PATTERNS.TEACHER_ID.test(teacherId);
        },
        message:
          'Invalid Teacher ID format. Expected format: TCH001 (Teacher.model.js)',
      },
    },

    // Teacher's full name
    name: {
      type: String,
      required: [true, 'Name is required (Teacher.model.js)'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters (Teacher.model.js)'],
      maxlength: [
        100,
        'Name must not exceed 100 characters (Teacher.model.js)',
      ],
    },

    // Department teacher belongs to
    department: {
      type: String,
      required: [true, 'Department is required (Teacher.model.js)'],
      enum: {
        values: BRANCHES,
        message: `Department must be one of: ${BRANCHES.join(', ')} (Teacher.model.js)`,
      },
    },

    // Array of subjects assigned to this teacher
    // Note: Same teacher can teach same subject to multiple sections
    assignedSubjects: [
      {
        subjectId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Subject',
          required: true,
        },
        semester: {
          type: Number,
          required: true,
          min: SEMESTER_RANGE.MIN,
          max: SEMESTER_RANGE.MAX,
        },
        branch: {
          type: String,
          required: true,
          enum: BRANCHES,
        },
        section: {
          type: String,
          required: true,
          uppercase: true,
          trim: true,
        },
        assignedAt: {
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
 * Instance method to assign a subject to teacher
 */
teacherSchema.methods.assignSubject = function (
  subjectId,
  semester,
  branch,
  section
) {
  // Check if this exact assignment already exists
  const alreadyAssigned = this.assignedSubjects.some(
    assignment =>
      assignment.subjectId.toString() === subjectId.toString() &&
      assignment.semester === semester &&
      assignment.branch === branch &&
      assignment.section === section
  );

  if (!alreadyAssigned) {
    this.assignedSubjects.push({
      subjectId,
      semester,
      branch,
      section,
      assignedAt: new Date(), // CHANGE: Explicitly set timestamp
    });
  }
};

/**
 * Instance method to remove a subject assignment
 */
teacherSchema.methods.removeSubjectAssignment = function (
  subjectId,
  semester,
  branch,
  section
) {
  this.assignedSubjects = this.assignedSubjects.filter(
    assignment =>
      !(
        assignment.subjectId.toString() === subjectId.toString() &&
        assignment.semester === semester &&
        assignment.branch === branch &&
        assignment.section === section
      )
  );
};

// Create and export the Teacher model
const Teacher = mongoose.model('Teacher', teacherSchema);

export default Teacher;
