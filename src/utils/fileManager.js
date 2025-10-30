const fs = require('fs').promises;
const path = require('path');

/**
 * Delete a file from the filesystem
 * @param {string} filePath - Full path to the file
 * @returns {Promise<boolean>} - Returns true if deleted, false if file doesn't exist or couldn't be deleted
 */
async function deleteFile(filePath) {
  try {
    await fs.access(filePath);
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    // File doesn't exist or couldn't be deleted
    if (error.code === 'ENOENT') {
      return false; // File doesn't exist, that's okay
    }
    console.error(`Error deleting file ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Delete files associated with a news article
 * @param {Object} news - News model instance
 * @param {string} uploadsBasePath - Base path to uploads directory
 * @returns {Promise<number>} - Number of files deleted
 */
async function deleteNewsFiles(news, uploadsBasePath = '') {
  const newsDir = path.join(uploadsBasePath, 'uploads', 'news');
  let deletedCount = 0;

  try {
    // Delete images
    if (news.images && Array.isArray(news.images) && news.images.length > 0) {
      for (const image of news.images) {
        const imagePath = path.join(newsDir, image);
        if (await deleteFile(imagePath)) {
          deletedCount++;
        }
      }
    }

    // Delete video file
    if (news.videoFile) {
      const videoPath = path.join(newsDir, news.videoFile);
      if (await deleteFile(videoPath)) {
        deletedCount++;
      }
    }
  } catch (error) {
    console.error('Error deleting news files:', error);
  }

  return deletedCount;
}

/**
 * Delete files associated with an advertisement
 * @param {Object} ad - Advertisement model instance
 * @param {string} uploadsBasePath - Base path to uploads directory
 * @returns {Promise<number>} - Number of files deleted
 */
async function deleteAdvertisementFiles(ad, uploadsBasePath = '') {
  const adDir = path.join(uploadsBasePath, 'uploads', 'advertisements');
  let deletedCount = 0;

  try {
    // Delete images
    if (ad.images && Array.isArray(ad.images) && ad.images.length > 0) {
      for (const image of ad.images) {
        const imagePath = path.join(adDir, image);
        if (await deleteFile(imagePath)) {
          deletedCount++;
        }
      }
    }

    // Delete video file
    if (ad.videoFile) {
      const videoPath = path.join(adDir, ad.videoFile);
      if (await deleteFile(videoPath)) {
        deletedCount++;
      }
    }
  } catch (error) {
    console.error('Error deleting advertisement files:', error);
  }

  return deletedCount;
}

/**
 * Delete files associated with a lost & found item
 * @param {Object} item - LostFound model instance
 * @param {string} uploadsBasePath - Base path to uploads directory
 * @returns {Promise<number>} - Number of files deleted
 */
async function deleteLostFoundFiles(item, uploadsBasePath = '') {
  const lostFoundDir = path.join(uploadsBasePath, 'uploads', 'lost-found');
  let deletedCount = 0;

  try {
    // Delete images
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      for (const image of item.images) {
        const imagePath = path.join(lostFoundDir, image);
        if (await deleteFile(imagePath)) {
          deletedCount++;
        }
      }
    }
  } catch (error) {
    console.error('Error deleting lost & found files:', error);
  }

  return deletedCount;
}

/**
 * Delete files associated with a listing
 * @param {Object} listing - Listing model instance
 * @param {string} uploadsBasePath - Base path to uploads directory
 * @returns {Promise<number>} - Number of files deleted
 */
async function deleteListingFiles(listing, uploadsBasePath = '') {
  const listingsDir = path.join(uploadsBasePath, 'uploads', 'listings');
  let deletedCount = 0;

  try {
    // Delete images
    if (listing.images && Array.isArray(listing.images) && listing.images.length > 0) {
      for (const image of listing.images) {
        const imagePath = path.join(listingsDir, image);
        if (await deleteFile(imagePath)) {
          deletedCount++;
        }
      }
    }
  } catch (error) {
    console.error('Error deleting listing files:', error);
  }

  return deletedCount;
}

/**
 * Delete old files when updating (for news, ads, etc.)
 * @param {Array<string>} oldFiles - Array of old filenames
 * @param {Array<string>} newFiles - Array of new filenames
 * @param {string} directory - Directory path where files are stored
 * @returns {Promise<number>} - Number of files deleted
 */
async function deleteOldFiles(oldFiles, newFiles, directory) {
  if (!oldFiles || !Array.isArray(oldFiles) || oldFiles.length === 0) {
    return 0;
  }

  let deletedCount = 0;
  const newFileSet = new Set(newFiles || []);

  for (const oldFile of oldFiles) {
    // Only delete if it's not in the new files list
    if (!newFileSet.has(oldFile)) {
      const filePath = path.join(directory, oldFile);
      if (await deleteFile(filePath)) {
        deletedCount++;
      }
    }
  }

  return deletedCount;
}

module.exports = {
  deleteFile,
  deleteNewsFiles,
  deleteAdvertisementFiles,
  deleteLostFoundFiles,
  deleteListingFiles,
  deleteOldFiles
};


