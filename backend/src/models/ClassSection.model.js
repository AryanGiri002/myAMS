import mongoose from 'mongoose';
import { BRANCHES, SEMESTER_RANGE } from '../config/constants.js';

/**
 * ClassSection Schema - Maps which students belong to which class section
 * One class section = One teacher teaching one subject to one group of students
 * Example: Prof. Smith teaching MAT101 to CSE-Sem3-SectionA (30 students)
 */
const classSectionSchema = new mongoose.Schema(
  {
    // Reference to Subject being taught
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject ID is required (ClassSection.model.js)'],
    },

    // Reference to Teacher teaching this section
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher ID is required (ClassSection.model.js)'],
    },

    // Semester for this class section
    semester: {
      type: Number,
      required: [true, 'Semester is required (ClassSection.model.js)'],
      min: [
        SEMESTER_RANGE.MIN,
        `Semester must be at least ${SEMESTER_RANGE.MIN} (ClassSection.model.js)`,
      ],
      max: [
        SEMESTER_RANGE.MAX,
        `Semester must not exceed ${SEMESTER_RANGE.MAX} (ClassSection.model.js)`,
      ],
    },

    // Branch for this class section
    branch: {
      type: String,
      required: [true, 'Branch is required (ClassSection.model.js)'],
      enum: {
        values: BRANCHES,
        message: `Branch must be one of: ${BRANCHES.join(', ')} (ClassSection.model.js)`,
      },
    },

    // Section name (A, B, C, etc.)
    sectionName: {
      type: String,
      required: [true, 'Section name is required (ClassSection.model.js)'],
      uppercase: true,
      trim: true,
    },

    /**
     * CHANGE #4: Added status field for soft delete functionality
     * Students remain in array even after withdrawal to preserve historical records
     * This allows attendance records to maintain referential integrity
     */
    students: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Student',
          required: true,
        },
        enrolledAt: {
          type: Date,
          default: Date.now,
        },
        // Student status in this section
        status: {
          type: String,
          enum: {
            values: ['active', 'withdrawn', 'transferred'],
            message:
              'Status must be active, withdrawn, or transferred (ClassSection.model.js)',
          },
          default: 'active',
        },
        // Timestamp when student was withdrawn/transferred (null if still active)
        withdrawnAt: {
          type: Date,
          default: null,
        },
      },
    ],

    // Academic year (e.g., "2024-2025")
    academicYear: {
      type: String,
      required: [true, 'Academic year is required (ClassSection.model.js)'],
    },

    // Section status (true = current/active, false = archived)
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

/**
 * Indexes for optimizing queries
 */
// Compound unique index - one teacher can only teach one section of same subject/semester/branch
classSectionSchema.index(
  { subjectId: 1, teacherId: 1, semester: 1, branch: 1, sectionName: 1 },
  { unique: true }
);

// Index to get all sections for a specific teacher
classSectionSchema.index({ teacherId: 1 });

// Index to get all sections for a specific subject
classSectionSchema.index({ subjectId: 1 });

/**
 * Instance method to add a student to this section
 */
classSectionSchema.methods.addStudent = function (studentId) {
  // Check if student is already in this section (even if withdrawn)
  const existingStudent = this.students.find(
    student => student.studentId.toString() === studentId.toString()
  );

  if (existingStudent) {
    // If student was previously withdrawn, reactivate them
    if (existingStudent.status !== 'active') {
      existingStudent.status = 'active';
      existingStudent.withdrawnAt = null;
      existingStudent.enrolledAt = new Date(); // CHANGE: Update re-enrollment timestamp
    }
  } else {
    // Add new student
    this.students.push({
      studentId,
      status: 'active',
      enrolledAt: new Date(), // CHANGE: Explicitly set timestamp
    });
  }
};

/**
 * CHANGE #5: Modified removeStudent to use soft delete
 * Student remains in array but marked as withdrawn
 * This preserves historical attendance records
 */
classSectionSchema.methods.removeStudent = function (
  studentId,
  reason = 'withdrawn'
) {
  const student = this.students.find(
    s => s.studentId.toString() === studentId.toString()
  );

  if (student) {
    // Soft delete: Mark as withdrawn/transferred instead of removing
    student.status = reason === 'transferred' ? 'transferred' : 'withdrawn';
    student.withdrawnAt = new Date();
  }
};

/**
 * CHANGE #6: New method to get only active students count
 */
classSectionSchema.methods.getActiveStudentCount = function () {
  return this.students.filter(s => s.status === 'active').length;
};

/**
 * CHANGE #7: New method to get all students count (including withdrawn)
 */
classSectionSchema.methods.getTotalStudentCount = function () {
  return this.students.length;
};

/**
 * CHANGE #8: New method to get list of active students only
 */
classSectionSchema.methods.getActiveStudents = function () {
  return this.students.filter(s => s.status === 'active');
};

// Create and export the ClassSection model
const ClassSection = mongoose.model('ClassSection', classSectionSchema);

export default ClassSection;
