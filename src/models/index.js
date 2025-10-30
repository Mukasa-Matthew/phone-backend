const { sequelize } = require('../config/database');
const User = require('./User');
const AuditLog = require('./AuditLog');
const Listing = require('./Listing');
const LostFound = require('./LostFound');
const Interest = require('./Interest');
const News = require('./News');
const Advertisement = require('./Advertisement');
const NewsReaction = require('./NewsReaction');
const NewsComment = require('./NewsComment');
const Notification = require('./Notification');
const PasswordReset = require('./PasswordReset');

// Initialize all models here
const models = {
  User,
  AuditLog,
  Listing,
  LostFound,
  Interest,
  News,
  Advertisement,
  NewsReaction,
  NewsComment,
  Notification,
  PasswordReset,
  sequelize
};

// User associations
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
User.hasMany(Listing, { foreignKey: 'userId', as: 'listings' });
User.hasMany(LostFound, { foreignKey: 'userId', as: 'lostFoundItems' });
User.hasMany(Interest, { foreignKey: 'buyerId', as: 'buyerInterests' });
User.hasMany(Interest, { foreignKey: 'sellerId', as: 'sellerInterests' });
User.hasMany(News, { foreignKey: 'createdBy', as: 'news' });
User.hasMany(Advertisement, { foreignKey: 'createdBy', as: 'advertisements' });
User.hasMany(NewsReaction, { foreignKey: 'userId', as: 'newsReactions' });
User.hasMany(NewsComment, { foreignKey: 'userId', as: 'newsComments' });

// Listing associations
Listing.belongsTo(User, { foreignKey: 'userId', as: 'seller' });
Listing.hasMany(Interest, { foreignKey: 'listingId', as: 'interests' });

// LostFound associations
LostFound.belongsTo(User, { foreignKey: 'userId', as: 'postedBy' });
LostFound.belongsTo(User, { foreignKey: 'claimedBy', as: 'claimedByUser' });

// Interest associations
Interest.belongsTo(Listing, { foreignKey: 'listingId', as: 'listing' });
Interest.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });
Interest.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

// News associations
News.belongsTo(User, { foreignKey: 'createdBy', as: 'author' });
News.hasMany(NewsReaction, { foreignKey: 'newsId', as: 'reactions' });
News.hasMany(NewsComment, { foreignKey: 'newsId', as: 'comments' });

// Advertisement associations
Advertisement.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// NewsReaction associations
NewsReaction.belongsTo(News, { foreignKey: 'newsId', as: 'news' });
NewsReaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// NewsComment associations
NewsComment.belongsTo(News, { foreignKey: 'newsId', as: 'news' });
NewsComment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
NewsComment.belongsTo(NewsComment, { foreignKey: 'parentId', as: 'parent' });
NewsComment.hasMany(NewsComment, { foreignKey: 'parentId', as: 'replies' });

// AuditLog associations
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Notification associations
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// PasswordReset associations
User.hasMany(PasswordReset, { foreignKey: 'userId', as: 'passwordResets' });
PasswordReset.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = models;
