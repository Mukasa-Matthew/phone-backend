const { News, User, NewsReaction, NewsComment } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const asyncHandler = require('../middleware/asyncHandler');
const { notifyAllVerifiedUsers, createNotification } = require('../utils/notifications');
const { deleteNewsFiles, deleteOldFiles, deleteFile } = require('../utils/fileManager');

// @desc    Get all news (published only for public, all for superadmin)
// @route   GET /api/news
// @access  Public
exports.getNews = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    isUrgent,
    status
  } = req.query;

  const where = {};
  
  // If not superadmin, only show published news
  if (!req.user || req.user.role !== 'superadmin') {
    where.status = 'published';
  } else if (status) {
    where.status = status;
  }

  if (isUrgent === 'true') {
    where.isUrgent = true;
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { count, rows } = await News.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'username']
      },
      {
        model: NewsReaction,
        as: 'reactions',
        attributes: ['id', 'reactionType', 'userId']
      },
      {
        model: NewsComment,
        as: 'comments',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'username', 'profilePicture']
          }
        ],
        limit: 10,
        order: [['created_at', 'DESC']]
      }
    ],
    order: [
      ['is_urgent', 'DESC'],
      ['created_at', 'DESC']
    ],
    limit: parseInt(limit),
    offset: offset
  });

  // Format news data
  const formattedNews = rows.map(news => {
    const newsData = news.toJSON();
    
    // Add image URLs
    if (newsData.images && newsData.images.length > 0) {
      newsData.imageUrls = newsData.images.map(img => 
        `/uploads/news/${img}`
      );
    }

    // Add video URLs
    if (newsData.videoFile) {
      newsData.videoUrl = `/uploads/news/${newsData.videoFile}`;
    }

    // Count reactions
    newsData.likeCount = newsData.reactions?.filter(r => r.reactionType === 'like').length || 0;
    newsData.dislikeCount = newsData.reactions?.filter(r => r.reactionType === 'dislike').length || 0;
    
    // Check if current user reacted
    if (req.user) {
      const userReaction = newsData.reactions?.find(r => r.userId === req.user.id);
      newsData.userReaction = userReaction ? userReaction.reactionType : null;
    }

    // Format comments
    if (newsData.comments) {
      newsData.comments = newsData.comments.map(comment => {
        if (comment.user.profilePicture) {
          comment.user.profilePictureUrl = `/uploads/profile-pictures/${comment.user.profilePicture}`;
        }
        return comment;
      });
    }

    newsData.commentCount = newsData.comments?.length || 0;
    
    // Add publisher name (custom or from user)
    newsData.publisher = newsData.publisherName || newsData.author?.name || 'Unknown';
    newsData.publisherName = newsData.publisherName || null;

    return newsData;
  });

  res.status(200).json({
    success: true,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / parseInt(limit))
    },
    data: formattedNews
  });
});

// @desc    Get single news item
// @route   GET /api/news/:id
// @access  Public
exports.getNewsById = asyncHandler(async (req, res) => {
  const news = await News.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'name', 'username']
      },
      {
        model: NewsReaction,
        as: 'reactions',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'username']
          }
        ]
      },
      {
        model: NewsComment,
        as: 'comments',
        where: { parentId: null }, // Only top-level comments
        required: false,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'username', 'profilePicture']
          },
          {
            model: NewsComment,
            as: 'replies',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'username', 'profilePicture']
              }
            ],
            order: [['created_at', 'ASC']]
          }
        ],
        order: [['created_at', 'DESC']]
      }
    ]
  });

  if (!news) {
    return res.status(404).json({
      success: false,
      message: 'News not found'
    });
  }

  // Check if user can view (only published for non-admins)
  if (news.status !== 'published' && (!req.user || req.user.role !== 'superadmin')) {
    return res.status(403).json({
      success: false,
      message: 'This news is not published'
    });
  }

  const newsData = news.toJSON();
  
  // Add image URLs
  if (newsData.images && newsData.images.length > 0) {
    newsData.imageUrls = newsData.images.map(img => 
      `/uploads/news/${img}`
    );
  }

  // Add video URL
  if (newsData.videoFile) {
    newsData.videoUrl = `/uploads/news/${newsData.videoFile}`;
  }

  // Count reactions
  newsData.likeCount = newsData.reactions?.filter(r => r.reactionType === 'like').length || 0;
  newsData.dislikeCount = newsData.reactions?.filter(r => r.reactionType === 'dislike').length || 0;
  
  // Check if current user reacted
  if (req.user) {
    const userReaction = newsData.reactions?.find(r => r.userId === req.user.id);
    newsData.userReaction = userReaction ? userReaction.reactionType : null;
  }
  
  // Add publisher name (custom or from user)
  newsData.publisher = newsData.publisherName || newsData.author?.name || 'Unknown';
  newsData.publisherName = newsData.publisherName || null;

  res.status(200).json({
    success: true,
    data: newsData
  });
});

