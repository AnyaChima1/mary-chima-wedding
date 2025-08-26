# Mary & Chima Wedding RSVP System - Deployment Guide

## 🚀 Quick Setup Instructions

### 1. Environment Variables (Required)
In your Netlify dashboard, go to Site Settings → Environment Variables and add:

```
NETLIFY_DATABASE_URL=postgresql://neondb_owner:npg_uwsjUqr0XcJ9@ep-young-credit-aeh2x91n-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**Optional (for admin access):**
```
ADMIN_PASSWORD=your_secure_password_here
```

### 2. Deploy to Netlify
1. Upload all files to your GitHub repository
2. Connect the repository to your Netlify site: `maryandchima.netlify.app`
3. Netlify will automatically detect the `netlify.toml` configuration
4. The build will install dependencies and deploy functions

### 3. Test Your Setup

**RSVP Form:** 
- Visit your site: `https://maryandchima.love`
- Click "RSVP Here" button
- Fill and submit the form

**Admin Dashboard:**
- Visit: `https://maryandchima.love/admin.html`
- Enter admin password (if you set ADMIN_PASSWORD)
- View all RSVPs and statistics

## 📊 Database Schema

The system automatically creates this table in your Neon database:

```sql
CREATE TABLE rsvps (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  attendance VARCHAR(10) NOT NULL CHECK (attendance IN ('yes', 'no')),
  guest_count INTEGER DEFAULT 1,
  guest_names TEXT,
  dietary_requirements TEXT,
  special_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔗 API Endpoints

**Submit RSVP:**
```
POST /.netlify/functions/submit-rsvp
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "attendance": "yes",
  "guest_count": 2,
  "guest_names": "Jane Doe",
  "dietary": "Vegetarian",
  "message": "Congratulations!"
}
```

**Get RSVPs (Admin):**
```
GET /.netlify/functions/get-rsvps
Authorization: Bearer your_admin_password

Optional query parameters:
- attendance=yes|no (filter by attendance)
- limit=50 (number of results)
- offset=0 (pagination)
```

## ✨ Features

### For Guests:
- ✅ Easy RSVP form with validation
- ✅ Update existing RSVPs with same email
- ✅ Guest count and dietary requirements
- ✅ Special messages for the couple
- ✅ Mobile-friendly interface
- ✅ Real-time form validation
- ✅ Success/error feedback

### For Admins:
- ✅ View all RSVPs in admin dashboard
- ✅ Filter by attendance status
- ✅ Real-time statistics (total responses, attending, etc.)
- ✅ Export-ready data view
- ✅ Password protection (optional)
- ✅ Mobile-responsive admin panel

## 🔒 Security Features

- ✅ Input validation and sanitization
- ✅ Email format validation
- ✅ SQL injection prevention (parameterized queries)
- ✅ CORS protection
- ✅ Rate limiting (via Netlify)
- ✅ Optional admin password protection
- ✅ Unique email constraint (prevents duplicates)

## 🛠 Customization

### Adding Fields:
1. Update the database schema in `submit-rsvp.js`
2. Add form fields in `index.html`
3. Update the JavaScript form submission
4. Modify the admin dashboard to display new fields

### Styling:
- Modify `style.css` for form styling
- Update `admin.html` for dashboard styling

### Notifications:
You can add email notifications by integrating services like:
- Netlify Forms (simpler)
- SendGrid API
- Mailgun API
- Resend API

## 📞 Support

If you encounter issues:
1. Check Netlify function logs in your dashboard
2. Verify environment variables are set correctly
3. Ensure your Neon database is accessible
4. Test the API endpoints directly

## 🎉 You're All Set!

Your wedding RSVP system is now fully functional with:
- Secure database storage
- Professional admin dashboard  
- Mobile-friendly interface
- Real-time updates
- Backup and recovery via Neon

Congratulations on your upcoming wedding! 💕