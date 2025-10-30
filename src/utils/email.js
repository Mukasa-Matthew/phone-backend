const nodemailer = require('nodemailer');
require('dotenv').config();

// Create reusable transporter
const createTransporter = () => {
  // For development, you can use a test account
  // For production, configure with real SMTP settings
  if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  } else {
    // Development: Use Gmail or other service
    // Note: For Gmail, you'll need to use an App Password
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD
      }
    });
  }
};

// Send welcome email after registration
const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@example.com',
      to: userEmail,
      subject: 'Welcome to Our Platform!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome!</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName},</h2>
              <p>Thank you for creating an account with us! We're excited to have you on board.</p>
              <p>Your account has been successfully created and you can now start using our platform.</p>
              <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              <p>Best regards,<br>The Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    // Don't throw error - email failure shouldn't block registration
    return false;
  }
};

// Send approval email (to user's registered email)
const sendApprovalEmail = async (email, userName, approvalType) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@example.com',
      to: email,
      subject: `Account ${approvalType} - Campus Marketplace`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Account ${approvalType}!</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName},</h2>
              <p>Great news! Your account has been ${approvalType === 'Verified' ? 'verified' : 'approved'} by the administrator.</p>
              <p>You now have full access to all features of the Campus Marketplace platform.</p>
              ${approvalType === 'Contact Approved' ? '<p>Your contact information is now visible to other users when they view your listings.</p>' : ''}
              <p>You can now:</p>
              <ul>
                <li>Post items for sale</li>
                <li>Contact sellers directly</li>
                <li>View contact information</li>
                <li>Use all marketplace features</li>
              </ul>
              <p>Thank you for using Campus Marketplace!</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Approval email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending approval email:', error);
    return false;
  }
};

// Send interest notification email (to seller's personal email)
const sendInterestNotification = async (sellerPersonalEmail, sellerName, buyerName, listingTitle, listingPrice) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@example.com',
      to: sellerPersonalEmail,
      subject: `Someone is Interested in Your Listing: ${listingTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .info-box { background-color: #fff; padding: 15px; border-left: 4px solid #2196F3; margin: 15px 0; }
            .button { display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Interest in Your Listing!</h1>
            </div>
            <div class="content">
              <h2>Hello ${sellerName},</h2>
              <p><strong>${buyerName}</strong> has shown interest in your listing:</p>
              <div class="info-box">
                <strong>${listingTitle}</strong><br>
                Price: $${listingPrice}
              </div>
              <div class="warning">
                <strong>⚠️ Important:</strong> To enable contact information visibility and messaging, please contact the administrator to complete the approval process. Once approved, interested buyers will be able to contact you directly.
              </div>
              <p>Log in to your account to view more details and manage your listing.</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Interest notification email sent to ${sellerPersonalEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending interest notification email:', error);
    return false;
  }
};

// Send password reset OTP
const sendPasswordResetOTP = async (userPersonalEmail, userName, otp) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@example.com',
      to: userPersonalEmail,
      subject: 'Password Reset OTP - Campus Marketplace',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .otp-box { background-color: #fff; padding: 20px; text-align: center; border: 2px solid #2196F3; margin: 20px 0; }
            .otp { font-size: 32px; font-weight: bold; color: #2196F3; letter-spacing: 5px; }
            .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName},</h2>
              <p>You have requested to reset your password. Use the OTP below to create a new password:</p>
              <div class="otp-box">
                <div class="otp">${otp}</div>
              </div>
              <div class="warning">
                <strong>⚠️ Important:</strong> This OTP will expire in 10 minutes. Do not share this code with anyone.
              </div>
              <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset OTP sent to ${userPersonalEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset OTP:', error);
    return false;
  }
};

// Send password change success notification
const sendPasswordChangeSuccess = async (userPersonalEmail, userName, newPasswordChangedAt, oldPasswordChangedAt) => {
  try {
    const transporter = createTransporter();
    
    // Format dates
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    };

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@example.com',
      to: userPersonalEmail,
      subject: 'Password Changed Successfully - Campus Marketplace',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .success-box { background-color: #d4edda; border-left: 4px solid #4CAF50; padding: 15px; margin: 15px 0; }
            .info-box { background-color: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 15px 0; }
            .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
            .detail-label { font-weight: bold; color: #555; }
            .detail-value { color: #333; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Changed Successfully</h1>
            </div>
            <div class="content">
              <h2>Hello ${userName},</h2>
              <div class="success-box">
                <strong>✓ Success!</strong> Your password has been changed successfully.
              </div>
              
              <div class="info-box">
                <h3 style="margin-top: 0;">Password Change Details:</h3>
                <div class="detail-row">
                  <span class="detail-label">Previous Password Changed:</span>
                  <span class="detail-value">${formatDate(oldPasswordChangedAt)}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">New Password Changed:</span>
                  <span class="detail-value">${formatDate(newPasswordChangedAt)}</span>
                </div>
                <div class="detail-row" style="border-bottom: none;">
                  <span class="detail-label">Change Time:</span>
                  <span class="detail-value">Just now</span>
                </div>
              </div>

              <p>This is a confirmation that your password was successfully updated on your Campus Marketplace account. Your old password has been replaced with your new password.</p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> If you did not make this change, please contact our support team immediately to secure your account. For security reasons, we cannot display your passwords in this email.
              </div>
              
              <p><strong>Important Security Information:</strong></p>
              <ul>
                <li>Your old password is no longer valid and cannot be used to access your account</li>
                <li>Your new password is now active and must be used for all future logins</li>
                <li>Never share your password with anyone</li>
                <li>Use a strong, unique password</li>
                <li>Log out from shared devices</li>
                <li>Report any suspicious activity immediately</li>
              </ul>
              
              <p>If you have any questions or concerns, please don't hesitate to contact our support team.</p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password change success email sent to ${userPersonalEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending password change success email:', error);
    // Don't throw error - email failure shouldn't block password update
    return false;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendApprovalEmail,
  sendInterestNotification,
  sendPasswordResetOTP,
  sendPasswordChangeSuccess,
  createTransporter
};
