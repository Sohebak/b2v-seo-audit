# SEO Audit Backend - AI-Powered Reports ✅

Backend API for generating AI-enhanced SEO website audit reports for Business2Virtual.

## Current Status: AI-Powered Professional Reports (FREE with Gemini!)

### What's Working Now:
- ✅ Express server setup
- ✅ CORS configured for business2virtual.com
- ✅ API endpoint `/api/audit` that accepts URL and email
- ✅ Input validation (URL format, email format)
- ✅ Complete SEO audit engine with 10+ checks
- ✅ Google PageSpeed Insights API integration
- ✅ Core Web Vitals (LCP, FCP, CLS, TBT, SI)
- ✅ Professional PDF report generation
- ✅ Branded reports with Business2Virtual logo
- ✅ Download endpoint for PDF reports
- ✅ **🤖 AI-Powered Analysis with Google Gemini (RECOMMENDED - FREE!)**
- ✅ **Alternative: Claude AI support**
- ✅ **Intelligent insights and recommendations**
- ✅ **Prioritized action plans**
- ✅ **Industry-specific advice**
- ✅ Error handling

### SEO Checks Implemented:
1. ✅ **SSL Certificate** - HTTPS security check
2. ✅ **Meta Tags** - Title, description, keywords analysis
3. ✅ **Heading Structure** - H1-H6 hierarchy check
4. ✅ **Image Optimization** - Alt text and image count
5. ✅ **🆕 Google PageSpeed Insights** - Official performance scores
   - Mobile & Desktop performance scores
   - Core Web Vitals (LCP, FCP, CLS, TBT, SI)
   - SEO, Accessibility, Best Practices scores
   - Detailed optimization recommendations
   - *(Falls back to basic timing if API key not set)*
6. ✅ **Mobile Responsiveness** - Viewport and mobile-friendly check
7. ✅ **Social Media Tags** - Open Graph and Twitter Cards
8. ✅ **Content Quality** - Word count analysis
9. ✅ **Link Structure** - Internal and external links
10. ✅ **Robots.txt & Sitemap** - SEO files detection

Each check provides:
- Score (0-100)
- Status (pass/warning/fail)
- Detailed findings
- Specific recommendations

### PDF Report Features:
- 🎨 **Professional Design** - Clean, branded layout
- 📊 **Visual Score Display** - Large circular score indicator
- 📈 **Score Breakdown** - Pass/Warning/Fail statistics
- 📝 **Detailed Analysis** - All 10 SEO checks with recommendations
- 🎯 **Priority Recommendations** - Top issues to fix first
- 🏢 **Business2Virtual Branding** - Your agency logo and colors
- 📄 **Multi-page Report** - Comprehensive, easy-to-read format
- 🤖 **AI-Powered Insights** (NEW):
  - **Powered by Google Gemini** (Recommended - 100% FREE!)
  - **Alternative: Claude AI** (Also available)
  - **Executive Summary** - Professional overview of SEO health
  - **Detailed Explanations** - Why issues matter and their impact
  - **Prioritized Action Plan** - Quick wins, medium-term, long-term fixes
  - **Industry Insights** - Competitive benchmarking and context
  - **Content Recommendations** - Specific meta tag and content suggestions
  - **Best Practices** - Technical explanations in simple terms

### AI Provider Comparison:

| Feature | Google Gemini (Default) | Claude AI |
|---------|-------------------------|-----------|
| Cost | **FREE Forever** | Free tier then paid |
| Daily Limit | 1,500 reports | ~500 reports |
| Quality | Excellent | Excellent |
| Speed | Very Fast | Fast |
| Recommended | ✅ Yes | Alternative |

### Installation

1. **Install dependencies:**
```bash
npm install
```

**Note:** Puppeteer will download Chromium (~170MB) during installation. This is normal and required for website analysis.

2. **Create environment file:**
```bash
cp .env.example .env
```

3. **🆕 Set up Google Gemini AI API (RECOMMENDED - 100% FREE!):**

Get a **FREE API key** for AI-powered reports:
- Go to https://aistudio.google.com/app/apikey
- Sign in with Google (no credit card required)
- Create API key
- Add to `.env` file:
  ```
  GEMINI_API_KEY=your-key-here
  AI_PROVIDER=gemini
  ```
- **Free tier: 1,500 reports/day** - completely free forever!
- See `GEMINI_API_SETUP.md` for detailed guide

**Alternative:** Use Claude AI (also free tier available)
- See `.env.example` for configuration

**Without AI key:** Reports still work but without AI insights.

4. **🆕 (Optional) Set up Google PageSpeed API:**

Get a **FREE API key** (25,000 requests/day):
- Follow the detailed guide in `GOOGLE_API_SETUP.md`
- Or quick steps:
  1. Go to https://console.cloud.google.com/
  2. Enable "PageSpeed Insights API"
  3. Create API key
  4. Add to `.env` file

**Without API key:** Tool still works but uses basic timing instead of Google's scores.

