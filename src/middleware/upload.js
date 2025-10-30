const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads/profile-pictures');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: userId-timestamp-originalname
    // req.user will be available since this middleware is used after protect
    const userId = req.user ? req.user.id : 'unknown';
    const uniqueSuffix = `${userId}-${Date.now()}-${file.originalname}`;
    cb(null, uniqueSuffix);
  }
});

// File filter - only accept images
const fileFilter = (req, file, cb) => {
  // Allowed extensions
  const allowedExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;
  
  if (allowedExtensions.test(file.originalname)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed!'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: fileFilter
});

module.exports = upload;
