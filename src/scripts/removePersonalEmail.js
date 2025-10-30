const { sequelize } = require('../config/database');

/**
 * Migration script to remove personal_email column from users table
 */
async function removePersonalEmail() {
  try {
    console.log('Starting personal_email column removal...');

    // Check if column exists
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'personal_email'
    `);

    if (results.length === 0) {
      console.log('✓ personal_email column does not exist. Nothing to remove.');
      return;
    }

    // Drop the column
    console.log('Removing personal_email column...');
    await sequelize.query(`
      ALTER TABLE users 
      DROP COLUMN personal_email
    `);

    console.log('✓ personal_email column removed successfully!');
  } catch (error) {
    console.error('Error removing personal_email column:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  removePersonalEmail()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = removePersonalEmail;


