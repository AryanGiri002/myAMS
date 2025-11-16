import mongoose from 'mongoose';
import { DB_NAME } from './constants.js';

/**
 * Establishes connection to MongoDB database
 * Uses connection string from environment variables
 */
const connectDatabase = async () => {
  try {
    // Attempt to connect to MongoDB
    // const connection = await mongoose.connect(process.env.MONGODB_URI, {});
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      `✅ MongoDB Connected Successfully: ${connectionInstance.connection.host} (database.js)`
    );
    console.log(`connection : ${connectionInstance}`);
    console.log(
      `connection.connection.host : ${connectionInstance.connection.host}`
    );

    // Log the database name being used
    console.log(
      `📊 Database Name: ${connectionInstance.connection.name} (database.js)`
    );
  } catch (error) {
    // If connection fails, log error and exit process
    console.error(
      `❌ MongoDB Connection Error: ${error.message} (database.js)`
    );
    process.exit(1); // Exit with failure code
  }
};

/**
 * Handles MongoDB connection events for monitoring
 */
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB Disconnected (database.js)');
});

mongoose.connection.on('error', error => {
  console.error(`❌ MongoDB Connection Error: ${error.message} (database.js)`);
});

// Graceful shutdown: Close MongoDB connection when Node process ends
process.on('SIGINT', async () => {
  try {
    // CORRECTED LINE below:
    await mongoose.connection.close();
    console.log('🔒 MongoDB Connection Closed (database.js)');
    process.exit(0);
  } catch (error) {
    console.error('Error during database disconnection', error);
    process.exit(1);
  }
});

export default connectDatabase;