// @desc    Create news (superadmin only)
// @route   POST /api/news
// @access  Private/Superadmin
exports.createNews = asyncHandler(async (req, res) => {
  const { title, content, videoUrl, isUrgent, status, publisherId, publisherName } = req.body;
  
  // Get uploaded images and video
  const images = req.files?.images ? req.files.images.map(file => file.filename) : [];
  const videoFile = req.files?.video && req.files.video.length > 0 ? req.files.video[0].filename : null;

  // Use publisherId if provided, otherwise default to logged-in user
  const createdBy = publisherId ? parseInt(publisherId) : req.user.id;

  // Validate that publisherId exists if provided (not custom name)
  if (publisherId && !publisherName) {
    const publisher = await User.findByPk(createdBy);
    if (!publisher) {
      return res.status(400).json({
        success: false,
        message: 'Selected publisher not found'
      });
    }
  }

  const news = await News.create({
    createdBy,
    publisherName: publisherName && publisherName.trim() !== '' ? publisherName.trim() : null,
    title: title.trim(),
    content: content.trim(),
    images: images || [],
    videoUrl: videoUrl && videoUrl.trim() !== '' ? videoUrl.trim() : null,
    videoFile: videoFile || null,
    isUrgent: isUrgent === true || isUrgent === 'true',
    status: status || 'published'
  });

  // If urgent and published, create in-app notifications for all users
  if ((isUrgent === true || isUrgent === 'true') && (status === 'published' || !status)) {
    notifyAllVerifiedUsers(
      'news_urgent',
      'Urgent: ' + title,
      content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      news.id,
      'News',
      { isUrgent: true }
    ).catch(err => {
      console.error('Failed to create urgent news notifications:', err);
    });
  }

  const newsData = news.toJSON();
  if (newsData.images && newsData.images.length > 0) {
    newsData.imageUrls = newsData.images.map(img => 
      `/uploads/news/${img}`
    );
  }

  res.status(201).json({
    success: true,
    message: 'News created successfully',
    data: newsData
  });
});

// @desc    Update news
// @route   PUT /api/news/:id
// @access  Private/Superadmin
exports.updateNews = asyncHandler(async (req, res) => {
  const news = await News.findByPk(req.params.id);

  if (!news) {
    return res.status(404).json({
      success: false,
      message: 'News not found'
    });
  }

  const { title, content, videoUrl, isUrgent, status, publisherId, publisherName } = req.body;
  
  // Store old files for deletion
  const oldImages = news.images || [];
  const oldVideoFile = news.videoFile;
  
  // Handle existing images (sent from frontend when preserving some images)
  let existingImages = [];
  if (req.body.existingImages !== undefined) {
    // Frontend explicitly sent existing images (could be empty array if all removed)
    existingImages = Array.isArray(req.body.existingImages) 
      ? req.body.existingImages 
      : [req.body.existingImages];
  } else {
    // Frontend didn't send existingImages, keep all old images
    existingImages = oldImages;
  }
  
  // Handle new uploaded images
  const newImages = req.files?.images ? req.files.images.map(file => file.filename) : [];
  
  // Combine existing and new images
  let imagesToUpdate = [...existingImages, ...newImages];
  
  // Handle video
  let videoFileToUpdate = news.videoFile;
  
  // Check if existing video file should be kept
  if (req.body.existingVideoFile && req.body.existingVideoFile !== '') {
    videoFileToUpdate = req.body.existingVideoFile;
  } else if (req.body.videoFile === '' || (req.body.videoFile === undefined && !req.files?.video)) {
    // Video is being explicitly removed
    videoFileToUpdate = null;
  }
  
  // New video upload takes precedence
  if (req.files?.video && req.files.video.length > 0) {
    videoFileToUpdate = req.files.video[0].filename;
  }
  
  // Delete old files that are being replaced or removed
  const newsDir = path.join(__dirname, '../../uploads/news');
  let deletedFilesCount = 0;
  
  // Delete old images that are not in the new list
  if (oldImages.length > 0) {
    const imagesToKeep = new Set(imagesToUpdate);
    for (const oldImage of oldImages) {
      if (!imagesToKeep.has(oldImage)) {
        const oldImagePath = path.join(newsDir, oldImage);
        if (await deleteFile(oldImagePath)) {
          deletedFilesCount++;
        }
      }
    }
  }
  
  // Delete old video if it's being replaced or removed
  if (oldVideoFile && videoFileToUpdate !== oldVideoFile) {
    const oldVideoPath = path.join(newsDir, oldVideoFile);
    if (await deleteFile(oldVideoPath)) {
      deletedFilesCount++;
    }
  }

  // Validate publisherId if provided (not custom name)
  if (publisherId && !publisherName) {
    const publisher = await User.findByPk(parseInt(publisherId));
    if (!publisher) {
      return res.status(400).json({
        success: false,
        message: 'Selected publisher not found'
      });
    }
  }

  const updateData = {};
  if (title) updateData.title = title.trim();
  if (content) updateData.content = content.trim();
  if (imagesToUpdate) updateData.images = imagesToUpdate;
  if (videoUrl !== undefined) updateData.videoUrl = videoUrl && videoUrl.trim() !== '' ? videoUrl.trim() : null;
  if (videoFileToUpdate !== undefined) updateData.videoFile = videoFileToUpdate;
  if (isUrgent !== undefined) updateData.isUrgent = isUrgent;
  if (status) updateData.status = status;
  if (publisherId && !publisherName) {
    // Only update createdBy if using a user, not custom name
    updateData.createdBy = parseInt(publisherId);
    updateData.publisherName = null; // Clear custom name if using user
  } else if (publisherName && publisherName.trim() !== '') {
    // Using custom publisher name
    updateData.publisherName = publisherName.trim();
  } else if (publisherName === '') {
    // Explicitly clearing custom name
    updateData.publisherName = null;
  }

  await news.update(updateData);
  await news.reload();

  const newsData = news.toJSON();
  if (newsData.images && newsData.images.length > 0) {
    newsData.imageUrls = newsData.images.map(img => 
      `/uploads/news/${img}`
    );
  }

  res.status(200).json({
    success: true,
    message: 'News updated successfully',
    data: newsData
  });
});

