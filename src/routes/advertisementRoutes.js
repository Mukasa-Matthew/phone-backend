const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validation');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const uploadErrorHandler = require('../middleware/uploadErrorHandler');
const { advertisementUpload } = require('../middleware/uploadMultiple');
const {
  getAdvertisements,
  getAdvertisementById,
  createAdvertisement,
  updateAdvertisement,
  approveAdvertisement,
  deleteAdvertisement
} = require('../controllers/advertisementController');

// Public routes (for mobile app) - but with optional auth for superadmin
router.get('/', optionalAuth, getAdvertisements);
router.get('/:id', optionalAuth, getAdvertisementById);

// Protected routes (superadmin only)
router.use(protect);
router.use(authorize('superadmin'));

const adValidation = [
  body('advertiserName')
    .trim()
    .notEmpty()
    .withMessage('Advertiser name is required'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required'),
  body('position')
    .optional()
    .isIn(['banner', 'sidebar', 'feed'])
    .withMessage('Position must be "banner", "sidebar", or "feed"'),
  body('status')
    .optional()
    .isIn(['pending', 'approved', 'active', 'expired'])
    .withMessage('Invalid status')
];

router.post('/', advertisementUpload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'video', maxCount: 1 }
]), uploadErrorHandler, adValidation, validate, createAdvertisement);
router.put('/:id', advertisementUpload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'video', maxCount: 1 }
]), uploadErrorHandler, adValidation, validate, updateAdvertisement);
router.put('/:id/approve', approveAdvertisement);
router.delete('/:id', deleteAdvertisement);

module.exports = router;
