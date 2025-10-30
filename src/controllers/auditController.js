const { AuditLog, User } = require('../models');
const { Op } = require('sequelize');
const asyncHandler = require('../middleware/asyncHandler');
const { sequelize: db } = require('../config/database');

// @desc    Get all audit logs (Superadmin only)
// @route   GET /api/admin/audit-logs
// @access  Private/Superadmin
exports.getAuditLogs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    userId,
    action,
    resource,
    startDate,
    endDate,
    method,
    statusCode
  } = req.query;

  // Build where clause
  const where = {};

  if (userId) {
    where.userId = userId;
  }

  if (action) {
    where.action = { [Op.iLike]: `%${action}%` };
  }

  if (resource) {
    where.resource = resource;
  }

  if (method) {
    where.method = method.toUpperCase();
  }

  if (statusCode) {
    const status = parseInt(statusCode);
    // Support both camelCase (model) and snake_case (database) field names
    where[Op.or] = [
      { responseStatus: status },
      { response_status: status }
    ];
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt[Op.gte] = new Date(startDate);
    }
    if (endDate) {
      where.createdAt[Op.lte] = new Date(endDate);
    }
  }

  // Calculate pagination
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Get audit logs with user information
  const { count, rows } = await AuditLog.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username', 'email', 'role']
      }
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: offset
  });

  res.status(200).json({
    success: true,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / parseInt(limit))
    },
    data: rows
  });
});

// @desc    Get audit log by ID (Superadmin only)
// @route   GET /api/admin/audit-logs/:id
// @access  Private/Superadmin
exports.getAuditLogById = asyncHandler(async (req, res) => {
  const auditLog = await AuditLog.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username', 'email', 'role']
      }
    ]
  });

  if (!auditLog) {
    return res.status(404).json({
      success: false,
      message: 'Audit log not found'
    });
  }

  res.status(200).json({
    success: true,
    data: auditLog
  });
});

// @desc    Get audit logs for specific user (Superadmin only)
// @route   GET /api/admin/audit-logs/user/:userId
// @access  Private/Superadmin
exports.getUserAuditLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { count, rows } = await AuditLog.findAndCountAll({
    where: { userId: req.params.userId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username', 'email', 'role']
      }
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: offset
  });

  res.status(200).json({
    success: true,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / parseInt(limit))
    },
    data: rows
  });
});

// @desc    Get audit log statistics (Superadmin only)
// @route   GET /api/admin/audit-logs/stats
// @access  Private/Superadmin
exports.getAuditStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const where = {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt[Op.gte] = new Date(startDate);
    }
    if (endDate) {
      where.createdAt[Op.lte] = new Date(endDate);
    }
  }

  // Get total count
  const totalLogs = await AuditLog.count({ where });

  // Get logs by action
  const logsByAction = await AuditLog.findAll({
    attributes: [
      'action',
      [db.fn('COUNT', db.col('id')), 'count']
    ],
    where,
    group: ['action'],
    order: [[db.fn('COUNT', db.col('id')), 'DESC']],
    limit: 10
  });

  // Get logs by resource
  const logsByResource = await AuditLog.findAll({
    attributes: [
      'resource',
      [db.fn('COUNT', db.col('id')), 'count']
    ],
    where,
    group: ['resource'],
    order: [[db.fn('COUNT', db.col('id')), 'DESC']],
    limit: 10
  });

  // Get logs by method
  const logsByMethod = await AuditLog.findAll({
    attributes: [
      'method',
      [db.fn('COUNT', db.col('id')), 'count']
    ],
    where,
    group: ['method'],
    order: [[db.fn('COUNT', db.col('id')), 'DESC']]
  });

  // Get error count
  const errorCount = await AuditLog.count({
    where: {
      ...where,
      errorMessage: { [Op.ne]: null }
    }
  });

  // Get unique users count
  const uniqueUsers = await AuditLog.count({
    where: {
      ...where,
      userId: { [Op.ne]: null }
    },
    distinct: true,
    col: 'user_id'
  });

  res.status(200).json({
    success: true,
    data: {
      totalLogs,
      errorCount,
      uniqueUsers,
      logsByAction: logsByAction.map(item => ({
        action: item.action,
        count: parseInt(item.getDataValue('count'))
      })),
      logsByResource: logsByResource.map(item => ({
        resource: item.resource,
        count: parseInt(item.getDataValue('count'))
      })),
      logsByMethod: logsByMethod.map(item => ({
        method: item.method,
        count: parseInt(item.getDataValue('count'))
      }))
    }
  });
});

