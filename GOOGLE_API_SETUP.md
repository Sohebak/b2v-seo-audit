# Google PageSpeed Insights API Setup Guide

## Why Use Google PageSpeed API?

The Google PageSpeed Insights API provides:
- ✅ **Official Google Performance Scores** (same as PageSpeed.web.dev)
- ✅ **Core Web Vitals** - LCP, FCP, CLS, TBT, SI
- ✅ **Mobile & Desktop Analysis** - Separate scores for both
- ✅ **SEO, Accessibility, Best Practices** scores
- ✅ **Detailed Recommendations** from Google Lighthouse
- ✅ **Real User Metrics** (when available)

## How to Get Your FREE API Key

### Step 1: Go to Google Cloud Console
Visit: https://console.cloud.google.com/

### Step 2: Create a New Project (if you don't have one)
1. Click on the project dropdown at the top
2. Click "New Project"
3. Name it: `SEO-Audit-Tool` or anything you like
4. Click "Create"

### Step 3: Enable PageSpeed Insights API
1. In the search bar, type: **PageSpeed Insights API**
2. Click on "PageSpeed Insights API"
3. Click the **"Enable"** button
4. Wait a few seconds for it to activate

### Step 4: Create API Credentials
1. Click **"Create Credentials"** button (top right)
2. Select:
   - **Which API are you using?** → PageSpeed Insights API
   - **What data will you access?** → Public data
3. Click **"Next"**
4. Your API key will be generated!

### Step 5: Copy Your API Key
1. Click the **copy icon** next to your API key
2. Keep this key safe!

### Step 6: (Optional but Recommended) Restrict Your API Key
For security, restrict your API key:
1. Click on your API key to edit it
2. Under "API restrictions":
   - Select "Restrict key"
   - Choose "PageSpeed Insights API"
3. Under "Application restrictions" (optional):
   - Select "HTTP referrers" or "IP addresses"
   - Add your server IP or domain
4. Click **"Save"**

### Step 7: Add API Key to Your Project
1. Open your `.env` file
2. Replace the placeholder:
```
GOOGLE_PAGESPEED_API_KEY=your-api-key-here
```
With your actual key:
```
GOOGLE_PAGESPEED_API_KEY=AIzaSyD...your-actual-key...xyz
```
3. Save the file
4. Restart your server

## Free Tier Limits

Google provides a **FREE tier** with:
- ✅ **25,000 requests per day** (more than enough!)
- ✅ **No credit card required**
- ✅ **No charges** unless you explicitly upgrade

For our SEO audit tool, this free tier is perfect!

## Testing Your API Key

Run this test:
```bash
node test-audit.js
```

If the API key is working, you'll see:
```
Running Google PageSpeed Insights (this may take 30-60 seconds)...
Google PageSpeed completed: XX/100
```

## Without API Key

If you don't set up the API key, the tool will still work but will use:
- Basic page load timing (less accurate)
- No Core Web Vitals
- No Google Lighthouse scores

## Troubleshooting

**Error: "API key not valid"**
- Make sure you copied the entire key
- Check that PageSpeed Insights API is enabled
- Verify there are no extra spaces in the .env file

**Error: "Quota exceeded"**
- You've hit the daily limit (25,000 requests)
- Wait until tomorrow, or upgrade to paid tier

**Error: "API request failed"**
- Check your internet connection
- Verify the target website is accessible
- Some websites may block Google's crawler

## Cost Monitoring

To check your API usage:
1. Go to Google Cloud Console
2. Navigate to **"APIs & Services" → "Dashboard"**
3. Click on **"PageSpeed Insights API"**
4. View your usage stats

You can set up billing alerts to notify you if you approach limits.

## Alternative: Run Without API Key

The tool works perfectly fine without the API key:
- It measures basic load time using Puppeteer
- Still provides 9 other SEO checks
- You can always add the API key later

---

## Summary

1. Go to: https://console.cloud.google.com/
2. Create/Select project
3. Enable "PageSpeed Insights API"
4. Create credentials → API Key
5. Copy key to `.env` file
6. Restart server
7. Done! 🎉

**Total time:** 5-10 minutes
**Cost:** FREE (25,000 requests/day)
