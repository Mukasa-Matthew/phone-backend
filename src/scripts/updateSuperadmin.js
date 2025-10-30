const { User } = require('../models');
require('dotenv').config();

/**
 * Update or create superadmin with custom credentials
 * Usage: node src/scripts/updateSuperadmin.js
 */
const updateSuperadmin = async () => {
  try {
    // Your credentials
    const email = 'matthewmukasa0@gmail.com'; // Note: Using matthewmukasa0 (with 'w')
    const password = '1100211Matt.';
    const name = 'Matthew Mukasa';

    // Check if superadmin exists
    let superadmin = await User.findOne({ 
      where: { role: 'superadmin' } 
    });

    if (superadmin) {
      // Update existing superadmin
      superadmin.email = email;
      superadmin.name = name;
      superadmin.password = password; // Will be hashed by the hook
      await superadmin.save();
      console.log('✅ Superadmin updated successfully!');
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 Password: ${password}`);
    } else {
      // Create new superadmin
      const superadminData = {
        name,
        username: 'superadmin',
        email,
        schoolEmail: email, // Using same email for school
        password,
        dateOfBirth: '1990-01-01',
        role: 'superadmin',
        status: 'active',
        isVerified: true,
        canShowContact: true
      };

      superadmin = await User.create(superadminData);
      console.log('✅ Superadmin created successfully!');
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 Password: ${password}`);
    }

    console.log('⚠️  You can now login with these credentials in the frontend!');
  } catch (error) {
    console.error('❌ Error updating superadmin:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  updateSuperadmin()
    .then(() => {
      console.log('✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = updateSuperadmin;

