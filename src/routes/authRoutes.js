const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const {
  register,
  login,
  superadminLogin,
  getMe,
  updatePassword
} = require('../controllers/authController');
const {
  forgotPassword,
  verifyOTP,
  resetPassword
} = require('../controllers/passwordResetController');

// Validation rules for registration
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('schoolEmail')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid school email address')
    .custom((value) => {
      // Check if it's a valid school email format (contains @students. or @university domain)
      if (!value.includes('@students.') && !value.includes('@')) {
        throw new Error('Please provide a valid school email address (e.g., studentID@students.ucu.ac.ug)');
      }
      return true;
    }),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('dateOfBirth')
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Please provide a valid date (YYYY-MM-DD)'),
  body('phone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Phone cannot be empty if provided'),
  body('universityName')
    .trim()
    .notEmpty()
    .withMessage('University name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('University name must be between 2 and 200 characters')
];

// Validation rules for login
const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Validation rules for password update
const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

// Public routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/superadmin/login', loginValidation, validate, superadminLogin);

// Password reset routes (public)
router.post('/forgot-password', [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
], validate, forgotPassword);

router.post('/verify-reset-otp', [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('otp')
    .trim()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number')
], validate, verifyOTP);

router.post('/reset-password', [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('otp')
    .trim()
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
], validate, resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.put('/update-password', protect, updatePasswordValidation, validate, updatePassword);

module.exports = router;
