const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Listing = sequelize.define('Listing', {
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
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: {
        args: [0],
        msg: 'Price cannot be negative'
      }
    }
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Category is required'
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
  images: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  },
  status: {
    type: DataTypes.ENUM('available', 'pending', 'sold'),
    defaultValue: 'available',
    allowNull: false
  },
  contactApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'contact_approved'
  }
}, {
  tableName: 'listings',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['category'] },
    { fields: ['status'] },
    { fields: ['created_at'] }
  ],
  hooks: {
    // Auto-delete listing after 1 month if not sold
    afterCreate: async (listing) => {
      // Schedule auto-deletion after 30 days
      setTimeout(async () => {
        try {
          const updatedListing = await listing.reload();
          if (updatedListing.status !== 'sold') {
            await updatedListing.destroy();
            console.log(`✅ Auto-deleted listing ${listing.id} after 30 days`);
          }
        } catch (error) {
          console.error('Error auto-deleting listing:', error);
        }
      }, 30 * 24 * 60 * 60 * 1000); // 30 days in milliseconds
    }
  }
});

module.exports = Listing;


