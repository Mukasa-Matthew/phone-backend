const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NewsComment = sequelize.define('NewsComment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  newsId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'news_id',
    references: {
      model: 'news',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Comment cannot be empty'
      }
    }
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'parent_id',
    references: {
      model: 'news_comments',
      key: 'id'
    }
  }
}, {
  tableName: 'news_comments',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['news_id'] },
    { fields: ['user_id'] },
    { fields: ['parent_id'] }
  ]
});

module.exports = NewsComment;


