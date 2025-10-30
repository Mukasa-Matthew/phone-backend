const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId, role = 'user') => {
  return jwt.sign(
    { 
      userId, 
      role 
    },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
    }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    );
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

module.exports = {
  generateToken,
  verifyToken
};


