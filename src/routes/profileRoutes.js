const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const uploadErrorHandler = require('../middleware/uploadErrorHandler');
const {
  getProfile,
  updateProfile,
  uploadProfilePicture
} = require('../controllers/profileController');

// Validation rules for profile update
const updateProfileValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .custom((value) => {
      // If phone is provided and not null, it must not be empty
      if (value !== null && value !== undefined && value !== '' && value.trim() === '') {
        throw new Error('Phone cannot be empty if provided');
      }
      return true;
    })
];

// All routes are protected
router.get('/', protect, getProfile);
router.put('/', protect, updateProfileValidation, validate, updateProfile);
router.post('/picture', protect, upload.single('profilePicture'), uploadProfilePicture);

// Error handler for upload routes (must be after the route)
router.use(uploadErrorHandler);

module.exports = router;
