const { User } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all users with full details (Superadmin only)
// @route   GET /api/admin/users
// @access  Private/Superadmin
exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    attributes: [
      'id',
      'name',
      'username',
      'email',
      'phone',
      'dateOfBirth',
      'profilePicture',
      'role',
      'status',
      'isVerified',
      'canShowContact',
      'schoolEmail',
      'universityName',
      'createdAt',
      'updatedAt'
    ],
    order: [['created_at', 'DESC']]
  });

  // Format users data with profile picture URLs
  const formattedUsers = users.map(user => {
    const userData = user.toJSON();
    if (userData.profilePicture) {
      userData.profilePictureUrl = `/uploads/profile-pictures/${userData.profilePicture}`;
    }
    return userData;
  });

  res.status(200).json({
    success: true,
    count: formattedUsers.length,
    data: formattedUsers
  });
});

// @desc    Get single user by ID (Superadmin only)
// @route   GET /api/admin/users/:id
// @access  Private/Superadmin
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    attributes: [
      'id',
      'name',
      'username',
      'email',
      'phone',
      'dateOfBirth',
      'profilePicture',
      'role',
      'status',
      'isVerified',
      'canShowContact',
      'schoolEmail',
      'universityName',
      'createdAt',
      'updatedAt'
    ]
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const userData = user.toJSON();
  if (userData.profilePicture) {
    userData.profilePictureUrl = `/uploads/profile-pictures/${userData.profilePicture}`;
  }

  res.status(200).json({
    success: true,
    data: userData
  });
});

// @desc    Update user status (Superadmin only)
// @route   PUT /api/admin/users/:id/status
// @access  Private/Superadmin
exports.updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const userId = req.params.id;

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Status must be either "active" or "inactive"'
    });
  }

  const user = await User.findByPk(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Prevent deactivating superadmin account
  if (user.role === 'superadmin' && status === 'inactive') {
    return res.status(403).json({
      success: false,
      message: 'Cannot deactivate superadmin account'
    });
  }

  user.status = status;
  await user.save();

  res.status(200).json({
    success: true,
    message: `User status updated to ${status}`,
    data: user
  });
});

