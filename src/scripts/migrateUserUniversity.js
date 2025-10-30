const { sequelize } = require('../config/database');

/**
 * Migration script to add university_name column to users table
 * This script safely adds the column, handling existing data gracefully
 */
async function migrateUserUniversity() {
  try {
    console.log('Starting university_name migration...');

    // Check if column already exists
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'university_name'
    `);

    if (results.length > 0) {
      console.log('✓ university_name column already exists. Skipping migration.');
      return;
    }

    // Add column as nullable first (to handle existing users)
    console.log('Adding university_name column...');
    await sequelize.query(`
      ALTER TABLE users 
      ADD COLUMN university_name VARCHAR(200) NULL
    `);

    // Update existing users with a default value
    // For existing users without a university, use a placeholder
    await sequelize.query(`
      UPDATE users 
      SET university_name = 'University Not Specified' 
      WHERE university_name IS NULL
    `);

    // Now make it NOT NULL with a default for future inserts
    await sequelize.query(`
      ALTER TABLE users 
      ALTER COLUMN university_name SET NOT NULL,
      ALTER COLUMN university_name SET DEFAULT 'University Not Specified'
    `);

    console.log('✓ university_name column added successfully!');
  } catch (error) {
    console.error('Error migrating university_name column:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateUserUniversity()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateUserUniversity;

