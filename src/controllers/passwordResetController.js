const { User, PasswordReset } = require('../models');
const asyncHandler = require('../middleware/asyncHandler');
const { sendPasswordResetOTP } = require('../utils/email');
const { Op } = require('sequelize');

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @desc    Request password reset (send OTP)
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }

  // Find user by email (login email)
  const user = await User.findOne({ where: { email } });

  if (!user) {
    // Don't reveal if user exists - security best practice
    return res.status(200).json({
      success: true,
      message: 'If the email exists, a password reset OTP has been sent'
    });
  }

  // Generate OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate previous OTPs for this user
  await PasswordReset.update(
    { isUsed: true },
    { where: { userId: user.id, isUsed: false } }
  );

  // Send OTP to registered email (login email) for all users
  // This is the email they use to login, which is what they registered with
  const emailToUse = user.email;

  // Create new password reset record
  await PasswordReset.create({
    userId: user.id,
    email: emailToUse, // Send to registered email for superadmin
    otp,
    expiresAt,
    isUsed: false
  });

  // Send OTP to registered/login email (for superadmin) or personal email (for regular users)
  sendPasswordResetOTP(emailToUse, user.name, otp).catch(err => {
    console.error('Failed to send password reset OTP:', err);
  });

  res.status(200).json({
    success: true,
    message: 'Password reset OTP has been sent to your registered email'
  });
});

// @desc    Verify OTP
// @route   POST /api/auth/verify-reset-otp
// @access  Public
exports.verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Email and OTP are required'
    });
  }

  const user = await User.findOne({ where: { email } });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Find valid OTP
  const passwordReset = await PasswordReset.findOne({
    where: {
      userId: user.id,
      otp,
      isUsed: false,
      expiresAt: { [Op.gt]: new Date() }
    },
    order: [['created_at', 'DESC']]
  });

  if (!passwordReset) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired OTP'
    });
  }

  res.status(200).json({
    success: true,
    message: 'OTP verified successfully',
    data: {
      resetToken: passwordReset.otp, // For now, using OTP as reset token
      email: user.email
    }
  });
});

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Email, OTP, and new password are required'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long'
    });
  }

  const user = await User.findOne({ where: { email } });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Find and verify OTP
  const passwordReset = await PasswordReset.findOne({
    where: {
      userId: user.id,
      otp,
      isUsed: false,
      expiresAt: { [Op.gt]: new Date() }
    },
    order: [['created_at', 'DESC']]
  });

  if (!passwordReset) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired OTP'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Mark OTP as used
  passwordReset.isUsed = true;
  await passwordReset.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successfully. You can now login with your new password.'
  });
});