// @desc    Delete news
// @route   DELETE /api/news/:id
// @access  Private/Superadmin
exports.deleteNews = asyncHandler(async (req, res) => {
  const news = await News.findByPk(req.params.id);

  if (!news) {
    return res.status(404).json({
      success: false,
      message: 'News not found'
    });
  }

  // Delete associated files before deleting the database record
  const uploadsBasePath = path.join(__dirname, '../..');
  const deletedFilesCount = await deleteNewsFiles(news, uploadsBasePath);
  
  if (deletedFilesCount > 0) {
    console.log(`✅ Deleted ${deletedFilesCount} file(s) for news article ${news.id}`);
  }

  await news.destroy();

  res.status(200).json({
    success: true,
    message: 'News deleted successfully',
    data: {
      deletedFilesCount
    }
  });
});

// @desc    React to news
// @route   POST /api/news/:id/reaction
// @access  Private/Verified
exports.reactToNews = asyncHandler(async (req, res) => {
  const { reactionType } = req.body;

  if (!['like', 'dislike'].includes(reactionType)) {
    return res.status(400).json({
      success: false,
      message: 'Reaction type must be "like" or "dislike"'
    });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Account must be verified to react to news'
    });
  }

  const news = await News.findByPk(req.params.id);

  if (!news) {
    return res.status(404).json({
      success: false,
      message: 'News not found'
    });
  }

  // Check if user already reacted
  const existingReaction = await NewsReaction.findOne({
    where: {
      newsId: news.id,
      userId: req.user.id
    }
  });

  if (existingReaction) {
    if (existingReaction.reactionType === reactionType) {
      // Remove reaction if same
      await existingReaction.destroy();
      return res.status(200).json({
        success: true,
        message: 'Reaction removed',
        data: { reactionType: null }
      });
    } else {
      // Update reaction
      existingReaction.reactionType = reactionType;
      await existingReaction.save();
      return res.status(200).json({
        success: true,
        message: 'Reaction updated',
        data: existingReaction
      });
    }
  }

  // Create new reaction
  const reaction = await NewsReaction.create({
    newsId: news.id,
    userId: req.user.id,
    reactionType
  });

  res.status(201).json({
    success: true,
    message: 'Reaction added',
    data: reaction
  });
});

// @desc    Comment on news
// @route   POST /api/news/:id/comment
// @access  Private/Verified
exports.commentOnNews = asyncHandler(async (req, res) => {
  const { comment, parentId } = req.body;

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Account must be verified to comment on news'
    });
  }

  const news = await News.findByPk(req.params.id);

  if (!news) {
    return res.status(404).json({
      success: false,
      message: 'News not found'
    });
  }

  const newsComment = await NewsComment.create({
    newsId: news.id,
    userId: req.user.id,
    comment,
    parentId: parentId || null
  });

  // If this is a reply to a comment, notify the original commenter
  if (parentId) {
    const parentComment = await NewsComment.findByPk(parentId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name']
        }
      ]
    });

    if (parentComment && parentComment.user.id !== req.user.id) {
      await createNotification(
        parentComment.user.id,
        'comment_reply',
        'New Reply to Your Comment',
        `${req.user.name} replied to your comment: "${comment.substring(0, 50)}${comment.length > 50 ? '...' : ''}"`,
        news.id,
        'News',
        { commentId: newsComment.id, parentCommentId: parentId }
      );
    }
  }

  const commentData = await NewsComment.findByPk(newsComment.id, {
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'username', 'profilePicture']
      }
    ]
  });

  const formatted = commentData.toJSON();
  if (formatted.user.profilePicture) {
    formatted.user.profilePictureUrl = `/uploads/profile-pictures/${formatted.user.profilePicture}`;
  }

  res.status(201).json({
    success: true,
    message: 'Comment added successfully',
    data: formatted
  });
});
