const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Interest = sequelize.define('Interest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  listingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'listing_id',
    references: {
      model: 'listings',
      key: 'id'
    }
  },
  buyerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'buyer_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  sellerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'seller_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'contacted', 'completed'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'interests',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['listing_id'] },
    { fields: ['buyer_id'] },
    { fields: ['seller_id'] },
    { fields: ['status'] }
  ]
});

module.exports = Interest;


