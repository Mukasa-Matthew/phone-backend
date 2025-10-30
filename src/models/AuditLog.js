const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true, // null if action was performed by system/anonymous
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Action cannot be empty'
      }
    }
  },
  resource: {
    type: DataTypes.STRING,
    allowNull: true // e.g., 'user', 'profile', 'auth', etc.
  },
  resourceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'resource_id'
  },
  method: {
    type: DataTypes.STRING,
    allowNull: true // HTTP method: GET, POST, PUT, DELETE
  },
  endpoint: {
    type: DataTypes.STRING,
    allowNull: true // API endpoint
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  requestBody: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'request_body'
  },
  responseStatus: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'response_status'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true // Additional context
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['action']
    },
    {
      fields: ['resource']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = AuditLog;


