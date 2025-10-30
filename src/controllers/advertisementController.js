const { Advertisement, User } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const asyncHandler = require('../middleware/asyncHandler');
const { deleteAdvertisementFiles } = require('../utils/fileManager');

// @desc    Get all active advertisements
// @route   GET /api/advertisements
// @access  Public
exports.getAdvertisements = asyncHandler(async (req, res) => {
  const { position, status } = req.query;

  const where = {};

  // If not superadmin, only show active ads
  if (!req.user || req.user.role !== 'superadmin') {
    where.status = 'active';
    where[Op.or] = [
      { startDate: { [Op.lte]: new Date() } },
      { startDate: null }
    ];
    where[Op.or] = [
      { endDate: { [Op.gte]: new Date() } },
      { endDate: null }
    ];
  } else {
    // For superadmin, allow status filter
    if (status && status !== 'all') {
      where.status = status;
    }
    // If status is 'all' or not provided, show all advertisements (no status filter)
  }

  if (position) {
    where.position = position;
  }

  const ads = await Advertisement.findAll({
    where,
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'username']
      }
    ],
    order: [['created_at', 'DESC']]
  });

  // Format ads data
  const formattedAds = ads.map(ad => {
    const adData = ad.toJSON();
    
    // Add image URLs - handle both array and single string formats
    if (adData.images) {
      // Handle PostgreSQL array format or JavaScript array
      let imageArray = [];
      
      if (Array.isArray(adData.images)) {
        imageArray = adData.images;
      } else if (typeof adData.images === 'string') {
        // Try to parse if it's a string representation of an array
        try {
          const parsed = JSON.parse(adData.images);
          imageArray = Array.isArray(parsed) ? parsed : [adData.images];
        } catch {
          // If not JSON, treat as single filename
          imageArray = [adData.images];
        }
      }
      
      // Filter and create URLs
      if (imageArray.length > 0) {
        adData.imageUrls = imageArray
          .filter(img => img && typeof img === 'string' && img.trim() !== '') // Filter out empty strings
          .map(img => `/uploads/advertisements/${img.trim()}`);
      }
    }

    // Add video URL
    if (adData.videoFile) {
      adData.videoUrl = `/uploads/advertisements/${adData.videoFile}`;
    }

    return adData;
  });

  res.status(200).json({
    success: true,
    count: formattedAds.length,
    data: formattedAds
  });
});

// @desc    Get single advertisement
// @route   GET /api/advertisements/:id
// @access  Public
exports.getAdvertisementById = asyncHandler(async (req, res) => {
  const ad = await Advertisement.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'username']
      }
    ]
  });

  if (!ad) {
    return res.status(404).json({
      success: false,
      message: 'Advertisement not found'
    });
  }

  const adData = ad.toJSON();
  
  // Add image URLs
  if (adData.images && adData.images.length > 0) {
    adData.imageUrls = adData.images.map(img => 
      `/uploads/advertisements/${img}`
    );
  }

  // Add video URL
  if (adData.videoFile) {
    adData.videoUrl = `/uploads/advertisements/${adData.videoFile}`;
  }

  res.status(200).json({
    success: true,
    data: adData
  });
});

// @desc    Create advertisement (superadmin only)
// @route   POST /api/advertisements
// @access  Private/Superadmin
exports.createAdvertisement = asyncHandler(async (req, res) => {
  const {
    advertiserName,
    title,
    description,
    videoUrl,
    linkUrl,
    position,
    startDate,
    endDate,
    amountPaid,
    status
  } = req.body;
  
  // Get uploaded images and video
  const images = req.files?.images ? req.files.images.map(file => file.filename) : [];
  const videoFile = req.files?.video && req.files.video.length > 0 ? req.files.video[0].filename : null;

  const ad = await Advertisement.create({
    createdBy: req.user.id,
    advertiserName,
    title,
    description: description || null,
    images: images || [],
    videoUrl: videoUrl || null,
    videoFile: videoFile || null,
    linkUrl: linkUrl || null,
    position: position || 'banner',
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    amountPaid: amountPaid ? parseFloat(amountPaid) : null,
    status: status || 'pending'
  });

  const adData = ad.toJSON();
  if (adData.images && adData.images.length > 0) {
    adData.imageUrls = adData.images.map(img => 
      `/uploads/advertisements/${img}`
    );
  }

  res.status(201).json({
    success: true,
    message: 'Advertisement created successfully',
    data: adData
  });
});

