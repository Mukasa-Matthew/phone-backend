const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const { requireVerification } = require('../middleware/verifyUser');
const uploadErrorHandler = require('../middleware/uploadErrorHandler');
const { lostFoundUpload } = require('../middleware/uploadMultiple');
const {
  getLostFoundItems,
  getLostFoundItem,
  createLostFoundItem,
  claimItem,
  updateLostFoundItem,
  deleteLostFoundItem
} = require('../controllers/lostFoundController');

// Public routes
router.get('/', getLostFoundItems);
router.get('/:id', getLostFoundItem);

// Protected routes
router.use(protect);

const lostFoundValidation = [
  body('type')
    .isIn(['lost', 'found'])
    .withMessage('Type must be either "lost" or "found"'),
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required'),
  body('dateLostOrFound')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Please provide a valid date')
];

router.post('/', requireVerification, lostFoundUpload.array('images', 5), uploadErrorHandler, lostFoundValidation, validate, createLostFoundItem);
router.post('/:id/claim', requireVerification, claimItem);
router.put('/:id', lostFoundUpload.array('images', 5), uploadErrorHandler, lostFoundValidation, validate, updateLostFoundItem);
router.delete('/:id', deleteLostFoundItem);

module.exports = router;
