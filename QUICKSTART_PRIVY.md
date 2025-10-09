# Privy Authentication - Quick Start

Get your Synergi app running with Privy authentication in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- Privy account (free at https://dashboard.privy.io)

## Step 1: Get Your Privy App ID (2 minutes)

1. Go to https://dashboard.privy.io
2. Click "Create App" or sign in
3. Name your app "Synergi"
4. Go to **Settings** → **Basics**
5. Copy your **App ID** (looks like: `clabcd1234567890`)
6. Add `http://localhost:3000` to **Allowed Domains**

## Step 2: Configure Environment (1 minute)

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_PRIVY_APP_ID=paste_your_app_id_here
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Important:** Replace `paste_your_app_id_here` with your actual Privy App ID!

Make sure `backend/.env` exists:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/your_database
JWT_SECRET=your-super-secret-jwt-key
```

## Step 3: Install & Start (2 minutes)

### Backend

```bash
cd backend
npm install          # If not already installed
npx prisma migrate dev   # Apply database migrations
npm run dev          # Start on port 3001
```

### Frontend (in new terminal)

```bash
cd frontend
npm install          # If not already installed
npm run dev          # Start on port 3000
```

## Step 4: Test It Out!

1. Open http://localhost:3000
2. Click **"Sign In"** button in top right
3. Choose your preferred login method:
   - 📧 Email (passwordless)
   - 👛 Wallet (MetaMask, etc.)
   - 🌐 Google, Twitter, Discord

That's it! You're authenticated! 🎉

## What You'll See

### Before Login
```
┌─────────────────────────────────────┐
│  [☰]                    [🔐 Sign In] [☀]  │
│                                     │
│         Welcome to Synergi          │
│                                     │
└─────────────────────────────────────┘
```

### After Login
```
┌─────────────────────────────────────┐
│  [☰]              [👤 JD John Doe ▼] [☀]  │
│                                     │
│    Start chatting with AI agents!   │
│                                     │
└─────────────────────────────────────┘
```

### User Menu (when authenticated)
```
┌─ My Account ─────────────┐
│ john@example.com         │
│ [👛] 0x1234...5678       │
│ ─────────────────────── │
│ [⎋] Logout               │
└──────────────────────────┘
```

## Troubleshooting

### "Invalid App ID" Error

❌ **Problem:** Can't authenticate

✅ **Solution:** 
1. Check `NEXT_PUBLIC_PRIVY_APP_ID` in `.env.local`
2. Verify it matches your Privy dashboard
3. Restart frontend: `npm run dev`

### "Cannot connect to database"

❌ **Problem:** Backend can't start

✅ **Solution:**
1. Check PostgreSQL is running
2. Verify `DATABASE_URL` in `backend/.env`
3. Run migrations: `npx prisma migrate dev`

### "User sync failed"

❌ **Problem:** Can login but data doesn't save

✅ **Solution:**
1. Make sure backend is running on port 3001
2. Check `NEXT_PUBLIC_API_URL` matches backend
3. Check backend console for errors

### Privy Modal Doesn't Open

❌ **Problem:** Nothing happens when clicking Sign In

✅ **Solution:**
1. Open browser console (F12)
2. Look for errors
3. Clear cache and reload (Ctrl+Shift+R)
4. Verify `localhost:3000` is in Privy allowed domains

## Next Steps

✅ **Working?** Great! Here's what you can do:

1. **Try Different Login Methods**
   - Test email login
   - Connect a wallet (if you have MetaMask)
   - Try social login (configure OAuth in Privy)

2. **Customize the Branding**
   - Edit `frontend/components/privy-provider.tsx`
   - Change colors, logo, messages

3. **Deploy to Production**
   - See `PRIVY_SETUP.md` for production setup
   - Add your production domain to Privy

4. **Explore Features**
   - Chat with AI agents
   - Save conversations
   - Try dark/light mode

## Need Help?

📖 **Full Setup Guide:** See `PRIVY_SETUP.md`

📝 **Integration Details:** See `PRIVY_INTEGRATION_SUMMARY.md`

🆘 **Still Stuck?**
- Check Privy docs: https://docs.privy.io
- Join Privy Discord: https://discord.gg/privy
- Review browser console for errors

## Quick Tips

💡 **For Development:**
- Use email login (fastest)
- Keep backend terminal visible to see logs
- Check browser console for errors

🎨 **Customization:**
- Logo: Change `/synergi.svg` in `privy-provider.tsx`
- Colors: Update `accentColor` to your brand
- Text: Edit `landingHeader` and `loginMessage`

🔒 **Security:**
- Never commit `.env` files
- Use strong JWT_SECRET
- Enable HTTPS in production

---

**Happy coding! 🚀**

Your Synergi app now has professional authentication with Privy!

