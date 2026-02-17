# Deployment Guide — GitHub + Render

## Overview
```
Your Computer → GitHub (code) → Render (live server)
                                     ↓
                              business2virtual.com (WordPress)
```

---

## PART 1 — Push to GitHub

### Step 1: Create GitHub repository

1. Go to https://github.com/new
2. Repository name: `b2v-seo-audit`
3. Set to **Private** (keeps your API keys config safe)
4. Do NOT check "Add README" or anything else
5. Click **Create repository**

### Step 2: Push your local code

Open your terminal in the project folder and run these commands one by one:

```bash
cd path/to/seo-audit-backend

# Initialise git (if not already done)
git init

# Add all files (node_modules and .env are excluded by .gitignore)
git add .

# First commit
git commit -m "Initial commit — B2V SEO Audit backend"

# Connect to your GitHub repo (replace YOUR-USERNAME)
git remote add origin https://github.com/YOUR-USERNAME/b2v-seo-audit.git

# Push to GitHub
git branch -M main
git push -u origin main
```

✅ Refresh your GitHub repo — all files should be there (no .env, no node_modules)

---

## PART 2 — Deploy to Render

### Step 3: Create Render account

Sign up free at https://render.com (use GitHub login for easiest setup)

### Step 4: Create a new Web Service

1. Click **New → Web Service**
2. Connect your GitHub account if not already
3. Select your `b2v-seo-audit` repository
4. Click **Connect**

### Step 5: Configure the service

Fill in these settings:

| Field | Value |
|-------|-------|
| **Name** | `b2v-seo-audit` |
| **Region** | Oregon (US West) |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Plan** | Free |

### Step 6: Add Environment Variables

In Render, scroll down to **Environment Variables** and add these:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `GEMINI_API_KEY` | your Gemini API key |
| `AI_PROVIDER` | `gemini` |
| `GOOGLE_PAGESPEED_API_KEY` | your PageSpeed key |
| `BREVO_API_KEY` | your Brevo API key |
| `EMAIL_FROM_NAME` | `Business2Virtual SEO Audit` |

> ⚠️ Never put these in your code or .env file that gets committed to GitHub.
> Render's environment variables are encrypted and secure.

### Step 7: Deploy

Click **Create Web Service**

Render will:
1. Clone your repo
2. Run `npm install` (downloads Puppeteer + Chromium ~170MB — takes 3-5 min first time)
3. Start your server
4. Give you a URL like: `https://b2v-seo-audit.onrender.com`

Watch the deploy logs — look for:
```
🚀 SEO Audit API server running on port 10000
✅ Email ready — Brevo API, from: info@business2virtual.com
```

### Step 8: Test your live API

```
GET https://b2v-seo-audit.onrender.com/
```
Should return: `{"status":"success","message":"SEO Audit API is running"}`

```
GET https://b2v-seo-audit.onrender.com/api/test-email
```
Should return: `{"status":"success","message":"Connected! ..."}`

---

## PART 3 — Connect WordPress

### Step 9: Update the PHP Code Snippet

In WordPress → Code Snippets → edit your B2V snippet.

Change this line:
```php
define( 'B2V_AUDIT_API_URL', 'https://b2v-seo-audit.onrender.com' );
```

If Render gave you a different URL, use that one instead.

**Save & verify** the snippet is still active.

### Step 10: Test end-to-end

1. Go to your WordPress page with the CF7 form
2. Submit with a real URL and email
3. Modal should appear → progress steps → success screen
4. Email should arrive within 2-3 minutes

---

## PART 4 — Auto-Deploy on Code Changes (Optional)

Every time you push to GitHub, Render can automatically redeploy.

### Set up GitHub → Render webhook:

1. In Render → your service → **Settings** → scroll to **Deploy Hook**
2. Copy the deploy hook URL
3. In GitHub → your repo → **Settings → Secrets and variables → Actions**
4. Click **New repository secret**
5. Name: `RENDER_DEPLOY_HOOK`
6. Value: paste the Render URL
7. Save

Now every `git push origin main` triggers a Render redeploy automatically!

---

## Future Updates Workflow

```bash
# Make your changes locally
# Test locally with npm start

# Push to GitHub → Render auto-deploys
git add .
git commit -m "describe your change"
git push origin main

# Render redeploys in ~2 minutes
```

---

## Important Notes

### Render Free Tier Limitations
- **Spins down after 15 min of inactivity** — first request after idle takes ~30s to wake up
- **750 hours/month free** — enough for one always-on service
- To avoid cold starts: upgrade to Render Starter ($7/mo) or use an uptime monitor (UptimeRobot free) to ping every 10 min

### Puppeteer on Render
- First deploy takes longer (downloads Chromium)
- `--single-process` flag is required on Render free tier (already added ✅)
- Works reliably after the first deploy

### PDF Storage
- Render's filesystem is ephemeral — PDFs in `/tmp` are deleted on redeploy
- This is fine — PDFs are emailed immediately and don't need to persist
- If you want persistent storage later, add Cloudinary or S3 (Step 7)