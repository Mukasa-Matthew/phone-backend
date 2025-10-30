const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create upload directories for different file types
const createUploadDirectories = (category) => {
  const uploadsDir = path.join(__dirname, `../../uploads/${category}`);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
};

// Configure storage for different categories
const createStorage = (category) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadsDir = createUploadDirectories(category);
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const userId = req.user ? req.user.id : 'anonymous';
      const uniqueSuffix = `${userId}-${Date.now()}-${file.originalname}`;
      cb(null, uniqueSuffix);
    }
  });
};

// File filter - only accept images and videos
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/mpeg',
    'video/quicktime'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed!'), false);
  }
};

// Create upload middleware for different categories
const createUploadMiddleware = (category, maxFiles = 5) => {
  return multer({
    storage: createStorage(category),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
      files: maxFiles
    },
    fileFilter: fileFilter
  });
};

// Pre-configured upload middlewares
const listingsUpload = createUploadMiddleware('listings', 5);
const lostFoundUpload = createUploadMiddleware('lost-found', 5);
const newsUpload = createUploadMiddleware('news', 10);
const advertisementUpload = createUploadMiddleware('advertisements', 5);

module.exports = {
  listingsUpload,
  lostFoundUpload,
  newsUpload,
  advertisementUpload,
  createUploadMiddleware
};


