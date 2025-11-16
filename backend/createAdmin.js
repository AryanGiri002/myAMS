import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.model.js';
import { USER_ROLES,DB_NAME } from './src/config/constants.js';

// --- CONFIGURE YOUR ADMIN USER HERE ---
//
// ⚠️ WARNING: Your User.model.js has a validator that requires
// the email to end with your EMAIL_DOMAIN (e.g., '@pesu.pes.edu').
// This admin email MUST match that domain, or it will fail.
//
const ADMIN_EMAIL = 'admin@pesu.pes.edu';
const ADMIN_PASSWORD = 'aPassword123!';
//
// ----------------------------------------

/**
 * This script connects to the database, creates a single admin user
 * (if one doesn't already exist), and then disconnects.
 */
const createAdmin = async () => {
  // Load environment variables from .env file
  dotenv.config();

  const dbUri = process.env.MONGODB_URI;
  if (!dbUri) {
    console.error('❌ MONGODB_URI not found in .env file.');
    return;
  }

  try {
    // 1. Connect to the database
    console.log('Connecting to MongoDB...');
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    console.log('✅ Database connected.');

    // 2. Check if an admin with this email already exists
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
    if (existingAdmin) {
      console.warn('⚠️ An admin user with this email already exists:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   UserID: ${existingAdmin._id}`);
      return;
    }

    // 3. Create the new admin user object
    console.log('Creating new admin user...');
    const adminUser = new User({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD, // The pre-save hook will hash this!
      role: USER_ROLES.ADMIN, // Or you can just use the string 'admin'
      isActive: true,
    });

    // 4. Save the user (this triggers the password hashing)
    await adminUser.save();

    console.log('✅ Admin user created successfully!');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   UserID: ${adminUser._id}`);

  } catch (error) {
    console.error('❌ Error creating admin user:');
    console.error(error.message);
  } finally {
    // 5. Disconnect from the database
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
};

// Run the script
createAdmin();