const asyncHandler = require('./asyncHandler');

// Middleware to check if user is verified
exports.requireVerification = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Please authenticate first'
    });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Your account is pending verification. Please wait for administrator approval to access this feature.'
    });
  }

  next();
});

// Middleware to check if user can show contact (for marketplace)
exports.requireContactApproval = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Please authenticate first'
    });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Your account must be verified first'
    });
  }

  if (!req.user.canShowContact) {
    return res.status(403).json({
      success: false,
      message: 'Contact information is not approved. Please contact administrator to enable contact visibility.'
    });
  }

  next();
});


