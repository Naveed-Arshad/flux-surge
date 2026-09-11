# ⚡ FLUX SURGE - Web-Only Version Setup Guide

## Overview
Yeh guide puri process cover karta hai: GitHub se deployment tak.
**NO TELEGRAM NEEDED** — Sirf simple web URL!

---

## FILES CHECKLIST

```
✅ flux-surge-backend.js      (backend API)
✅ flux-surge-frontend.html   (game UI)
✅ flux-surge-schema.sql      (database)
✅ package.json               (dependencies)
✅ .env.example               (config template)
✅ SETUP_GUIDE_WEB.md         (this file)
```

---

## STEP 1: GitHub Upload

### 1.1 Create Repository
1. Go to **github.com**
2. Click **"+"** → **"New repository"**
3. Name: `flux-surge`
4. Description: `Tap-to-earn game`
5. Public
6. Click **"Create repository"**

### 1.2 Upload Files
1. Click **"Add file"** → **"Upload files"**
2. Select these 5 files:
   - flux-surge-backend.js
   - flux-surge-frontend.html
   - flux-surge-schema.sql
   - package.json
   - .env.example
3. **"Commit changes"**

---

## STEP 2: Supabase Database

### 2.1 Create Project
1. Go to **supabase.com**
2. Login (GitHub se)
3. **"New Project"**
4. Settings:
   - Name: `flux-surge`
   - Password: `YourSecurePassword123` (yaad rakho!)
   - Region: **SINGAPORE** ⭐ (important!)
5. **"Create project"** (5-10 min wait)

### 2.2 Run Database Schema
1. Go to **SQL Editor**
2. **"New query"**
3. Copy entire `flux-surge-schema.sql` content
4. Paste it
5. **"Run"**
6. ✅ Done!

### 2.3 Get Connection String
1. **Settings** → **Database**
2. **Connection strings** → **PostgreSQL**
3. Copy the URL (kuch isko tarah):
   ```
   postgresql://postgres:YOUR_PASSWORD@db.supabase.co:5432/postgres
   ```

---

## STEP 3: Backend Deployment (Railway)

### 3.1 Deploy
1. Go to **railway.app**
2. Login (GitHub se)
3. **"Create new project"**
4. **"Deploy from GitHub repo"**
5. Select `flux-surge`
6. **"Deploy"** (wait 2-3 min)

### 3.2 Environment Variables
1. Railway dashboard → **Variables**
2. Add:
   ```
   DATABASE_URL=postgresql://postgres:PASSWORD@db.supabase.co:5432/postgres
   ADMIN_PASSWORD=admin123
   PORT=5000
   NODE_ENV=production
   ```
3. **Save**

### 3.3 Get Backend URL
1. Railway → **Deployments** → **Live URL**
2. Copy it (kuch isko tarah): `https://flux-surge-prod.railway.app`
3. **YAAD RAKHO!**

---

## STEP 4: Frontend Deployment (Vercel)

### 4.1 Prepare Frontend
1. Open `flux-surge-frontend.html`
2. Find this line:
   ```javascript
   const API_URL = 'http://localhost:5000';
   ```
3. Replace with your Railway URL:
   ```javascript
   const API_URL = 'https://flux-surge-prod.railway.app';
   ```
4. Save & commit to GitHub

### 4.2 Deploy
1. Go to **vercel.com**
2. Login (GitHub se)
3. **"Import Project"**
4. Select `flux-surge`
5. **"Deploy"** (1-2 min)

### 4.3 Get Game URL
1. Vercel → **Deployments** → **Live URL**
2. Copy it (kuch isko tarah): `https://flux-surge.vercel.app`
3. **YAAD RAKHO!**

---

## STEP 5: Testing

### Local Test (Optional)
```bash
# Install dependencies
npm install

# Run backend locally
node flux-surge-backend.js

# Open in browser
http://localhost:5000
```

### Production Test
1. Go to your Vercel URL: `https://flux-surge.vercel.app`
2. Enter username (3+ characters)
3. **"Play"**
4. ✅ Game khul jayga!
5. Tap karo, coins earn karo!

---

## STEP 6: Share with Friends

**Just share this link:**
```
https://flux-surge.vercel.app
```

Friends khul jayga, username enter karain, game start! 🎉

---

## Troubleshooting

### "Connection error: API not responding"
- ✅ Railway URL correct hai frontend.html mein?
- ✅ Railway environment variables set hain?
- ✅ Database connection string sahi hai?
- ✅ Railway deployment successful?

### "Database error"
- ✅ SQL schema properly execute hua?
- ✅ Connection string copy correctly kiya?
- ✅ Password sahi daala?

### "Page nahi khul raha"
- ✅ Vercel deployment complete?
- ✅ GitHub repository updated?
- ✅ Browser cache clear kiya? (Ctrl+Shift+Del)

---

## Key URLs Summary

```
Game URL:       https://flux-surge.vercel.app
Backend API:    https://flux-surge-prod.railway.app
Database:       Supabase (Singapore region)
```

---

## What's in Phase 1?

✅ Tap mechanics  
✅ Energy system  
✅ 6 upgrades (3 categories)  
✅ Passive income  
✅ Daily rewards (streak)  
✅ Referral system  
✅ User authentication (username)  

---

## Next Steps (Phase 2 - Later)

- Daily cipher codes
- Combo cards
- Tasks/Achievements
- Leaderboard
- Social tasks
- Hamster skins
- Token system

---

## Support

**Having issues?**
- Check error messages (F12 → Console)
- Review Railway logs
- Check Supabase database

---

**Enjoy Flux Surge! 🚀**

Made with ❤️ for Pakistan gaming community.
