const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validation');
const { protect, authorize } = require('../middleware/auth');
const { requireVerification } = require('../middleware/verifyUser');
const uploadErrorHandler = require('../middleware/uploadErrorHandler');
const { newsUpload } = require('../middleware/uploadMultiple');
const {
  getNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews,
  reactToNews,
  commentOnNews
} = require('../controllers/newsController');

// Public routes
router.get('/', getNews);
router.get('/:id', getNewsById);

// Protected routes
router.use(protect);

// Reaction and comment routes (verified users)
router.post('/:id/reaction', requireVerification, [
  body('reactionType')
    .isIn(['like', 'dislike'])
    .withMessage('Reaction type must be "like" or "dislike"')
], validate, reactToNews);

router.post('/:id/comment', requireVerification, [
  body('comment')
    .trim()
    .notEmpty()
    .withMessage('Comment is required')
], validate, commentOnNews);

// Admin routes (superadmin only)
router.use(authorize('superadmin'));

const newsValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
];

router.post('/', newsUpload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'video', maxCount: 1 }
]), uploadErrorHandler, newsValidation, validate, createNews);
router.put('/:id', newsUpload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'video', maxCount: 1 }
]), uploadErrorHandler, newsValidation, validate, updateNews);
router.delete('/:id', deleteNews);

module.exports = router;
