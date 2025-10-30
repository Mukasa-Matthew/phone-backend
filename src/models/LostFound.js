const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LostFound = sequelize.define('LostFound', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  type: {
    type: DataTypes.ENUM('lost', 'found'),
    allowNull: false,
    validate: {
      notNull: {
        msg: 'Type must be either "lost" or "found"'
      }
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Title cannot be empty'
      },
      len: {
        args: [5, 200],
        msg: 'Title must be between 5 and 200 characters'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Description cannot be empty'
      }
    }
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Location is required'
      }
    }
  },
  dateLostOrFound: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'date_lost_or_found'
  },
  images: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  },
  status: {
    type: DataTypes.ENUM('active', 'claimed', 'archived'),
    defaultValue: 'active',
    allowNull: false
  },
  claimedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'claimed_by',
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'lost_found',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['created_at'] }
  ]
});

module.exports = LostFound;


