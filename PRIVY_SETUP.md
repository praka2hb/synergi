# Privy Email Authentication Setup Guide

This guide will help you set up Privy email authentication for your Synergi application.

## Overview

Privy is configured for **email-only authentication** with:
- 📧 Passwordless email login
- 🎨 Custom branding with Synergi logo  
- 🌓 Automatic dark/light theme support
- 🔐 Secure JWT token authentication

## Setup Instructions

### 1. Create a Privy Account

1. Go to [Privy Dashboard](https://dashboard.privy.io/)
2. Sign up for a free account
3. Create a new app

### 2. Configure Your Privy App

In your Privy dashboard:

1. **App Settings**
   - Add your app name: "Synergi"
   - Add allowed domains:
     - `http://localhost:3000` (development)
     - Your production domain

2. **Login Methods**
   - **Enable: Email only**
   - Disable: Wallet, Google, Twitter, Discord

3. **Copy Your App ID**
   - Navigate to "Settings" → "Basics"
   - Copy your "App ID"

### 3. Configure Environment Variables

#### Frontend (.env.local)

Create a `.env.local` file in the `frontend` directory:

```env
# Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Important:** Replace `your_privy_app_id_here` with your actual Privy App ID.

#### Backend (.env)

Your existing backend `.env` should have:

```env
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
```

### 4. Database Migration

The database has been migrated to support Privy. The User model includes:

- `privyId` - Unique Privy user identifier
- `email` - User's email address
- `walletAddress` - (Optional, not used for email-only auth)
- `name` - (Optional, can be set later)

To verify the migration:

```bash
cd backend
npx prisma migrate status
```

### 5. Start the Application

#### Start Backend

```bash
cd backend
npm run dev
```

The backend should start on `http://localhost:3001`

#### Start Frontend

```bash
cd frontend
npm run dev
```

The frontend should start on `http://localhost:3000`

## Features

### Custom Branding

The Privy modal is customized with:
- **Synergi Logo** - Your app logo appears in the authentication modal
- **Brand Colors** - Teal accent color (#51C0BB) matching your brand
- **Theme Support** - Automatically adapts to light/dark mode
- **Custom Messages** - Welcome message and login instructions

### Authentication Flow

1. **User Clicks "Sign In"** button in the header (shows Mail icon)
2. **Privy Modal Opens** with email login
3. **User Enters Email** 
4. **Verification Code Sent** - User receives code via email
5. **User Verifies** - Enters code in Privy modal
6. **Backend Sync** - User data is automatically synced to your database
7. **JWT Token** - User receives a JWT token for API requests
8. **Authenticated Session** - User can now chat and save conversations

### User Profile Display

When authenticated, users see:
- Their avatar with email initials (e.g., "JD" for john@doe.com)
- Display name or email
- Logout option

## API Endpoints

### Sync Privy User

**POST** `/api/privy/sync`

Syncs a Privy authenticated user to the database.

**Request Body:**
```json
{
  "privyId": "did:privy:clabcd1234567890",
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### Get User by Privy ID

**GET** `/api/privy/user/:privyId`

Requires authentication header.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

## Customization

### Changing Brand Colors

Edit `frontend/components/privy-provider.tsx`:

```typescript
appearance: {
  theme: isDarkMode ? 'dark' : 'light',
  accentColor: '#51C0BB', // Change this to your brand color
  logo: '/synergi.svg', // Change this to your logo
  landingHeader: 'Welcome to Synergi',
  loginMessage: 'Sign in to access your AI agents',
}
```

### Changing Welcome Message

In `privy-provider.tsx`:

```typescript
landingHeader: 'Your Custom Welcome Message',
loginMessage: 'Your custom subtitle',
```

## Troubleshooting

### Issue: "Privy App ID is not set"

**Solution:** Make sure you've set `NEXT_PUBLIC_PRIVY_APP_ID` in your `.env.local` file and restarted the dev server.

### Issue: "User sync failed"

**Solution:** 
1. Check that your backend is running on port 3001
2. Verify the `DATABASE_URL` is correct
3. Check backend console for error messages
4. Ensure JWT_SECRET is set
5. Verify email is being sent from Privy

### Issue: "Cannot find module '@privy-io/react-auth'"

**Solution:**
```bash
cd frontend
npm install @privy-io/react-auth@latest
```

### Issue: Privy modal doesn't show

**Solution:**
1. Check browser console for errors
2. Verify `NEXT_PUBLIC_PRIVY_APP_ID` is set correctly
3. Check that domain is whitelisted in Privy dashboard
4. Clear browser cache and reload

### Issue: Email verification code not received

**Solution:**
1. Check spam/junk folder
2. Verify email address is correct
3. Check Privy dashboard for email delivery status
4. Ensure email login method is enabled in Privy settings

## Security Considerations

1. **JWT Secret** - Keep your `JWT_SECRET` secure and never commit it to version control
2. **Privy App ID** - The App ID is public (it's in the frontend), but configure allowed domains in Privy dashboard
3. **HTTPS** - Always use HTTPS in production
4. **CORS** - Configure CORS properly in your backend for production domains
5. **Token Expiration** - Consider adding token expiration logic
6. **Email Verification** - Privy handles email verification automatically

## How It Works

### User Object Structure

```typescript
interface User {
  id: string           // Your database UUID
  email: string        // User's email address
  privyId: string      // Privy unique identifier
}
```

### Authentication State Management

The app uses React Context to manage authentication state:

```typescript
const { user, token, isAuthenticated, login, logout } = usePrivyAuth();
```

### Token Storage

- JWT tokens are stored in `localStorage` with key `"auth-token"`
- Tokens are sent in Authorization header: `Bearer <token>`
- Tokens persist across page refreshes

## Production Deployment

### Before Deploying

1. **Create Production Privy App**
   - Set up separate app in Privy dashboard for production
   - Get production App ID

2. **Update Environment Variables**
   ```env
   NEXT_PUBLIC_PRIVY_APP_ID=your_production_app_id
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```

3. **Configure Privy Dashboard**
   - Add production domain to allowed domains
   - Enable email login method
   - Test email delivery

4. **Database**
   - Run migrations in production
   - Backup database before deployment

5. **Security**
   - Enable HTTPS
   - Set secure CORS policies
   - Use strong JWT_SECRET
   - Configure CSP headers

## Resources

- [Privy Documentation](https://docs.privy.io/)
- [Privy Dashboard](https://dashboard.privy.io/)
- [Privy React SDK](https://www.npmjs.com/package/@privy-io/react-auth)

## Support

For issues specific to Privy integration:
1. This documentation
2. [Privy Discord](https://discord.gg/privy)
3. [Privy Support](https://support.privy.io/)

For application-specific issues, contact your development team.

---

**Last Updated:** October 2025
**Configuration:** Email-Only Authentication
