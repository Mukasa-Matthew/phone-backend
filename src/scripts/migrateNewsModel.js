const { sequelize } = require('../config/database');

async function migrateNewsModel() {
  try {
    console.log('🔄 Starting News model migration...');
    
    // Check if publisher_name column exists
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'news' AND column_name = 'publisher_name'
    `);

    if (results.length === 0) {
      console.log('📝 Adding publisher_name column to news table...');
      
      // Add publisher_name column as nullable
      await sequelize.query(`
        ALTER TABLE news 
        ADD COLUMN publisher_name VARCHAR(255) NULL
      `);
      
      console.log('✅ Successfully added publisher_name column');
    } else {
      console.log('✅ publisher_name column already exists');
    }
    
    console.log('✅ News model migration completed');
  } catch (error) {
    console.error('❌ Error during News model migration:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateNewsModel()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateNewsModel;