// @desc    Update advertisement
// @route   PUT /api/advertisements/:id
// @access  Private/Superadmin
exports.updateAdvertisement = asyncHandler(async (req, res) => {
  const ad = await Advertisement.findByPk(req.params.id);

  if (!ad) {
    return res.status(404).json({
      success: false,
      message: 'Advertisement not found'
    });
  }

  const {
    advertiserName,
    title,
    description,
    videoUrl,
    linkUrl,
    position,
    startDate,
    endDate,
    amountPaid,
    status
  } = req.body;
  
  // Handle uploaded images and video
  let imagesToUpdate = ad.images;
  let videoFileToUpdate = ad.videoFile;
  
  if (req.files?.images && req.files.images.length > 0) {
    imagesToUpdate = req.files.images.map(file => file.filename);
  }
  
  if (req.files?.video && req.files.video.length > 0) {
    videoFileToUpdate = req.files.video[0].filename;
  }

  const updateData = {};
  if (advertiserName) updateData.advertiserName = advertiserName;
  if (title) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (imagesToUpdate) updateData.images = imagesToUpdate;
  if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
  if (videoFileToUpdate !== undefined) updateData.videoFile = videoFileToUpdate;
  if (linkUrl !== undefined) updateData.linkUrl = linkUrl;
  if (position) updateData.position = position;
  if (startDate) updateData.startDate = new Date(startDate);
  if (endDate) updateData.endDate = new Date(endDate);
  if (amountPaid) updateData.amountPaid = parseFloat(amountPaid);
  if (status) updateData.status = status;

  await ad.update(updateData);
  await ad.reload();

  const adData = ad.toJSON();
  if (adData.images && adData.images.length > 0) {
    adData.imageUrls = adData.images.map(img => 
      `/uploads/advertisements/${img}`
    );
  }

  res.status(200).json({
    success: true,
    message: 'Advertisement updated successfully',
    data: adData
  });
});

// @desc    Approve advertisement
// @route   PUT /api/advertisements/:id/approve
// @access  Private/Superadmin
exports.approveAdvertisement = asyncHandler(async (req, res) => {
  const ad = await Advertisement.findByPk(req.params.id);

  if (!ad) {
    return res.status(404).json({
      success: false,
      message: 'Advertisement not found'
    });
  }

  ad.status = 'active';
  await ad.save();

  res.status(200).json({
    success: true,
    message: 'Advertisement approved and activated',
    data: ad
  });
});

// @desc    Delete advertisement
// @route   DELETE /api/advertisements/:id
// @access  Private/Superadmin
exports.deleteAdvertisement = asyncHandler(async (req, res) => {
  const ad = await Advertisement.findByPk(req.params.id);

  if (!ad) {
    return res.status(404).json({
      success: false,
      message: 'Advertisement not found'
    });
  }

  // Delete associated files before deleting the database record
  const uploadsBasePath = path.join(__dirname, '../..');
  const deletedFilesCount = await deleteAdvertisementFiles(ad, uploadsBasePath);
  
  if (deletedFilesCount > 0) {
    console.log(`✅ Deleted ${deletedFilesCount} file(s) for advertisement ${ad.id}`);
  }
  
  // Hard delete from database
  await ad.destroy();

  // Verify deletion
  const verifyDelete = await Advertisement.findByPk(req.params.id);
  if (verifyDelete) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete advertisement'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Advertisement deleted successfully',
    data: {
      deletedId: req.params.id,
      deletedFilesCount
    }
  });
});
