const { User } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const fs = require('fs');
const path = require('path');

// @desc    Update user profile (excluding date of birth, but all users including superadmin can update)
// @route   PUT /api/profile
// @access  Private (all users including superadmin)
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, username, email, phone } = req.body;
  const userId = req.user.id;

  // Get user
  const user = await User.findByPk(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Check if username is being changed and if it's already taken
  if (username && username !== user.username) {
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Username already taken'
      });
    }
  }

  // Check if email is being changed and if it's already taken
  if (email && email !== user.email) {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already taken'
      });
    }
  }

  // Update allowed fields (excluding date_of_birth and school email)
  // All users including superadmin can update: name, username, email, phone
  const updateData = {};
  if (name) updateData.name = name;
  if (username) updateData.username = username;
  if (email) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;

  await user.update(updateData);

  // Refresh user to get updated data
  await user.reload();

  const userData = user.toJSON();
  if (userData.profilePicture) {
    userData.profilePictureUrl = `/uploads/profile-pictures/${userData.profilePicture}`;
  }

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: userData
  });
});

// @desc    Upload profile picture
// @route   POST /api/profile/picture
// @access  Private
exports.uploadProfilePicture = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a picture'
    });
  }

  const user = await User.findByPk(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Delete old profile picture if exists
  if (user.profilePicture) {
    const oldPicturePath = path.join(__dirname, '../../uploads/profile-pictures', user.profilePicture);
    if (fs.existsSync(oldPicturePath)) {
      fs.unlinkSync(oldPicturePath);
    }
  }

  // Update profile picture path
  user.profilePicture = req.file.filename;
  await user.save();

  const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;

  res.status(200).json({
    success: true,
    message: 'Profile picture uploaded successfully',
    data: {
      user,
      profilePicture: req.file.filename,
      profilePictureUrl: profilePictureUrl
    }
  });
});

// @desc    Get user profile
// @route   GET /api/profile
// @access  Private
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);

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
