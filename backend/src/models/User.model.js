import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import {
  USER_ROLES,
  EMAIL_DOMAIN,
  PASSWORD_REQUIREMENTS,
} from '../config/constants.js';

/**
 * User Schema - Central authentication table
 * Stores login credentials and basic user information
 * Role-specific data is stored in separate collections (Students/Teachers)
 */
const userSchema = new mongoose.Schema(
  {
    // University email (must end with @pesu.pes.edu)
    email: {
      type: String,
      required: [true, 'Email is required (User.model.js)'],
      unique: true,
      lowercase: true, // Convert to lowercase before saving
      trim: true,
      maxlength: [100, 'Email must not exceed 100 characters (User.model.js)'],
      validate: {
        validator: function (email) {
          // Check if email ends with university domain
          return email.endsWith(EMAIL_DOMAIN);
        },
        message: `Email must end with ${EMAIL_DOMAIN} (User.model.js)`,
      },
    },

    // Bcrypt hashed password (NEVER store plain text)
    password: {
      type: String,
      required: [true, 'Password is required (User.model.js)'],
      minlength: [
        PASSWORD_REQUIREMENTS.MIN_LENGTH,
        `Password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters (User.model.js)`,
      ],
      select: false, // Don't return password by default in queries
    },

    // User role: student, teacher, or admin
    role: {
      type: String,
      required: [true, 'Role is required (User.model.js)'],
      enum: {
        values: Object.values(USER_ROLES),
        message: 'Role must be student, teacher, or admin (User.model.js)',
      },
    },

    // Account status (true = active, false = deactivated)
    isActive: {
      type: Boolean,
      default: true,
    },

    // Timestamp of last successful login
    lastLogin: {
      type: Date,
      default: null,
    },

    // Array of refresh tokens for multi-device login support
    refreshTokens: [
      {
        token: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        expiresAt: {
          type: Date,
          required: true,
        },
        device: {
          type: String, // Optional: "Chrome on Windows", "Safari on iPhone"
          default: 'Unknown Device',
        },
      },
    ],
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

/**
 * CHANGE #1: Pre-save middleware to hash password before saving
 * This runs automatically before any save() operation
 * Ensures passwords are NEVER stored in plain text
 */
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt with 10 rounds (balanced security/performance)
    const salt = await bcrypt.genSalt(10);

    // Hash the password with the salt
    this.password = await bcrypt.hash(this.password, salt);

    next();
  } catch (error) {
    console.error(
      `❌ Password hashing error: ${error.message} (User.model.js)`
    );
    next(error);
  }
});

/**
 * Pre-remove hook - Cascade delete role-specific profiles
 * 
 * When a User is deleted, automatically delete their Student or Teacher profile.
 * This prevents orphaned documents in the database.
 */
userSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  try {
    // this._id refers to the User document being deleted
    const userId = this._id;

    if (this.role === 'student') {
      // Delete associated Student document
      await mongoose.model('Student').deleteOne({ userId });
      console.log(`✅ Cascade delete: Student profile deleted for user ${userId}`);
    } else if (this.role === 'teacher') {
      // Delete associated Teacher document
      await mongoose.model('Teacher').deleteOne({ userId });
      console.log(`✅ Cascade delete: Teacher profile deleted for user ${userId}`);
    }

    next();
  } catch (error) {
    console.error(`❌ Cascade delete failed: ${error.message}`);
    next(error);
  }
});

/**
 * Indexes for optimizing database queries
 */
// Index for fast email lookups during login

// Index for filtering users by role
userSchema.index({ role: 1 });

/**
 * Instance method to check if user account is active
 */
userSchema.methods.isAccountActive = function () {
  return this.isActive;
};

/**
 * CHANGE #2: Instance method to compare plain text password with hashed password
 * Used during login to verify credentials
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    // bcrypt.compare() automatically handles salt extraction from stored hash
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error(
      `❌ Password comparison error: ${error.message} (User.model.js)`
    );
    throw error;
  }
};

/**
 * Instance method to add a new refresh token
 */
userSchema.methods.addRefreshToken = function (
  token,
  expiresAt,
  device = 'Unknown Device'
) {
  this.refreshTokens.push({
    token,
    expiresAt,
    device,
  });
};

/**
 * Instance method to remove a specific refresh token (logout)
 */
userSchema.methods.removeRefreshToken = function (token) {
  this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== token);
};

/**
 * Instance method to remove all refresh tokens (logout from all devices)
 */
userSchema.methods.removeAllRefreshTokens = function () {
  this.refreshTokens = [];
};

// Create and export the User model
const User = mongoose.model('User', userSchema);

export default User;
