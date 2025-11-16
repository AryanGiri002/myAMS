import dotenv from 'dotenv';
import app from './src/app.js';
import connectDatabase from './src/config/database.js';

/**
 * ============================================================================
 * UNIVERSITY ATTENDANCE MANAGEMENT SYSTEM - SERVER ENTRY POINT
 * ============================================================================
 * 
 * This file is the entry point of the application.
 * It handles:
 * - Loading environment variables
 * - Connecting to MongoDB
 * - Starting the Express server
 * - Graceful shutdown handling
 * ============================================================================
 */

// ============================================================================
// LOAD ENVIRONMENT VARIABLES
// ============================================================================

/**
 * Load environment variables from .env file
 * Must be called before importing any modules that use process.env
 */
dotenv.config();

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get port from environment variables or use default 5000
 */
const PORT = process.env.PORT || 5000;

// ============================================================================
// START SERVER FUNCTION
// ============================================================================

/**
 * Start Server Function
 * 1. Connects to MongoDB
 * 2. Starts Express server
 * 3. Handles connection errors
 */
const startServer = async () => {
  try {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Connect to MongoDB first
    // ═══════════════════════════════════════════════════════════════
    await connectDatabase();
    console.log('✅ MongoDB connected successfully (server.js)');

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Start Express server only after successful DB connection
    // ═══════════════════════════════════════════════════════════════
    app.listen(PORT, () => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🚀 University Attendance Management System');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📡 Server running on port: ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📚 Available Routes:');
      console.log(`   • Auth:     /api/auth     (5 routes)`);
      console.log(`   • Students: /api/students (2 routes)`);
      console.log(`   • Teachers: /api/teachers (5 routes)`);
      console.log(`   • Admin:    /api/admin    (20 routes)`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✨ Server is ready to accept requests! (server.js)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message, '(server.js)');
    console.error('❌ Error details:', error);
    process.exit(1); // Exit with failure code
  }
};

// ============================================================================
// GRACEFUL SHUTDOWN HANDLERS
// ============================================================================

/**
 * SIGTERM Handler
 * Gracefully shuts down server when SIGTERM signal is received
 */
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM received. Shutting down gracefully... (server.js)');
  process.exit(0);
});

/**
 * SIGINT Handler (Ctrl+C)
 * Gracefully shuts down server when SIGINT signal is received
 */
process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT received. Shutting down gracefully... (server.js)');
  process.exit(0);
});

/**
 * Unhandled Promise Rejection Handler
 * Catches any unhandled promise rejections
 */
process.on('unhandledRejection', (error) => {
  console.error('❌ UNHANDLED REJECTION! Shutting down... (server.js)');
  console.error('Error name:', error.name);
  console.error('Error message:', error.message);
  console.error('Error stack:', error.stack);
  process.exit(1);
});

/**
 * Uncaught Exception Handler
 * Catches any uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION! Shutting down... (server.js)');
  console.error('Error name:', error.name);
  console.error('Error message:', error.message);
  console.error('Error stack:', error.stack);
  process.exit(1);
});

// ============================================================================
// START THE SERVER
// ============================================================================

startServer();