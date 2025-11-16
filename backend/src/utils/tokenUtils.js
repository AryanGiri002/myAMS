import jwt from 'jsonwebtoken';
import { TOKEN_TYPES } from '../config/constants.js';

/**
 * Generate Access Token (short-lived, for API requests)
 * 
 * @param {Object} payload - Data to encode in token (userId, role)
 * @returns {String} - JWT access token
 */
export const generateAccessToken = (payload) => {
  try {
    return jwt.sign(
      {
        ...payload,
        type: TOKEN_TYPES.ACCESS,
      },
      process.env.JWT_ACCESS_SECRET,
      {
        expiresIn: process.env.JWT_ACCESS_EXPIRY || '1d', // Default 1 day
      }
    );
  } catch (error) {
    console.error(`❌ Access token generation error: ${error.message} (tokenUtils.js)`);
    throw new Error('Failed to generate access token (tokenUtils.js)');
  }
};

/**
 * Generate Refresh Token (long-lived, for getting new access tokens)
 * 
 * @param {Object} payload - Data to encode in token (userId, tokenId)
 * @returns {String} - JWT refresh token
 */
export const generateRefreshToken = (payload) => {
  try {
    return jwt.sign(
      {
        ...payload,
        type: TOKEN_TYPES.REFRESH,
      },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d', // Default 7 days
      }
    );
  } catch (error) {
    console.error(`❌ Refresh token generation error: ${error.message} (tokenUtils.js)`);
    throw new Error('Failed to generate refresh token (tokenUtils.js)');
  }
};

/**
 * Verify Access Token
 * 
 * @param {String} token - JWT access token to verify
 * @returns {Object} - Decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
export const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Verify token type
    if (decoded.type !== TOKEN_TYPES.ACCESS) {
      throw new Error('Invalid token type (tokenUtils.js)');
    }
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired (tokenUtils.js)');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid access token (tokenUtils.js)');
    } else {
      throw error;
    }
  }
};

/**
 * Verify Refresh Token
 * 
 * @param {String} token - JWT refresh token to verify
 * @returns {Object} - Decoded token payload
 * @throws {Error} - If token is invalid or expired
 */
export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    
    // Verify token type
    if (decoded.type !== TOKEN_TYPES.REFRESH) {
      throw new Error('Invalid token type (tokenUtils.js)');
    }
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired (tokenUtils.js)');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token (tokenUtils.js)');
    } else {
      throw error;
    }
  }
};

/**
 * Decode token without verification (useful for debugging)
 * 
 * @param {String} token - JWT token to decode
 * @returns {Object} - Decoded token payload (without verification)
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error(`❌ Token decode error: ${error.message} (tokenUtils.js)`);
    return null;
  }
};

/**
 * Generate token expiry date
 * 
 * @param {String} expiryString - Expiry duration (e.g., '1d', '7d')
 * @returns {Date} - Expiry date
 */
export const getTokenExpiryDate = (expiryString) => {
  const now = new Date();
  
  // Parse expiry string (e.g., '1d' = 1 day, '7d' = 7 days)
  const match = expiryString.match(/^(\d+)([dhms])$/);
  
  if (!match) {
    // Default to 7 days if format is invalid
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  let milliseconds = 0;
  
  switch (unit) {
    case 'd': // days
      milliseconds = value * 24 * 60 * 60 * 1000;
      break;
    case 'h': // hours
      milliseconds = value * 60 * 60 * 1000;
      break;
    case 'm': // minutes
      milliseconds = value * 60 * 1000;
      break;
    case 's': // seconds
      milliseconds = value * 1000;
      break;
    default:
      milliseconds = 7 * 24 * 60 * 60 * 1000; // default 7 days
  }
  
  return new Date(now.getTime() + milliseconds);
};