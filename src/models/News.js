const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const News = sequelize.define('News', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  publisherName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'publisher_name',
    defaultValue: null
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Title cannot be empty'
      }
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Content cannot be empty'
      }
    }
  },
  images: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  },
  videoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'video_url',
    validate: {
      isUrl: {
        msg: 'Please provide a valid video URL'
      }
    }
  },
  videoFile: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'video_file'
  },
  isUrgent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_urgent'
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    defaultValue: 'draft',
    allowNull: false
  }
}, {
  tableName: 'news',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['created_by'] },
    { fields: ['is_urgent'] },
    { fields: ['status'] },
    { fields: ['created_at'] }
  ]
});

module.exports = News;