4. **Run the server:**

For development (with auto-restart):
```bash
npm run dev
```

For production:
```bash
npm start
```

The server will start on `http://localhost:3000`

### Testing the API

**Using curl:**
```bash
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "email": "test@example.com"
  }'
```

**Using Postman or any API client:**
- Method: POST
- URL: `http://localhost:3000/api/audit`
- Headers: `Content-Type: application/json`
- Body (JSON):
```json
{
  "url": "https://example.com",
  "email": "client@example.com"
}
```

**Expected Response (Sample):**
```json
{
  "status": "success",
  "message": "Audit completed successfully",
  "data": {
    "url": "https://example.com",
    "email": "client@example.com",
    "audit": {
      "url": "https://example.com",
      "timestamp": "2024-02-07T10:30:00.000Z",
      "overallScore": 75,
      "overallStatus": "Good",
      "overallMessage": "Your website has good SEO with room for improvement.",
      "checks": {
        "ssl": {
          "name": "SSL Certificate",
          "status": "pass",
          "score": 100,
          "message": "Website is secured with HTTPS"
        },
        "metaTags": {
          "name": "Meta Tags",
          "status": "pass",
          "score": 80,
          "details": {
            "title": { "text": "Example Domain", "length": 14 },
            "description": { "text": "Example description...", "length": 145 }
          }
        },
        // ... 8 more checks
      }
    }
  }
}
```

### API Endpoints

#### Health Check
- **GET** `/`
- Returns API status

#### Submit Audit Request
- **POST** `/api/audit`
- Body:
  - `url` (string, required): Website URL to audit
  - `email` (string, required): Email to send report
- Returns: Audit results + PDF path

#### Download PDF Report
- **GET** `/api/download/:filename`
- Downloads the generated PDF report
- Example: `/api/download/SEO_Report_example_com_1234567890.pdf`

### WordPress Form Integration (Test)

Add this JavaScript to your WordPress page to test the connection:

```javascript
document.getElementById('your-form-id').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const url = document.getElementById('url-field').value;
  const email = document.getElementById('email-field').value;
  
  try {
    const response = await fetch('http://localhost:3000/api/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, email })
    });
    
    const data = await response.json();
    
    if (data.status === 'success') {
      alert('Audit request submitted successfully!');
    } else {
      alert('Error: ' + data.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to submit request');
  }
});
```

### Deployment Options

#### Option 1: Free Hosting (Railway)
1. Create account at railway.app
2. Connect your GitHub repo
3. Deploy automatically

#### Option 2: Free Hosting (Render)
1. Create account at render.com
2. Connect GitHub repo
3. Set environment variables
4. Deploy

#### Option 3: Your VPS
1. Upload files to VPS
2. Install Node.js
3. Run `npm install`
4. Use PM2 to keep server running:
```bash
npm install -g pm2
pm2 start server.js --name seo-audit
pm2 save
```

### Next Steps

**Step 4:** Integrate email service to send reports automatically to clients

**Step 5:** Final WordPress form integration

**Step 6:** Add database for lead storage

---

## Testing the Audit Engine

**Test with real websites:**

```json
{
  "url": "https://business2virtual.com",
  "email": "test@example.com"
}
```

The audit will take 10-30 seconds depending on the website size. You'll get:
- Overall score (0-100)
- Status for each of 10 SEO checks
- Specific recommendations for improvement
- Detailed metrics and findings
- **PDF report generated in `/reports` folder**

**Testing PDF Generation:**

After running an audit in Postman, you'll receive a response with:
```json
{
  "status": "success",
  "data": {
    "pdfGenerated": true,
    "pdfPath": "/path/to/reports/SEO_Report_xxx.pdf"
  }
}
```

**To view the PDF:**
1. Check the `reports/` folder in your project
2. Or use the download endpoint: `GET http://localhost:3000/api/download/SEO_Report_xxx.pdf`
3. Or open directly from the file system

**Important Notes:**
- The first run after installation might be slower (Puppeteer setup)
- Some websites may block automated access - this is normal
- Audits timeout after 30 seconds to prevent hanging
- PDFs are automatically saved in the `reports/` folder
- Reports folder is created automatically if it doesn't exist

---

## Project Structure

```
seo-audit-backend/
├── server.js                   # Main Express server
├── auditEngine.js              # SEO audit logic with Google PageSpeed
├── aiReportGenerator.js        # AI insights (Gemini + Claude support)
├── htmlPdfGenerator.js         # HTML-to-PDF converter (NEW)
├── templates/
│   └── report-template.html    # Professional HTML report template (NEW)
├── reports/                    # Generated PDF reports (auto-created)
├── test-audit.js               # Test script
├── package.json                # Dependencies
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore rules
├── README.md                   # This file
├── GEMINI_API_SETUP.md         # Gemini API setup (RECOMMENDED)
└── GOOGLE_API_SETUP.md         # Google PageSpeed API setup guide
```

## Support

For issues or questions, check the console logs when running the server.