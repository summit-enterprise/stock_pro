# Email Service Setup

## Overview
The application now includes email functionality for sending welcome emails to admin-created users. When an admin or superuser creates a new user or admin account, an email is automatically sent with login credentials.

## Configuration

### Environment Variables

Add these to your `backend/.env` file:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=admin@ma-summit-enterprise.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=admin@ma-summit-enterprise.com
FRONTEND_URL=http://localhost:3000
```

### Gmail Setup (Recommended)

If using Gmail, you'll need to:

1. **Enable 2-Step Verification** on your Google account
2. **Generate an App Password**:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this 16-character password as `EMAIL_PASSWORD`

### Other Email Providers

For other providers, adjust the settings:

**Outlook/Office 365:**
```env
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
```

**SendGrid:**
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```

**AWS SES:**
```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=your-ses-smtp-username
EMAIL_PASSWORD=your-ses-smtp-password
```

## Features

### Welcome Email for Admin-Created Users

When an admin or superuser creates a new user or admin account:

1. **Automatic Email**: A welcome email is sent automatically
2. **Login Button**: Email includes a "Login Now" button that:
   - For admins: Takes them to `/admin?email=...`
   - For regular users: Takes them to `/?email=...`
3. **Pre-filled Email**: The email field is automatically filled when they click the link
4. **Credentials**: Email includes:
   - User's email address
   - Temporary password
   - Security warning to change password

### Email Template

The email includes:
- Professional HTML design
- Responsive layout
- Clear credentials display
- Login button with direct link
- Security warnings
- Fallback text version

## Testing

### Without Email Configuration

If `EMAIL_PASSWORD` is not set, the system will:
- Log emails to console instead of sending
- Continue functioning normally
- Show warning: `⚠️ EMAIL_PASSWORD not set. Email functionality will be disabled.`

### Testing Email Sending

1. Create a test user in admin panel
2. Check console for email log (if not configured)
3. Check email inbox (if configured)
4. Click "Login Now" button in email
5. Verify email is pre-filled in login form

## Troubleshooting

### Email Not Sending

1. **Check Environment Variables**: Ensure all email variables are set
2. **Check Gmail App Password**: Must be a 16-character app password, not regular password
3. **Check Firewall**: Port 587 must be open
4. **Check Logs**: Look for email errors in backend console

### Common Errors

**"Invalid login"**
- Verify `EMAIL_USER` and `EMAIL_PASSWORD` are correct
- For Gmail, ensure you're using an app password, not regular password

**"Connection timeout"**
- Check `EMAIL_HOST` and `EMAIL_PORT`
- Verify firewall allows SMTP connections

**"Authentication failed"**
- For Gmail, ensure 2-Step Verification is enabled
- Regenerate app password

## Production Deployment

For production:

1. **Use Environment-Specific Settings**:
   ```env
   EMAIL_HOST=smtp.your-provider.com
   EMAIL_PORT=587
   EMAIL_USER=noreply@yourdomain.com
   EMAIL_PASSWORD=secure-password
   EMAIL_FROM=noreply@yourdomain.com
   FRONTEND_URL=https://yourdomain.com
   ```

2. **Use Dedicated Email Service** (Recommended):
   - SendGrid
   - AWS SES
   - Mailgun
   - Postmark

3. **Security**:
   - Never commit email passwords to git
   - Use environment variables or secrets management
   - Rotate passwords regularly

## Email Service Location

- **Service**: `backend/services/general/emailService.js`
- **Usage**: Automatically called when creating users/admins in `backend/routes/admin.js`

## Future Enhancements

- Password reset emails
- Account verification emails
- Notification emails
- Email templates for different scenarios



