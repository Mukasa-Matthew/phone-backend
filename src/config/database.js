const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test connection and sync models
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Run migrations for existing tables first (handles new columns gracefully)
    const migrateUserModel = require('../scripts/migrateUserModel');
    await migrateUserModel();
    
    const migrateNewsModel = require('../scripts/migrateNewsModel');
    await migrateNewsModel();

    const migrateUserUniversity = require('../scripts/migrateUserUniversity');
    await migrateUserUniversity();

    const removePersonalEmail = require('../scripts/removePersonalEmail');
    await removePersonalEmail();

    // Sync all models - this will create tables if they don't exist
    // force: false means it won't drop existing tables
    // alter: false to avoid conflicts after manual migration
    await sequelize.sync({ 
      force: false, 
      alter: false 
    });
    console.log('✅ All models synchronized successfully.');

    // Seed superadmin if it doesn't exist (import here to avoid circular dependency)
    const seedSuperadmin = require('../scripts/seedSuperadmin');
    await seedSuperadmin();
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

module.exports = { sequelize, initializeDatabase };
