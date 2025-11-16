import mongoose from 'mongoose';
import {
  BRANCHES,
  SEMESTER_RANGE,
  SUBJECT_CREDITS_RANGE,
} from '../config/constants.js';

/**
 * Subject Schema - Course catalog
 * Stores information about all subjects/courses in the university
 */
const subjectSchema = new mongoose.Schema(
  {
    // Unique subject code (e.g., MAT101, CSC201, PHY101)
    subjectCode: {
      type: String,
      required: [true, 'Subject code is required (Subject.model.js)'],
      unique: true,
      uppercase: true,
      trim: true,
    },

    // Subject name (e.g., "Mathematics", "Computer Science", "Physics")
    subjectName: {
      type: String,
      required: [true, 'Subject name is required (Subject.model.js)'],
      trim: true,
      minlength: [
        2,
        'Subject name must be at least 2 characters (Subject.model.js)',
      ],
      maxlength: [
        100,
        'Subject name must not exceed 100 characters (Subject.model.js)',
      ],
    },

    // Branch this subject belongs to
    branch: {
      type: String,
      required: [true, 'Branch is required (Subject.model.js)'],
      enum: {
        values: BRANCHES,
        message: `Branch must be one of: ${BRANCHES.join(', ')} (Subject.model.js)`,
      },
    },

    // Semester in which this subject is taught
    semester: {
      type: Number,
      required: [true, 'Semester is required (Subject.model.js)'],
      min: [
        SEMESTER_RANGE.MIN,
        `Semester must be at least ${SEMESTER_RANGE.MIN} (Subject.model.js)`,
      ],
      max: [
        SEMESTER_RANGE.MAX,
        `Semester must not exceed ${SEMESTER_RANGE.MAX} (Subject.model.js)`,
      ],
    },

    // Number of credits for this subject
    credits: {
      type: Number,
      required: [true, 'Credits is required (Subject.model.js)'],
      min: [
        SUBJECT_CREDITS_RANGE.MIN,
        `Credits must be at least ${SUBJECT_CREDITS_RANGE.MIN} (Subject.model.js)`,
      ],
      max: [
        SUBJECT_CREDITS_RANGE.MAX,
        `Credits must not exceed ${SUBJECT_CREDITS_RANGE.MAX} (Subject.model.js)`,
      ],
    },

    // Subject status (true = active, false = discontinued)
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

// Compound index for filtering subjects by branch and semester
subjectSchema.index({ branch: 1, semester: 1 });

// Index for filtering active/inactive subjects
subjectSchema.index({ isActive: 1 });

/**
 * Instance method to activate/deactivate subject
 */
subjectSchema.methods.toggleActive = function () {
  this.isActive = !this.isActive;
};

/**
 * Instance method to update subject details
 */
subjectSchema.methods.updateDetails = function (updates) {
  const allowedUpdates = ['subjectName', 'credits', 'isActive'];
  
  Object.keys(updates).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      this[key] = updates[key];
    }
  });
};

// Create and export the Subject model
const Subject = mongoose.model('Subject', subjectSchema);

export default Subject;
