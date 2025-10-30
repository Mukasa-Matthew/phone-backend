const { User, Listing, LostFound, Interest, News, Advertisement } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const { sendApprovalEmail } = require('../utils/email'); // Keep approval emails (important)
const { createNotification } = require('../utils/notifications');

// @desc    Approve user verification
// @route   PUT /api/admin/users/:id/verify
// @access  Private/Superadmin
exports.verifyUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (user.isVerified) {
    return res.status(400).json({
      success: false,
      message: 'User is already verified'
    });
  }

  user.isVerified = true;
  await user.save();

  // Create in-app notification
  await createNotification(
    user.id,
    'verification_approved',
    'Account Verified',
    'Your account has been verified! You can now use all features of the platform.',
    null,
    null,
    null
  );

  // Send approval email to user's registered email (important notification)
  sendApprovalEmail(user.email, user.name, 'Verified').catch(err => {
    console.error('Failed to send approval email:', err);
  });

  res.status(200).json({
    success: true,
    message: 'User verified successfully. Approval email sent.',
    data: user
  });
});

// @desc    Approve contact visibility (after payment)
// @route   PUT /api/admin/users/:id/approve-contact
// @access  Private/Superadmin
exports.approveContact = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (!user.isVerified) {
    return res.status(400).json({
      success: false,
      message: 'User must be verified first'
    });
  }

  if (user.canShowContact) {
    return res.status(400).json({
      success: false,
      message: 'Contact is already approved'
    });
  }

  user.canShowContact = true;
  await user.save();

  // Also approve all their listings
  await Listing.update(
    { contactApproved: true },
    { where: { userId: user.id } }
  );

  // Create in-app notification
  await createNotification(
    user.id,
    'contact_approved',
    'Contact Visibility Approved',
    'Your contact information is now visible to other users. Interested buyers can now contact you directly!',
    null,
    null,
    null
  );

  // Send approval email to user's registered email (important notification)
  sendApprovalEmail(user.email, user.name, 'Contact Approved').catch(err => {
    console.error('Failed to send approval email:', err);
  });

  res.status(200).json({
    success: true,
    message: 'Contact approved successfully. Approval email sent.',
    data: user
  });
});

// @desc    Approve listing contact (for specific listing)
// @route   PUT /api/admin/listings/:id/approve-contact
// @access  Private/Superadmin
exports.approveListingContact = asyncHandler(async (req, res) => {
  const listing = await Listing.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: 'seller'
      }
    ]
  });

  if (!listing) {
    return res.status(404).json({
      success: false,
      message: 'Listing not found'
    });
  }

  listing.contactApproved = true;
  await listing.save();

  res.status(200).json({
    success: true,
    message: 'Listing contact approved successfully',
    data: listing
  });
});

// @desc    Get pending verifications
// @route   GET /api/admin/pending-verifications
// @access  Private/Superadmin
exports.getPendingVerifications = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    where: { isVerified: false },
    attributes: ['id', 'name', 'username', 'email', 'schoolEmail', 'createdAt'],
    order: [['created_at', 'ASC']]
  });

  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

// @desc    Get pending contact approvals
// @route   GET /api/admin/pending-contact-approvals
// @access  Private/Superadmin
exports.getPendingContactApprovals = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    where: { 
      isVerified: true,
      canShowContact: false
    },
    attributes: ['id', 'name', 'username', 'email', 'createdAt'],
    include: [
      {
        model: Listing,
        as: 'listings',
        where: { status: 'available' },
        required: false,
        attributes: ['id', 'title', 'price']
      }
    ],
    order: [['created_at', 'ASC']]
  });

  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

// @desc    Get all listings with management info
// @route   GET /api/admin/listings
// @access  Private/Superadmin
exports.getAllListings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (status) {
    where.status = status;
  }

  const { count, rows } = await Listing.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'seller',
        attributes: ['id', 'name', 'username', 'email', 'phone', 'isVerified', 'canShowContact']
      },
      {
        model: Interest,
        as: 'interests',
        attributes: ['id', 'status', 'createdAt']
      }
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: offset
  });

  res.status(200).json({
    success: true,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / parseInt(limit))
    },
    data: rows
  });
});

// @desc    Get all interests/inquiries
// @route   GET /api/admin/interests
// @access  Private/Superadmin
exports.getAllInterests = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (status) {
    where.status = status;
  }

  const { count, rows } = await Interest.findAndCountAll({
    where,
    include: [
      {
        model: Listing,
        as: 'listing',
        attributes: ['id', 'title', 'price']
      },
      {
        model: User,
        as: 'buyer',
        attributes: ['id', 'name', 'username', 'email', 'phone']
      },
      {
        model: User,
        as: 'seller',
        attributes: ['id', 'name', 'username', 'email', 'phone', 'canShowContact']
      }
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: offset
  });

  res.status(200).json({
    success: true,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / parseInt(limit))
    },
    data: rows
  });
});

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private/Superadmin
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.count();
  const verifiedUsers = await User.count({ where: { isVerified: true } });
  const pendingVerifications = await User.count({ where: { isVerified: false } });
  const pendingContactApprovals = await User.count({ 
    where: { isVerified: true, canShowContact: false } 
  });

  const totalListings = await Listing.count();
  const activeListings = await Listing.count({ where: { status: 'available' } });
  const soldListings = await Listing.count({ where: { status: 'sold' } });
  const pendingListings = await Listing.count({ where: { status: 'pending' } });

  const totalInterests = await Interest.count();
  const pendingInterests = await Interest.count({ where: { status: 'pending' } });

  const totalLostFound = await LostFound.count();
  const activeLostFound = await LostFound.count({ where: { status: 'active' } });

  const totalNews = await News.count();
  const publishedNews = await News.count({ where: { status: 'published' } });

  // Always query fresh counts from database (no caching)
  const totalAds = await Advertisement.count({});
  const activeAds = await Advertisement.count({ where: { status: 'active' } });
  const pendingAds = await Advertisement.count({ where: { status: 'pending' } });

  res.status(200).json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        pendingVerification: pendingVerifications,
        pendingContactApproval: pendingContactApprovals
      },
      marketplace: {
        totalListings,
        activeListings,
        soldListings,
        pendingListings,
        totalInterests,
        pendingInterests
      },
      lostFound: {
        total: totalLostFound,
        active: activeLostFound
      },
      news: {
        total: totalNews,
        published: publishedNews
      },
      advertisements: {
        total: totalAds,
        active: activeAds,
        pending: pendingAds
      }
    }
  });
});
