const { User } = require('../models');
require('dotenv').config();

const seedSuperadmin = async () => {
  try {
    // Check if superadmin already exists
    const existingSuperadmin = await User.findOne({ 
      where: { role: 'superadmin' } 
    });

    if (existingSuperadmin) {
      console.log('✅ Superadmin already exists.');
      return;
    }

    // Default superadmin credentials from environment
    const superadminData = {
      name: process.env.SUPERADMIN_NAME || 'Super Admin',
      username: process.env.SUPERADMIN_USERNAME || 'superadmin',
      email: process.env.SUPERADMIN_EMAIL || 'superadmin@example.com',
      schoolEmail: process.env.SUPERADMIN_SCHOOL_EMAIL || process.env.SUPERADMIN_EMAIL || 'superadmin@example.com',
      password: process.env.SUPERADMIN_PASSWORD || 'admin123456',
      dateOfBirth: process.env.SUPERADMIN_DOB || '1990-01-01',
      universityName: process.env.SUPERADMIN_UNIVERSITY || 'University Not Specified',
      role: 'superadmin',
      status: 'active',
      isVerified: true, // Superadmin is auto-verified
      canShowContact: true // Superadmin can show contact
    };

    // Create superadmin
    const superadmin = await User.create(superadminData);

    console.log('✅ Superadmin created successfully!');
    console.log(`📧 Email: ${superadmin.email}`);
    console.log(`🔑 Password: ${process.env.SUPERADMIN_PASSWORD || 'admin123456'}`);
    console.log('⚠️  Please change the default password after first login!');
  } catch (error) {
    console.error('❌ Error seeding superadmin:', error);
    throw error;
  }
};

module.exports = seedSuperadmin;
