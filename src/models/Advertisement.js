const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Advertisement = sequelize.define('Advertisement', {
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
  advertiserName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'advertiser_name',
    validate: {
      notEmpty: {
        msg: 'Advertiser name is required'
      }
    }
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
  description: {
    type: DataTypes.TEXT,
    allowNull: true
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
  linkUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'link_url',
    validate: {
      isUrl: {
        msg: 'Please provide a valid URL'
      }
    }
  },
  position: {
    type: DataTypes.ENUM('banner', 'sidebar', 'feed'),
    defaultValue: 'banner',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'active', 'expired'),
    defaultValue: 'pending',
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_date'
  },
  amountPaid: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'amount_paid'
  }
}, {
  tableName: 'advertisements',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['created_by'] },
    { fields: ['status'] },
    { fields: ['position'] },
    { fields: ['start_date', 'end_date'] }
  ]
});

module.exports = Advertisement;


