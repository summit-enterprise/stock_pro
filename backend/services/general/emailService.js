const nodemailer = require('nodemailer');

// Email configuration
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587');
const EMAIL_USER = process.env.EMAIL_USER || 'admin@ma-summit-enterprise.com';
const EMAIL_PASS = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'admin@ma-summit-enterprise.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Create transporter
let transporter = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  // If no email password is set, create a mock transporter that logs instead of sending
  if (!EMAIL_PASS) {
    console.warn('⚠️  EMAIL_PASSWORD not set. Email functionality will be disabled. Emails will be logged to console.');
    transporter = {
      sendMail: async (mailOptions) => {
        console.log('📧 [MOCK EMAIL] Would send email:', {
          to: mailOptions.to,
          subject: mailOptions.subject,
          text: mailOptions.text?.substring(0, 100) + '...',
        });
        return { messageId: 'mock-' + Date.now() };
      },
    };
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  return transporter;
}

/**
 * Send welcome email to admin-created user
 * @param {string} to - Recipient email
 * @param {string} name - User name
 * @param {string} password - Temporary password
 * @param {boolean} isAdmin - Whether user is admin
 * @returns {Promise<Object>}
 */
async function sendWelcomeEmail(to, name, password, isAdmin = false) {
  try {
    const loginUrl = isAdmin 
      ? `${FRONTEND_URL}/admin?email=${encodeURIComponent(to)}`
      : `${FRONTEND_URL}/?email=${encodeURIComponent(to)}`;

    const subject = isAdmin 
      ? 'Your Admin Account Has Been Created'
      : 'Your Account Has Been Created';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 10px;
    }
    h1 {
      color: #1f2937;
      font-size: 24px;
      margin: 0 0 20px 0;
    }
    .content {
      margin-bottom: 30px;
    }
    .credentials {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
    }
    .credential-row {
      margin: 10px 0;
    }
    .label {
      font-weight: 600;
      color: #4b5563;
      display: inline-block;
      width: 100px;
    }
    .value {
      font-family: 'Courier New', monospace;
      color: #111827;
      background-color: #ffffff;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">StockPro</div>
      <h1>${subject}</h1>
    </div>
    
    <div class="content">
      <p>Hello${name ? ` ${name}` : ''},</p>
      
      <p>Your account has been created by an administrator. You can now access the platform using the credentials below:</p>
      
      <div class="credentials">
        <div class="credential-row">
          <span class="label">Email:</span>
          <span class="value">${to}</span>
        </div>
        <div class="credential-row">
          <span class="label">Password:</span>
          <span class="value">${password}</span>
        </div>
      </div>
      
      <div class="warning">
        <strong>⚠️ Important:</strong> This is a temporary password. Please change it after your first login for security.
      </div>
      
      <div class="button-container">
        <a href="${loginUrl}" class="button">Login Now</a>
      </div>
      
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #2563eb;">${loginUrl}</p>
      
      ${isAdmin ? `
      <p><strong>Admin Access:</strong> As an administrator, you'll have access to the admin panel where you can manage users, view analytics, and configure system settings.</p>
      ` : ''}
      
      <p>If you have any questions or need assistance, please contact our support team.</p>
      
      <p>Best regards,<br>The StockPro Team</p>
    </div>
    
    <div class="footer">
      <p>This email was sent from ${EMAIL_FROM}</p>
      <p>If you did not expect this email, please ignore it.</p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
${subject}

Hello${name ? ` ${name}` : ''},

Your account has been created by an administrator. You can now access the platform using the credentials below:

Email: ${to}
Password: ${password}

⚠️ Important: This is a temporary password. Please change it after your first login for security.

Login here: ${loginUrl}

${isAdmin ? 'Admin Access: As an administrator, you\'ll have access to the admin panel where you can manage users, view analytics, and configure system settings.\n' : ''}

If you have any questions or need assistance, please contact our support team.

Best regards,
The StockPro Team

---
This email was sent from ${EMAIL_FROM}
If you did not expect this email, please ignore it.
    `;

    const mailOptions = {
      from: `"StockPro Admin" <${EMAIL_FROM}>`,
      to: to,
      subject: subject,
      text: text,
      html: html,
    };

    const mailTransporter = getTransporter();
    const info = await mailTransporter.sendMail(mailOptions);
    
    console.log(`✅ Welcome email sent to ${to} (${isAdmin ? 'Admin' : 'User'})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Error sending welcome email to ${to}:`, error);
    throw error;
  }
}

/**
 * Send password reset email with temporary password
 * @param {string} to - Recipient email
 * @param {string} name - User name
 * @param {string} tempPassword - Temporary password
 * @returns {Promise<Object>}
 */
async function sendPasswordResetEmail(to, name, tempPassword) {
  try {
    console.log(`📧 Attempting to send password reset email to: ${to}`);
    const loginUrl = `${FRONTEND_URL}/?email=${encodeURIComponent(to)}`;
    const subject = 'Password Reset Request';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 10px;
    }
    h1 {
      color: #1f2937;
      font-size: 24px;
      margin: 0 0 20px 0;
    }
    .content {
      margin-bottom: 30px;
    }
    .credentials {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
    }
    .credential-row {
      margin: 10px 0;
    }
    .label {
      font-weight: 600;
      color: #4b5563;
      display: inline-block;
      width: 100px;
    }
    .value {
      font-family: 'Courier New', monospace;
      color: #111827;
      background-color: #ffffff;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">StockPro</div>
      <h1>${subject}</h1>
    </div>
    
    <div class="content">
      <p>Hello${name ? ` ${name}` : ''},</p>
      
      <p>You requested a password reset for your account. A temporary password has been generated for you:</p>
      
      <div class="credentials">
        <div class="credential-row">
          <span class="label">Email:</span>
          <span class="value">${to}</span>
        </div>
        <div class="credential-row">
          <span class="label">Temp Password:</span>
          <span class="value">${tempPassword}</span>
        </div>
      </div>
      
      <div class="warning">
        <strong>⚠️ Important:</strong> This is a temporary password. Please change it immediately after logging in for security.
      </div>
      
      <div class="button-container">
        <a href="${loginUrl}" class="button">Login Now</a>
      </div>
      
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #2563eb;">${loginUrl}</p>
      
      <p>If you did not request this password reset, please ignore this email and contact support if you have concerns.</p>
      
      <p>Best regards,<br>The StockPro Team</p>
    </div>
    
    <div class="footer">
      <p>This email was sent from ${EMAIL_FROM}</p>
      <p>If you did not request this password reset, please ignore this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
${subject}

Hello${name ? ` ${name}` : ''},

You requested a password reset for your account. A temporary password has been generated for you:

Email: ${to}
Temporary Password: ${tempPassword}

⚠️ Important: This is a temporary password. Please change it immediately after logging in for security.

Login here: ${loginUrl}

If you did not request this password reset, please ignore this email and contact support if you have concerns.

Best regards,
The StockPro Team

---
This email was sent from ${EMAIL_FROM}
If you did not request this password reset, please ignore this email.
    `;

    const mailOptions = {
      from: `"StockPro" <admin@ma-summit-enterprise.com>`,
      to: to,
      subject: subject,
      text: text,
      html: html,
    };

    const mailTransporter = getTransporter();
    
    // Check if we're in mock mode
    if (!EMAIL_PASS) {
      console.warn('⚠️  EMAIL_PASSWORD not configured. Email will be logged but not sent.');
      console.log('📧 [MOCK MODE] Password reset email details:', {
        to: to,
        subject: subject,
        tempPassword: tempPassword,
        loginUrl: loginUrl,
      });
    }
    
    const info = await mailTransporter.sendMail(mailOptions);
    
    if (!EMAIL_PASS) {
      console.log(`📧 [MOCK MODE] Password reset email logged (not sent) to ${to}`);
      console.log(`   Temporary password: ${tempPassword}`);
      console.log(`   Login URL: ${loginUrl}`);
    } else {
      console.log(`✅ Password reset email sent successfully to ${to} (Message ID: ${info.messageId})`);
    }
    
    return { success: true, messageId: info.messageId, mockMode: !EMAIL_PASS };
  } catch (error) {
    console.error(`❌ Error sending password reset email to ${to}:`, error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
    });
    throw error;
  }
}

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  getTransporter,
};

