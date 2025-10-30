const { Listing, User, Interest } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const asyncHandler = require('../middleware/asyncHandler');
const { createNotification } = require('../utils/notifications');
const { sendInterestNotification } = require('../utils/email'); // Keep email for seller (important)
const { deleteListingFiles } = require('../utils/fileManager');

// @desc    Get all listings (with filters)
// @route   GET /api/marketplace/listings
// @access  Public
exports.getListings = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    minPrice,
    maxPrice,
    location,
    search,
    status = 'available'
  } = req.query;

  const where = {
    status: status
  };

  if (category) {
    where.category = category;
  }

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
    if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
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

  const { count, rows } = await Listing.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'seller',
        attributes: ['id', 'name', 'username', 'profilePicture'],
        required: false
      }
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: offset
  });

  // Format listings - hide contact info if not approved
  const formattedListings = rows.map(listing => {
    const listingData = listing.toJSON();
    const seller = listingData.seller;
    
    // Only show contact if seller is verified and contact is approved
    if (!seller.isVerified || !seller.canShowContact) {
      delete seller.phone;
      delete seller.email;
    }

    // Add profile picture URL if exists
    if (seller.profilePicture) {
      seller.profilePictureUrl = `/uploads/profile-pictures/${seller.profilePicture}`;
    }

    // Add image URLs
    if (listingData.images && listingData.images.length > 0) {
      listingData.imageUrls = listingData.images.map(img => 
        `/uploads/listings/${img}`
      );
    }

    return listingData;
  });

  res.status(200).json({
    success: true,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / parseInt(limit))
    },
    data: formattedListings
  });
});

// @desc    Get single listing
// @route   GET /api/marketplace/listings/:id
// @access  Public
exports.getListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: 'seller',
        attributes: ['id', 'name', 'username', 'profilePicture', 'phone', 'email', 'personalEmail', 'isVerified', 'canShowContact']
      },
      {
        model: Interest,
        as: 'interests',
        include: [
          {
            model: User,
            as: 'buyer',
            attributes: ['id', 'name', 'username']
          }
        ]
      }
    ]
  });

  if (!listing) {
    return res.status(404).json({
      success: false,
      message: 'Listing not found'
    });
  }

  const listingData = listing.toJSON();
  const seller = listingData.seller;

  // Hide contact info if not approved
  if (!seller.isVerified || !seller.canShowContact) {
    delete seller.phone;
    delete seller.email;
    delete seller.personalEmail;
  }

  // Add image URLs
  if (listingData.images && listingData.images.length > 0) {
    listingData.imageUrls = listingData.images.map(img => 
      `/uploads/listings/${img}`
    );
  }

  res.status(200).json({
    success: true,
    data: listingData
  });
});

// @desc    Create listing (verified users only)
// @route   POST /api/marketplace/listings
// @access  Private/Verified
exports.createListing = asyncHandler(async (req, res) => {
  const { title, description, price, category, location } = req.body;
  
  // Get uploaded images
  const images = req.files ? req.files.map(file => file.filename) : [];

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Your account must be verified to create listings. Please wait for administrator approval.'
    });
  }

  const listing = await Listing.create({
    userId: req.user.id,
    title,
    description,
    price: parseFloat(price),
    category,
    location,
    images: images || []
  });

  const listingData = listing.toJSON();
  if (listingData.images && listingData.images.length > 0) {
    listingData.imageUrls = listingData.images.map(img => 
      `/uploads/listings/${img}`
    );
  }

  res.status(201).json({
    success: true,
    message: 'Listing created successfully',
    data: listingData
  });
});

// @desc    Update listing
// @route   PUT /api/marketplace/listings/:id
// @access  Private
exports.updateListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findByPk(req.params.id);

  if (!listing) {
    return res.status(404).json({
      success: false,
      message: 'Listing not found'
    });
  }

  // Check ownership
  if (listing.userId !== req.user.id && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this listing'
    });
  }

  const { title, description, price, category, location, status } = req.body;
  
  // Handle image uploads if provided
  let imagesToUpdate = listing.images;
  if (req.files && req.files.length > 0) {
    imagesToUpdate = req.files.map(file => file.filename);
  }

  const updateData = {};
  if (title) updateData.title = title;
  if (description) updateData.description = description;
  if (price) updateData.price = parseFloat(price);
  if (category) updateData.category = category;
  if (location) updateData.location = location;
  if (imagesToUpdate) updateData.images = imagesToUpdate;
  if (status && ['available', 'pending', 'sold'].includes(status)) {
    updateData.status = status;
  }

  await listing.update(updateData);
  await listing.reload();

  const listingData = listing.toJSON();
  if (listingData.images && listingData.images.length > 0) {
    listingData.imageUrls = listingData.images.map(img => 
      `/uploads/listings/${img}`
    );
  }

  res.status(200).json({
    success: true,
    message: 'Listing updated successfully',
    data: listingData
  });
});

