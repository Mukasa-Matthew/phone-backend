const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const profileRoutes = require('./profileRoutes');
const adminRoutes = require('./adminRoutes');
const userRoutes = require('./userRoutes');
const marketplaceRoutes = require('./marketplaceRoutes');
const lostFoundRoutes = require('./lostFoundRoutes');
const newsRoutes = require('./newsRoutes');
const advertisementRoutes = require('./advertisementRoutes');
const notificationRoutes = require('./notificationRoutes');

// API routes
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/admin', adminRoutes);
router.use('/users', userRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/lost-found', lostFoundRoutes);
router.use('/news', newsRoutes);
router.use('/advertisements', advertisementRoutes);
router.use('/notifications', notificationRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
