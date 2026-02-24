const puppeteer = require("puppeteer");
const chromium = require("@sparticuz/chromium");
const axios = require("axios");
const cheerio = require("cheerio");

class SEOAuditor {
  constructor(url) {
    this.url = url;
    this.results = {
      url: url,
      timestamp: new Date().toISOString(),
      overallScore: 0,
      checks: {},
    };
  }

  async runAudit() {
    let browser = null;
    try {
      console.log(`Starting audit for: ${this.url}`);

      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });

      const page = await browser.newPage();

      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      );

      await page.setViewport({ width: 1920, height: 1080 });

      const startTime = Date.now();
      await page.goto(this.url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      await new Promise((resolve) => setTimeout(resolve, 3000));

      const loadTime = Date.now() - startTime;

      const html = await page.content();
      const $ = cheerio.load(html);

      await this.checkSSL();
      this.checkMetaTags($);
      this.checkHeadings($);
      this.checkImages($);

      if (
        process.env.GOOGLE_PAGESPEED_API_KEY &&
        process.env.GOOGLE_PAGESPEED_API_KEY !== "your-api-key-here"
      ) {
        await this.checkPageSpeedWithGoogle();
      } else {
        this.checkPageSpeed(loadTime);
      }

      await this.checkMobileResponsive(page);
      this.checkSocialTags($);
      this.checkContent($);
      this.checkLinks($);
      await this.checkRobotsAndSitemap();

      await browser.close();

      this.calculateOverallScore();

      console.log(`Audit completed for: ${this.url}`);
      return this.results;
    } catch (error) {
      if (browser) {
        await browser.close().catch(() => {});
      }
      console.error("Audit error:", error);
      throw new Error(`Failed to audit website: ${error.message}`);
    }
  }

  async checkSSL() {
    try {
      const isSSL = this.url.startsWith("https://");

      this.results.checks.ssl = {
        name: "SSL Security",
        status: isSSL ? "pass" : "fail",
        score: isSSL ? 100 : 0,
        message: isSSL
          ? "Website is secured with HTTPS"
          : "Website is NOT secure. SSL certificate required.",
        recommendation: isSSL
          ? null
          : "Install an SSL certificate to secure your website and improve SEO rankings.",
      };
    } catch (error) {
      this.results.checks.ssl = {
        name: "SSL Security",
        status: "fail",
        score: 0,
        message: "Could not verify SSL status",
        recommendation:
          "Ensure your website has a valid SSL certificate installed.",
      };
    }
  }

  checkMetaTags($) {
    const title = $("title").text() || "";
    const metaDesc = $('meta[name="description"]').attr("content") || "";
    const metaKeywords = $('meta[name="keywords"]').attr("content") || "";

    let score = 0;
    let issues = [];
    let recommendations = [];

    if (title.length > 0) {
      score += 40;
      if (title.length < 30 || title.length > 60) {
        issues.push("Title length should be 30-60 characters");
        recommendations.push(
          "Adjust title length to 30-60 characters for better display in search results",
        );
      }
    } else {
      issues.push("Missing title tag");
      recommendations.push("Add a descriptive title tag to your page");
    }

    if (metaDesc.length > 0) {
      score += 40;
      if (metaDesc.length < 120 || metaDesc.length > 160) {
        issues.push("Meta description should be 120-160 characters");
        recommendations.push(
          "Optimize meta description length for better SERP display",
        );
      }
    } else {
      issues.push("Missing meta description");
      recommendations.push(
        "Add a compelling meta description to improve click-through rates",
      );
    }

    if (metaKeywords) {
      score += 20;
    } else {
      issues.push("Consider adding meta keywords (low priority)");
    }

    this.results.checks.metaTags = {
      name: "Meta Tags",
      status: score >= 60 ? "pass" : score >= 40 ? "warning" : "fail",
      score: score,
      message:
        issues.length > 0
          ? issues.join(" | ")
          : "Meta tags are properly configured",
      recommendation:
        recommendations.length > 0 ? recommendations.join(". ") : null,
      details: {
        title,
        metaDesc,
        titleLength: title.length,
        descLength: metaDesc.length,
      },
    };
  }

  checkHeadings($) {
    const h1Count = $("h1").length;
    const h2Count = $("h2").length;
    const h3Count = $("h3").length;

    let score = 0;
    let status = "fail";
    let message = "";

    if (h1Count === 1) {
      score = 100;
      status = "pass";
      message = `Perfect heading structure: 1 H1, ${h2Count} H2s`;
    } else if (h1Count === 0) {
      score = 0;
      status = "fail";
      message = "Missing H1 tag - critical for SEO";
    } else {
      score = 50;
      status = "warning";
      message = `Multiple H1 tags found (${h1Count}). Should have exactly one.`;
    }

    this.results.checks.headings = {
      name: "Heading Structure",
      status: status,
      score: score,
      message: message,
      recommendation:
        h1Count !== 1
          ? "Use exactly one H1 tag per page for optimal SEO"
          : null,
      details: { h1: h1Count, h2: h2Count, h3: h3Count },
    };
  }

  checkImages($) {
    const images = $("img");
    const totalImages = images.length;
    let imagesWithAlt = 0;

    images.each((i, img) => {
      if ($(img).attr("alt")) {
        imagesWithAlt++;
      }
    });

    const score =
      totalImages === 0 ? 100 : Math.round((imagesWithAlt / totalImages) * 100);

    this.results.checks.images = {
      name: "Image Optimization",
      status: score === 100 ? "pass" : score >= 70 ? "warning" : "fail",
      score: score,
      message: `${imagesWithAlt} of ${totalImages} images have alt text`,
      recommendation:
        score < 100
          ? "Add descriptive alt text to all images for better accessibility and SEO"
          : null,
      details: {
        total: totalImages,
        withAlt: imagesWithAlt,
        missing: totalImages - imagesWithAlt,
      },
    };
  }

  checkPageSpeed(loadTime) {
    const seconds = (loadTime / 1000).toFixed(2);
    let score = 100;
    let status = "pass";

    if (loadTime > 3000) {
      score = 40;
      status = "fail";
    } else if (loadTime > 2000) {
      score = 70;
      status = "warning";
    }

    this.results.checks.pageSpeed = {
      name: "Page Performance",
      status: status,
      score: score,
      message: `Page loaded in ${seconds} seconds`,
      recommendation:
        score < 100
          ? "Optimize images, enable caching, and minify CSS/JS to improve load time"
          : null,
      details: { loadTime: loadTime, seconds: parseFloat(seconds) },
    };
  }

  async checkPageSpeedWithGoogle() {
    try {
      const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(this.url)}&key=${apiKey}&strategy=mobile`;

      const response = await axios.get(apiUrl, { timeout: 30000 });
      const data = response.data;

      const score = Math.round(
        data.lighthouseResult.categories.performance.score * 100,
      );

      this.results.checks.pageSpeed = {
        name: "Page Performance",
        status: score >= 80 ? "pass" : score >= 50 ? "warning" : "fail",
        score: score,
        message: `Google PageSpeed score: ${score}/100`,
        recommendation:
          score < 80
            ? "Improve Core Web Vitals: LCP, FID, and CLS for better performance"
            : null,
        details: {
          performanceScore: score,
          metrics: data.lighthouseResult.audits,
        },
      };
    } catch (error) {
      console.warn("PageSpeed API error:", error.message);
      this.checkPageSpeed(2000);
    }
  }

  async checkMobileResponsive(page) {
    try {
      await page.setViewport({ width: 375, height: 667 });
      await page.reload({ waitUntil: "domcontentloaded" });

      const viewport = $('meta[name="viewport"]').attr("content");
      const isMobileFriendly =
        viewport && viewport.includes("width=device-width");

      this.results.checks.mobile = {
        name: "Mobile Friendliness",
        status: isMobileFriendly ? "pass" : "fail",
        score: isMobileFriendly ? 100 : 0,
        message: isMobileFriendly
          ? "Website is mobile-friendly!"
          : "No mobile viewport detected",
        recommendation: isMobileFriendly
          ? null
          : "Add viewport meta tag for mobile responsiveness",
        details: { viewport: viewport || "Not set" },
      };
    } catch (error) {
      this.results.checks.mobile = {
        name: "Mobile Friendliness",
        status: "warning",
        score: 50,
        message: "Could not fully test mobile responsiveness",
        recommendation: "Ensure your site is mobile-responsive",
      };
    }
  }

  checkSocialTags($) {
    const ogTitle = $('meta[property="og:title"]').attr("content");
    const ogDesc = $('meta[property="og:description"]').attr("content");
    const ogImage = $('meta[property="og:image"]').attr("content");
    const twitterCard = $('meta[name="twitter:card"]').attr("content");

    let score = 0;
    if (ogTitle) score += 30;
    if (ogDesc) score += 30;
    if (ogImage) score += 20;
    if (twitterCard) score += 20;

    this.results.checks.socialTags = {
      name: "Social Metadata",
      status: score >= 80 ? "pass" : score >= 50 ? "warning" : "fail",
      score: score,
      message:
        score >= 80
          ? "Social media tags are properly configured!"
          : "Missing some social media tags",
      recommendation:
        score < 80
          ? "Add Open Graph and Twitter Card tags for better social sharing"
          : null,
      details: { ogTitle, ogDesc, ogImage, twitterCard },
    };
  }

  checkContent($) {
    const bodyText = $("body").text();
    const wordCount = bodyText
      .split(/\s+/)
      .filter((word) => word.length > 0).length;

    let score = 0;
    let status = "fail";
    let message = "";

    if (wordCount >= 300) {
      score = 100;
      status = "pass";
      message = `${wordCount} words found`;
    } else if (wordCount >= 150) {
      score = 60;
      status = "warning";
      message = `${wordCount} words - consider adding more content`;
    } else {
      score = 30;
      status = "fail";
      message = `Only ${wordCount} words - content is too thin`;
    }

    this.results.checks.content = {
      name: "Content Quality",
      status: status,
      score: score,
      message: message,
      recommendation:
        wordCount < 300
          ? "Add more high-quality, relevant content (aim for 300+ words)"
          : null,
      details: { wordCount },
    };
  }

  checkLinks($) {
    const links = $("a[href]");
    const totalLinks = links.length;
    let internalLinks = 0;
    let externalLinks = 0;

    links.each((i, link) => {
      const href = $(link).attr("href");
      if (
        href.startsWith("http") &&
        !href.includes(new URL(this.url).hostname)
      ) {
        externalLinks++;
      } else {
        internalLinks++;
      }
    });

    this.results.checks.links = {
      name: "Link Structure",
      status: "pass",
      score: 100,
      message: `${totalLinks} total links (${internalLinks} internal, ${externalLinks} external)`,
      recommendation: null,
      details: {
        total: totalLinks,
        internal: internalLinks,
        external: externalLinks,
      },
    };
  }

  async checkRobotsAndSitemap() {
    try {
      const baseUrl = new URL(this.url).origin;

      const robotsResponse = await axios.get(`${baseUrl}/robots.txt`, {
        timeout: 5000,
      });
      const hasRobots = robotsResponse.status === 200;

      const sitemapResponse = await axios.get(`${baseUrl}/sitemap.xml`, {
        timeout: 5000,
      });
      const hasSitemap = sitemapResponse.status === 200;

      const score = (hasRobots ? 50 : 0) + (hasSitemap ? 50 : 0);

      this.results.checks.robotsAndSitemap = {
        name: "Robots & Sitemap",
        status: score === 100 ? "pass" : score >= 50 ? "warning" : "fail",
        score: score,
        message: `Robots.txt: ${hasRobots ? "Found" : "Missing"}, Sitemap.xml: ${hasSitemap ? "Found" : "Missing"}`,
        recommendation:
          score < 100
            ? "Add missing robots.txt and/or sitemap.xml files"
            : null,
        details: { robots: hasRobots, sitemap: hasSitemap },
      };
    } catch (error) {
      this.results.checks.robotsAndSitemap = {
        name: "Robots & Sitemap",
        status: "warning",
        score: 50,
        message: "Could not verify robots.txt or sitemap.xml",
        recommendation: "Ensure robots.txt and sitemap.xml are accessible",
      };
    }
  }

  calculateOverallScore() {
    const checks = Object.values(this.results.checks);
    const totalScore = checks.reduce(
      (sum, check) => sum + (check.score || 0),
      0,
    );
    const avgScore = Math.round(totalScore / checks.length);

    this.results.overallScore = avgScore;

    if (avgScore >= 80) {
      this.results.overallStatus = "Excellent";
    } else if (avgScore >= 60) {
      this.results.overallStatus = "Good";
    } else if (avgScore >= 40) {
      this.results.overallStatus = "Needs Improvement";
    } else {
      this.results.overallStatus = "Poor";
    }
  }
}

module.exports = SEOAuditor;
