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

    // Register models and associations
    require('../models');

    // 1) Ensure base tables exist first to prevent ALTER errors on fresh DBs
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Base tables ensured (created if not existing).');

    // 2) Run idempotent migrations to evolve schema safely
    const migrateUserModel = require('../scripts/migrateUserModel');
    await migrateUserModel();

    const migrateNewsModel = require('../scripts/migrateNewsModel');
    await migrateNewsModel();

    const migrateUserUniversity = require('../scripts/migrateUserUniversity');
    await migrateUserUniversity();

    const removePersonalEmail = require('../scripts/removePersonalEmail');
    await removePersonalEmail();

    console.log('✅ Migrations executed successfully.');

    // 3) Seed superadmin if it doesn't exist
    const seedSuperadmin = require('../scripts/seedSuperadmin');
    await seedSuperadmin();
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

module.exports = { sequelize, initializeDatabase };
