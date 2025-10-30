const { LostFound, User } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const asyncHandler = require('../middleware/asyncHandler');
const { notifyAllVerifiedUsers } = require('../utils/notifications');
const { deleteLostFoundFiles } = require('../utils/fileManager');

// @desc    Get all lost & found items
// @route   GET /api/lost-found
// @access  Public
exports.getLostFoundItems = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    type,
    status = 'active',
    location,
    search
  } = req.query;

  const where = {
    status: status
  };

  if (type) {
    where.type = type;
  }

  if (location) {
    where.location = { [Op.iLike]: `%${location}%` };
  }

  if (search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } }
    ];
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { count, rows } = await LostFound.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'postedBy',
        attributes: ['id', 'name', 'username', 'profilePicture']
      }
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: offset
  });

  const formattedItems = rows.map(item => {
    const itemData = item.toJSON();
    if (itemData.images && itemData.images.length > 0) {
      itemData.imageUrls = itemData.images.map(img => 
        `/uploads/lost-found/${img}`
      );
    }
    if (itemData.postedBy && itemData.postedBy.profilePicture) {
      itemData.postedBy.profilePictureUrl = `/uploads/profile-pictures/${itemData.postedBy.profilePicture}`;
    }
    return itemData;
  });

  res.status(200).json({
    success: true,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / parseInt(limit))
    },
    data: formattedItems
  });
});

// @desc    Get single lost & found item
// @route   GET /api/lost-found/:id
// @access  Public
exports.getLostFoundItem = asyncHandler(async (req, res) => {
  const item = await LostFound.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: 'postedBy',
        attributes: ['id', 'name', 'username', 'profilePicture', 'phone', 'email', 'isVerified', 'canShowContact']
      },
      {
        model: User,
        as: 'claimedByUser',
        attributes: ['id', 'name', 'username']
      }
    ]
  });

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Item not found'
    });
  }

  const itemData = item.toJSON();
  const postedBy = itemData.postedBy;

  // Hide contact if not approved
  if (!postedBy.isVerified || !postedBy.canShowContact) {
    delete postedBy.phone;
    delete postedBy.email;
  }

  if (itemData.images && itemData.images.length > 0) {
    itemData.imageUrls = itemData.images.map(img => 
      `/uploads/lost-found/${img}`
    );
  }

  res.status(200).json({
    success: true,
    data: itemData
  });
});

// @desc    Create lost & found item (verified users only)
// @route   POST /api/lost-found
// @access  Private/Verified
exports.createLostFoundItem = asyncHandler(async (req, res) => {
  const { type, title, description, location, dateLostOrFound } = req.body;
  
  // Get uploaded images
  const images = req.files ? req.files.map(file => file.filename) : [];

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Your account must be verified to post lost & found items'
    });
  }

  const item = await LostFound.create({
    userId: req.user.id,
    type,
    title,
    description,
    location,
    dateLostOrFound,
    images: images || []
  });

  // Create in-app notifications for all verified users (except poster)
  const allUsers = await User.findAll({
    where: { 
      isVerified: true,
      status: 'active',
      id: { [Op.ne]: req.user.id } // Don't notify the poster
    },
    attributes: ['id']
  });

  const userIds = allUsers.map(user => user.id);

  if (userIds.length > 0) {
    // Import here to avoid circular dependency
    const { createBulkNotifications } = require('../utils/notifications');
    
    // Create in-app notifications (async, don't block response)
    createBulkNotifications(
      userIds,
      'lost_found',
      `New ${type} Item: ${title}`,
      `A ${type} item has been posted. Check the Lost & Found section for details.`,
      item.id,
      'LostFound',
      { type, location }
    ).catch(err => {
      console.error('Failed to create notifications:', err);
    });
  }

  const itemData = item.toJSON();
  if (itemData.images && itemData.images.length > 0) {
    itemData.imageUrls = itemData.images.map(img => 
      `/uploads/lost-found/${img}`
    );
  }

  res.status(201).json({
    success: true,
    message: 'Lost & Found item posted successfully. All users have been notified.',
    data: itemData
  });
});

// @desc    Claim lost & found item
// @route   POST /api/lost-found/:id/claim
// @access  Private/Verified
exports.claimItem = asyncHandler(async (req, res) => {
  const item = await LostFound.findByPk(req.params.id);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Item not found'
    });
  }

  if (item.status !== 'active') {
    return res.status(400).json({
      success: false,
      message: 'This item is no longer available'
    });
  }

  item.status = 'claimed';
  item.claimedBy = req.user.id;
  await item.save();

  res.status(200).json({
    success: true,
    message: 'Item marked as claimed',
    data: item
  });
});

// @desc    Update lost & found item
// @route   PUT /api/lost-found/:id
// @access  Private
exports.updateLostFoundItem = asyncHandler(async (req, res) => {
  const item = await LostFound.findByPk(req.params.id);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Item not found'
    });
  }

  if (item.userId !== req.user.id && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this item'
    });
  }

  const { title, description, location, status } = req.body;
  
  // Handle image uploads if provided
  let imagesToUpdate = item.images;
  if (req.files && req.files.length > 0) {
    imagesToUpdate = req.files.map(file => file.filename);
  }

  const updateData = {};
  if (title) updateData.title = title;
  if (description) updateData.description = description;
  if (location) updateData.location = location;
  if (imagesToUpdate) updateData.images = imagesToUpdate;
  if (status && ['active', 'claimed', 'archived'].includes(status)) {
    updateData.status = status;
  }

  await item.update(updateData);
  await item.reload();

  const itemData = item.toJSON();
  if (itemData.images && itemData.images.length > 0) {
    itemData.imageUrls = itemData.images.map(img => 
      `/uploads/lost-found/${img}`
    );
  }

  res.status(200).json({
    success: true,
    message: 'Item updated successfully',
    data: itemData
  });
});

// @desc    Delete lost & found item
// @route   DELETE /api/lost-found/:id
// @access  Private
exports.deleteLostFoundItem = asyncHandler(async (req, res) => {
  const item = await LostFound.findByPk(req.params.id);

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Item not found'
    });
  }

  if (item.userId !== req.user.id && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this item'
    });
  }

  // Delete associated files before deleting the database record
  const uploadsBasePath = path.join(__dirname, '../..');
  const deletedFilesCount = await deleteLostFoundFiles(item, uploadsBasePath);
  
  if (deletedFilesCount > 0) {
    console.log(`✅ Deleted ${deletedFilesCount} file(s) for lost & found item ${item.id}`);
  }

  await item.destroy();

  res.status(200).json({
    success: true,
    message: 'Item deleted successfully',
    data: {
      deletedFilesCount
    }
  });
});
