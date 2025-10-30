const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validation');
const { protect, authorize } = require('../middleware/auth');
const {
  getAllUsers,
  getUserById,
  updateUserStatus
} = require('../controllers/adminController');
const {
  getAuditLogs,
  getAuditLogById,
  getUserAuditLogs,
  getAuditStats
} = require('../controllers/auditController');
const {
  getServerHealth,
  getPerformanceMetrics
} = require('../controllers/healthController');
const {
  verifyUser,
  approveContact,
  approveListingContact,
  getPendingVerifications,
  getPendingContactApprovals,
  getAllListings,
  getAllInterests,
  getDashboardStats
} = require('../controllers/adminManagementController');

// All routes require superadmin role
router.use(protect);
router.use(authorize('superadmin'));

// Status update validation
const statusValidation = [
  body('status')
    .isIn(['active', 'inactive'])
    .withMessage('Status must be either "active" or "inactive"')
];

// User management routes
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/status', statusValidation, validate, updateUserStatus);

// Audit log routes
router.get('/audit-logs', getAuditLogs);
router.get('/audit-logs/stats', getAuditStats);
router.get('/audit-logs/user/:userId', getUserAuditLogs);
router.get('/audit-logs/:id', getAuditLogById);

// Server monitoring routes
router.get('/health', getServerHealth);
router.get('/performance', getPerformanceMetrics);

// User management routes
router.put('/users/:id/verify', verifyUser);
router.put('/users/:id/approve-contact', approveContact);
router.get('/pending-verifications', getPendingVerifications);
router.get('/pending-contact-approvals', getPendingContactApprovals);

// Listing management routes
router.get('/listings', getAllListings);
router.put('/listings/:id/approve-contact', approveListingContact);
router.get('/interests', getAllInterests);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

module.exports = router;