// @desc    Delete listing
// @route   DELETE /api/marketplace/listings/:id
// @access  Private
exports.deleteListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findByPk(req.params.id);

  if (!listing) {
    return res.status(404).json({
      success: false,
      message: 'Listing not found'
    });
  }

  // Check ownership
  if (listing.userId !== req.user.id && req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this listing'
    });
  }

  // Delete associated files before deleting the database record
  const uploadsBasePath = path.join(__dirname, '../..');
  const deletedFilesCount = await deleteListingFiles(listing, uploadsBasePath);
  
  if (deletedFilesCount > 0) {
    console.log(`✅ Deleted ${deletedFilesCount} file(s) for listing ${listing.id}`);
  }

  await listing.destroy();

  res.status(200).json({
    success: true,
    message: 'Listing deleted successfully',
    data: {
      deletedFilesCount
    }
  });
});

// @desc    Show interest in listing
// @route   POST /api/marketplace/listings/:id/interest
// @access  Private/Verified
exports.showInterest = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Your account must be verified to show interest in listings'
    });
  }

  const listing = await Listing.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: 'seller',
        attributes: ['id', 'name', 'personalEmail', 'isVerified', 'canShowContact']
      }
    ]
  });

  if (!listing) {
    return res.status(404).json({
      success: false,
      message: 'Listing not found'
    });
  }

  // Can't show interest in own listing
  if (listing.userId === req.user.id) {
    return res.status(400).json({
      success: false,
      message: 'You cannot show interest in your own listing'
    });
  }

  // Check if already showed interest
  const existingInterest = await Interest.findOne({
    where: {
      listingId: listing.id,
      buyerId: req.user.id
    }
  });

  if (existingInterest) {
    return res.status(400).json({
      success: false,
      message: 'You have already shown interest in this listing'
    });
  }

  // Create interest
  const interest = await Interest.create({
    listingId: listing.id,
    buyerId: req.user.id,
    sellerId: listing.userId,
    message: message || null
  });

  // Create in-app notification for seller
  await createNotification(
    listing.userId,
    'listing_interest',
    'New Interest in Your Listing',
    `${req.user.name} is interested in your listing: "${listing.title}". Contact admin to enable contact visibility.`,
    listing.id,
    'Listing',
    { buyerId: req.user.id, buyerName: req.user.name, listingTitle: listing.title }
  );

  // Send email to seller's personal email (important - they need to contact admin)
  if (listing.seller && listing.seller.personalEmail) {
    sendInterestNotification(
      listing.seller.personalEmail,
      listing.seller.name,
      req.user.name,
      listing.title,
      listing.price
    ).catch(err => {
      console.error('Failed to send interest notification email:', err);
    });
  }

  res.status(201).json({
    success: true,
    message: 'Interest shown successfully. The seller has been notified. Please contact and pay the administrator to enable contact information visibility.',
    data: interest
  });
});

// @desc    Get user's listings
// @route   GET /api/marketplace/my-listings
// @access  Private
exports.getMyListings = asyncHandler(async (req, res) => {
  const listings = await Listing.findAll({
    where: { userId: req.user.id },
    include: [
      {
        model: Interest,
        as: 'interests',
        include: [
          {
            model: User,
            as: 'buyer',
            attributes: ['id', 'name', 'username']
          }
        ]
      }
    ],
    order: [['created_at', 'DESC']]
  });

  const formattedListings = listings.map(listing => {
    const listingData = listing.toJSON();
    if (listingData.images && listingData.images.length > 0) {
      listingData.imageUrls = listingData.images.map(img => 
        `/uploads/listings/${img}`
      );
    }
    return listingData;
  });

  res.status(200).json({
    success: true,
    count: formattedListings.length,
    data: formattedListings
  });
});
