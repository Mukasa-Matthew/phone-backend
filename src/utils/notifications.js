const { Notification, User } = require('../models');

// Create in-app notification
const createNotification = async (userId, type, title, message, relatedId = null, relatedType = null, metadata = null) => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      relatedId,
      relatedType,
      metadata,
      isRead: false
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Create notification for multiple users
const createBulkNotifications = async (userIds, type, title, message, relatedId = null, relatedType = null, metadata = null) => {
  try {
    const notifications = await Promise.all(
      userIds.map(userId => 
        Notification.create({
          userId,
          type,
          title,
          message,
          relatedId,
          relatedType,
          metadata,
          isRead: false
        })
      )
    );

    return notifications;
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    return [];
  }
};

// Create notification for all verified users
const notifyAllVerifiedUsers = async (type, title, message, relatedId = null, relatedType = null, metadata = null) => {
  try {
    const verifiedUsers = await User.findAll({
      where: {
        isVerified: true,
        status: 'active'
      },
      attributes: ['id']
    });

    const userIds = verifiedUsers.map(user => user.id);

    if (userIds.length === 0) {
      return [];
    }

    return await createBulkNotifications(userIds, type, title, message, relatedId, relatedType, metadata);
  } catch (error) {
    console.error('Error notifying all verified users:', error);
    return [];
  }
};

module.exports = {
  createNotification,
  createBulkNotifications,
  notifyAllVerifiedUsers
};


