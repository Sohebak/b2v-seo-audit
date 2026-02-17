# Google Gemini API Setup Guide (RECOMMENDED - FREE)

## Why Use Gemini API?

Google Gemini is **HIGHLY RECOMMENDED** for this project because:
- ✅ **100% FREE** with very generous limits
- ✅ **60 requests per minute** (much higher than Claude)
- ✅ **1500 requests per day** FREE tier
- ✅ **No credit card required**
- ✅ **Excellent quality** for SEO analysis
- ✅ **Fast response times**
- ✅ **Easy integration** with Google ecosystem

## Comparison: Gemini vs Claude

| Feature | Google Gemini | Anthropic Claude |
|---------|---------------|------------------|
| **Free Tier** | 60 req/min, 1500/day | Limited credits (~$5) |
| **Cost after free** | Still FREE! | $0.02-0.04 per report |
| **Credit Card** | Not required | Not required initially |
| **Quality** | Excellent | Excellent |
| **Speed** | Very fast | Fast |
| **Best for** | High volume, FREE usage | Alternative option |

**Recommendation:** Start with Gemini - it's completely free with higher limits!

---

## How to Get Your FREE Gemini API Key

### Step 1: Go to Google AI Studio
Visit: https://makersuite.google.com/app/apikey

### Step 2: Sign in with Google Account
- Use your existing Google account
- No credit card needed!

### Step 3: Create API Key
1. Click **"Get API Key"** or **"Create API Key"**
2. Select a Google Cloud project (or create a new one)
3. Your API key will be generated immediately!
4. Click **Copy** to copy your API key

### Step 4: Add to Your Project
1. Open your `.env` file
2. Add your Gemini API key:
```
GEMINI_API_KEY=AIzaSyD...your-actual-key...xyz
AI_PROVIDER=gemini
```
3. Save the file
4. Restart your server

---

## Free Tier Limits

Gemini FREE tier includes:
- ✅ **60 requests per minute**
- ✅ **1,500 requests per day**
- ✅ **1 million tokens per request**
- ✅ **No expiration** - free forever!

**For this project:** This means you can generate 1,500 AI-powered SEO reports PER DAY for FREE! 🎉

---

## Testing Your API Key

After adding the API key to `.env`:

1. **Restart your server:**
```bash
npm start
```

2. **Run a test audit in Postman**

3. **Check the console output:**
You should see:
```
Enhancing report with AI insights using GEMINI...
AI-enhanced report generated successfully
```

4. **Check the response:**
```json
{
  "aiEnhanced": true,
  "aiProvider": "gemini"
}
```

---

## Switching Between Gemini and Claude

You can switch AI providers anytime in `.env`:

**Use Gemini (Recommended - FREE):**
```
GEMINI_API_KEY=your-gemini-key
AI_PROVIDER=gemini
```

**Use Claude (Alternative):**
```
ANTHROPIC_API_KEY=your-claude-key
AI_PROVIDER=claude
```

**Have both configured?** Just change `AI_PROVIDER` to switch!

---

## API Key Security

**Best Practices:**
1. ✅ Never commit `.env` file to GitHub
2. ✅ Keep API keys private
3. ✅ Use environment variables
4. ✅ Regenerate key if exposed

**Restrict API Key (Optional):**
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your API key
4. Under **API restrictions**:
   - Select "Restrict key"
   - Choose "Generative Language API"
5. Under **Application restrictions**:
   - Add your server IP or domain
6. Click **Save**

---

## Usage Monitoring

Track your Gemini API usage:
1. Go to: https://aistudio.google.com/app/api-keys
2. Click on your API key
3. View usage statistics

You can see:
- Requests per day
- Tokens used
- Error rates

---

## Troubleshooting

**Error: "API key not valid"**
- Make sure you copied the entire key
- Check for extra spaces in `.env` file
- Verify the key is from https://aistudio.google.com/app/api-keys

**Error: "Quota exceeded"**
- You've hit the 1,500/day limit (very unlikely!)
- Wait until tomorrow
- Or create a new API key with a different Google account

**Error: "Model not found"**
- Check internet connection
- Verify API key is correct
- Make sure you're using `gemini-1.5-flash` model

---

## Cost Comparison for 1000 Reports/Month

| Provider | Monthly Cost | Notes |
|----------|--------------|-------|
| **Gemini** | **$0** | FREE forever! |
| Claude Haiku | ~$20-40 | After free credits |
| ChatGPT-3.5 | ~$2 | Very cheap but lower quality |
| ChatGPT-4 | ~$100 | Expensive |

**Winner:** Gemini - Completely FREE! 🏆

---

## Summary

**Quick Setup (2 minutes):**
1. Visit: https://aistudio.google.com/app/api-keys
2. Sign in with Google
3. Create API key
4. Add to `.env`: `GEMINI_API_KEY=your-key`
5. Set: `AI_PROVIDER=gemini`
6. Restart server
7. Done! 🎉

**Total Cost:** $0 forever
**Reports per day:** 1,500 FREE
**Setup time:** 2 minutes

This is the BEST option for your SEO audit tool!