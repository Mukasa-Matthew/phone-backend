const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// Migrate existing users table to add new required fields
const migrateUserModel = async () => {
  try {
    // Check if username column exists
    const usernameCheck = await sequelize.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name='users' AND column_name='username'`,
      { type: QueryTypes.SELECT }
    );

    // If username doesn't exist, add it
    if (usernameCheck.length === 0) {
      console.log('🔄 Adding username column...');
      
      // First add as nullable
      await sequelize.query(
        `ALTER TABLE users ADD COLUMN username VARCHAR(255)`,
        { type: QueryTypes.RAW }
      );

      // Update existing rows: generate username from email or id
      // First, get all users to update them individually
      const existingUsers = await sequelize.query(
        `SELECT id, email FROM users WHERE username IS NULL`,
        { type: QueryTypes.SELECT }
      );

      for (const user of existingUsers) {
        let username = '';
        if (user.email) {
          // Extract username from email and clean it
          username = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
          // Ensure it's not empty
          if (!username) {
            username = `user${user.id}`;
          }
        } else {
          username = `user${user.id}`;
        }

        // Make sure username is unique by appending id if needed
        const existingUsername = await sequelize.query(
          `SELECT id FROM users WHERE username = :username AND id != :userId`,
          { 
            type: QueryTypes.SELECT,
            replacements: { username, userId: user.id }
          }
        );

        if (existingUsername.length > 0) {
          username = `${username}${user.id}`;
        }

        await sequelize.query(
          `UPDATE users SET username = :username WHERE id = :userId`,
          { 
            type: QueryTypes.RAW,
            replacements: { username, userId: user.id }
          }
        );
      }

      // Make it NOT NULL
      await sequelize.query(
        `ALTER TABLE users ALTER COLUMN username SET NOT NULL`,
        { type: QueryTypes.RAW }
      );

      // Add unique constraint
      await sequelize.query(
        `ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username)`,
        { type: QueryTypes.RAW }
      );

      console.log('✅ Username column added successfully');
    }

    // Check if date_of_birth column exists
    const dobCheck = await sequelize.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name='users' AND column_name='date_of_birth'`,
      { type: QueryTypes.SELECT }
    );

    // If date_of_birth doesn't exist, add it
    if (dobCheck.length === 0) {
      console.log('🔄 Adding date_of_birth column...');
      
      // Add with default value for existing rows
      await sequelize.query(
        `ALTER TABLE users ADD COLUMN date_of_birth DATE DEFAULT '1990-01-01'`,
        { type: QueryTypes.RAW }
      );

      // Make it NOT NULL (after setting defaults)
      await sequelize.query(
        `ALTER TABLE users ALTER COLUMN date_of_birth SET NOT NULL`,
        { type: QueryTypes.RAW }
      );

      // Remove default after making NOT NULL
      await sequelize.query(
        `ALTER TABLE users ALTER COLUMN date_of_birth DROP DEFAULT`,
        { type: QueryTypes.RAW }
      );

      console.log('✅ Date of birth column added successfully');
    }

    // Check if profile_picture column exists
    const pictureCheck = await sequelize.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name='users' AND column_name='profile_picture'`,
      { type: QueryTypes.SELECT }
    );

    // If profile_picture doesn't exist, add it
    if (pictureCheck.length === 0) {
      console.log('🔄 Adding profile_picture column...');
      
      await sequelize.query(
        `ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255)`,
        { type: QueryTypes.RAW }
      );

      console.log('✅ Profile picture column added successfully');
    }

    // personal_email column has been removed - no longer needed

    // Check if school_email column exists
    const schoolEmailCheck = await sequelize.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name='users' AND column_name='school_email'`,
      { type: QueryTypes.SELECT }
    );

    // If school_email doesn't exist, add it
    if (schoolEmailCheck.length === 0) {
      console.log('🔄 Adding school_email column...');
      
      await sequelize.query(
        `ALTER TABLE users ADD COLUMN school_email VARCHAR(255)`,
        { type: QueryTypes.RAW }
      );

      console.log('✅ School email column added successfully');
    }

    // Check if is_verified column exists
    const isVerifiedCheck = await sequelize.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name='users' AND column_name='is_verified'`,
      { type: QueryTypes.SELECT }
    );

    // If is_verified doesn't exist, add it
    if (isVerifiedCheck.length === 0) {
      console.log('🔄 Adding is_verified column...');
      
      await sequelize.query(
        `ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT false NOT NULL`,
        { type: QueryTypes.RAW }
      );

      console.log('✅ Is verified column added successfully');
    }

    // Check if can_show_contact column exists
    const canShowContactCheck = await sequelize.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name='users' AND column_name='can_show_contact'`,
      { type: QueryTypes.SELECT }
    );

    // If can_show_contact doesn't exist, add it
    if (canShowContactCheck.length === 0) {
      console.log('🔄 Adding can_show_contact column...');
      
      await sequelize.query(
        `ALTER TABLE users ADD COLUMN can_show_contact BOOLEAN DEFAULT false NOT NULL`,
        { type: QueryTypes.RAW }
      );

      console.log('✅ Can show contact column added successfully');
    }

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
};

module.exports = migrateUserModel;
