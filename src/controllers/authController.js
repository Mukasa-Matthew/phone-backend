const { User } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const { generateToken } = require('../utils/jwt');
const { sendWelcomeEmail } = require('../utils/email');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res) => {
  const { name, username, email, schoolEmail, password, phone, dateOfBirth, universityName } = req.body;

  // Check if user already exists by email
  const existingUserByEmail = await User.findOne({ where: { email } });

  if (existingUserByEmail) {
    return res.status(409).json({
      success: false,
      message: 'User already exists with this email'
    });
  }

  // Check if username already exists
  const existingUserByUsername = await User.findOne({ where: { username } });

  if (existingUserByUsername) {
    return res.status(409).json({
      success: false,
      message: 'Username already taken'
    });
  }

  // Check if school email already exists
  const existingUserBySchoolEmail = await User.findOne({ where: { schoolEmail } });

  if (existingUserBySchoolEmail) {
    return res.status(409).json({
      success: false,
      message: 'School email already registered'
    });
  }

  // Create user (role defaults to 'user', isVerified defaults to false)
  const user = await User.create({
    name,
    username,
    email, // This will be used for login (can be same as school email)
    schoolEmail,
    password,
    phone: phone || null,
    dateOfBirth,
    universityName, // University name for multi-university support (required)
    isVerified: false, // Requires admin approval
    canShowContact: false // Requires admin approval after payment
  });

  // Generate token
  const token = generateToken(user.id, user.role);

  // No welcome email - users will see in-app notification when verified

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please wait for administrator verification to access all features.',
    data: {
      user,
      token
    }
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password'
    });
  }

  // Find user and include password (since we need to compare it)
  const user = await User.findOne({ where: { email } });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check if user is active
  if (user.status !== 'active') {
    return res.status(401).json({
      success: false,
      message: 'Account is inactive. Please contact administrator'
    });
  }

  // Check password
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Generate token
  const token = generateToken(user.id, user.role);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user,
      token
    }
  });
});

// @desc    Login superadmin
// @route   POST /api/auth/superadmin/login
// @access  Public
exports.superadminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password'
    });
  }

  // Find user with superadmin role
  const user = await User.findOne({ 
    where: { 
      email,
      role: 'superadmin'
    } 
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid superadmin credentials'
    });
  }

  // Check if user is active
  if (user.status !== 'active') {
    return res.status(401).json({
      success: false,
      message: 'Superadmin account is inactive'
    });
  }

  // Check password
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid superadmin credentials'
    });
  }

  // Generate token
  const token = generateToken(user.id, user.role);

  res.status(200).json({
    success: true,
    message: 'Superadmin login successful',
    data: {
      user,
      token
    }
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
exports.updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { sendPasswordChangeSuccess } = require('../utils/email');

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Please provide current password and new password'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters long'
    });
  }

  const user = await User.findByPk(req.user.id);

  // Check current password
  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Store old password hash for email (before update)
  const oldPasswordChangedAt = user.updatedAt;
  
  // Update password
  user.password = newPassword;
  await user.save();

  // Send password change success email to registered email (or personal email if available)
  // For all users, send to their registered email (the email they use to login)
  const emailToUse = user.personalEmail || user.email;
  sendPasswordChangeSuccess(
    emailToUse, 
    user.name,
    new Date().toISOString(),
    oldPasswordChangedAt ? new Date(oldPasswordChangedAt).toISOString() : null
  ).catch(err => {
    console.error('Failed to send password change email:', err);
  });

  res.status(200).json({
    success: true,
    message: 'Password updated successfully. Confirmation email sent.'
  });
});
