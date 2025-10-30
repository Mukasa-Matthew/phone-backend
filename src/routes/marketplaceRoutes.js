const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validation');
const { protect } = require('../middleware/auth');
const { requireVerification } = require('../middleware/verifyUser');
const uploadErrorHandler = require('../middleware/uploadErrorHandler');
const { listingsUpload } = require('../middleware/uploadMultiple');
const {
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  showInterest,
  getMyListings
} = require('../controllers/marketplaceController');

// Public routes
router.get('/', getListings);
router.get('/listings/:id', getListing);

// Protected routes
router.use(protect);

router.get('/my-listings', getMyListings);
router.post('/listings/:id/interest', requireVerification, showInterest);

// Listing creation and management (verified users only)
const listingValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required'),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required')
];

router.post('/listings', requireVerification, listingsUpload.array('images', 5), uploadErrorHandler, listingValidation, validate, createListing);
router.put('/listings/:id', listingsUpload.array('images', 5), uploadErrorHandler, listingValidation, validate, updateListing);
router.delete('/listings/:id', deleteListing);

module.exports = router;
