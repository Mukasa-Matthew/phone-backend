const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NewsReaction = sequelize.define('NewsReaction', {
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
  reactionType: {
    type: DataTypes.ENUM('like', 'dislike'),
    allowNull: false,
    field: 'reaction_type'
  }
}, {
  tableName: 'news_reactions',
  timestamps: true,
  underscored: true,
  indexes: [
    { 
      unique: true,
      fields: ['news_id', 'user_id'] // One reaction per user per news
    }
  ]
});

module.exports = NewsReaction;


