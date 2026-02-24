const puppeteer = require("puppeteer");
const axios = require("axios");
const cheerio = require("cheerio");
const chromium = require("@sparticuz/chromium");

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

  /**
   * Main function to run all SEO audits
   */
  async runAudit() {
    let browser = null;
    try {
      console.log(`Starting audit for: ${this.url}`);

      // Launch browser — args tuned for Render / cloud environments
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });

      const page = await browser.newPage();

      // Set a realistic user agent to avoid bot blocking
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      );

      // Set viewport for desktop audit
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate — use 'domcontentloaded' so we don't wait for every
      // third-party script/ad/tracker to finish loading
      const startTime = Date.now();
      await page.goto(this.url, {
        waitUntil: "domcontentloaded",
        timeout: 60000, // 60 s — plenty for any real site
      });

      // Give JS a moment to render, but cap it at 3 s
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const loadTime = Date.now() - startTime;

      // Get page content
      const html = await page.content();
      const $ = cheerio.load(html);

      // Run all checks
      await this.checkSSL();
      this.checkMetaTags($);
      this.checkHeadings($);
      this.checkImages($);

      // Use Google PageSpeed API if available, otherwise use basic load time
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

      // Calculate overall score
      this.calculateOverallScore();

      console.log(`Audit completed for: ${this.url}`);
      return this.results;
    } catch (error) {
      // Always close browser even on failure
      if (browser) {
        await browser.close().catch(() => {});
      }
      console.error("Audit error:", error);
      throw new Error(`Failed to audit website: ${error.message}`);
    }
  }

  /**
   * Check SSL Certificate
   */
  async checkSSL() {
    const hasSSL = this.url.startsWith("https://");
    this.results.checks.ssl = {
      name: "SSL Certificate",
      status: hasSSL ? "pass" : "fail",
      score: hasSSL ? 100 : 0,
      message: hasSSL
        ? "Website is secured with HTTPS"
        : "Website is not using HTTPS - this is critical for security and SEO",
      recommendation: hasSSL
        ? "Great! Keep your SSL certificate up to date."
        : "Install an SSL certificate immediately. Most hosting providers offer free SSL certificates.",
    };
  }

  /**
   * Check Meta Tags (Title, Description, Keywords)
   */
  checkMetaTags($) {
    const title = $("title").text().trim();
    const description = $('meta[name="description"]').attr("content") || "";
    const keywords = $('meta[name="keywords"]').attr("content") || "";

    let score = 0;
    let issues = [];
    let recommendations = [];

    // Title check
    if (title) {
      if (title.length >= 30 && title.length <= 60) {
        score += 40;
      } else if (title.length > 0) {
        score += 20;
        issues.push(
          `Title length is ${title.length} characters (optimal: 30-60)`,
        );
        recommendations.push(
          "Adjust title length to 30-60 characters for better display in search results",
        );
      }
    } else {
      issues.push("Missing title tag");
      recommendations.push("Add a descriptive title tag to your page");
    }

    // Description check
    if (description) {
      if (description.length >= 120 && description.length <= 160) {
        score += 40;
      } else if (description.length > 0) {
        score += 20;
        issues.push(
          `Meta description length is ${description.length} characters (optimal: 120-160)`,
        );
        recommendations.push("Adjust meta description to 120-160 characters");
      }
    } else {
      issues.push("Missing meta description");
      recommendations.push(
        "Add a compelling meta description to improve click-through rates",
      );
    }

    // Keywords (less important now, but worth noting)
    if (keywords) {
      score += 20;
    } else {
      recommendations.push("Consider adding meta keywords (low priority)");
    }

    this.results.checks.metaTags = {
      name: "Meta Tags",
      status: score >= 60 ? "pass" : score >= 30 ? "warning" : "fail",
      score: score,
      details: {
        title: { text: title, length: title.length },
        description: { text: description, length: description.length },
        keywords: keywords || "Not set",
      },
      issues: issues,
      recommendation: recommendations.join(" | "),
    };
  }

  /**
   * Check Heading Structure (H1-H6)
   */
  checkHeadings($) {
    const h1Count = $("h1").length;
    const h2Count = $("h2").length;
    const headings = {
      h1: h1Count,
      h2: h2Count,
      h3: $("h3").length,
      h4: $("h4").length,
      h5: $("h5").length,
      h6: $("h6").length,
    };

    let score = 0;
    let issues = [];
    let recommendations = [];

    // H1 check (should have exactly one)
    if (h1Count === 1) {
      score += 50;
    } else if (h1Count === 0) {
      issues.push("No H1 tag found");
      recommendations.push(
        "Add exactly one H1 tag to your page as the main heading",
      );
    } else {
      score += 25;
      issues.push(`Multiple H1 tags found (${h1Count})`);
      recommendations.push(
        "Use only one H1 tag per page for better SEO structure",
      );
    }

    // H2 check
    if (h2Count > 0) {
      score += 30;
    } else {
      recommendations.push("Add H2 tags to structure your content better");
    }

    // General heading structure
    if (headings.h1 + headings.h2 + headings.h3 > 0) {
      score += 20;
    }

    this.results.checks.headings = {
      name: "Heading Structure",
      status: score >= 70 ? "pass" : score >= 40 ? "warning" : "fail",
      score: score,
      details: headings,
      issues: issues,
      recommendation: recommendations.join(" | ") || "Good heading structure!",
    };
  }

  /**
   * Check Images (Alt tags, count)
   */
  checkImages($) {
    const images = $("img");
    const totalImages = images.length;
    let imagesWithAlt = 0;
    let imagesWithoutAlt = 0;

    images.each((i, img) => {
      const alt = $(img).attr("alt");
      if (alt && alt.trim() !== "") {
        imagesWithAlt++;
      } else {
        imagesWithoutAlt++;
      }
    });

    let score = 0;
    let issues = [];
    let recommendations = [];
    let altPercentage = 0;

    if (totalImages === 0) {
      score = 50; // Neutral - not good or bad
      recommendations.push(
        "Consider adding relevant images to enhance user experience",
      );
      altPercentage = 0;
    } else {
      altPercentage = (imagesWithAlt / totalImages) * 100;

      if (altPercentage === 100) {
        score = 100;
      } else if (altPercentage >= 80) {
        score = 80;
        issues.push(`${imagesWithoutAlt} images missing alt attributes`);
        recommendations.push(
          "Add alt text to all images for better accessibility and SEO",
        );
      } else if (altPercentage >= 50) {
        score = 50;
        issues.push(`${imagesWithoutAlt} images missing alt attributes`);
        recommendations.push("Add descriptive alt text to all images");
      } else {
        score = 25;
        issues.push(
          `Majority of images (${imagesWithoutAlt}) missing alt attributes`,
        );
        recommendations.push(
          "Alt text is crucial for accessibility and SEO - add to all images",
        );
      }
    }

    this.results.checks.images = {
      name: "Image Optimization",
      status: score >= 70 ? "pass" : score >= 40 ? "warning" : "fail",
      score: score,
      details: {
        totalImages: totalImages,
        withAlt: imagesWithAlt,
        withoutAlt: imagesWithoutAlt,
        altPercentage: Math.round(altPercentage),
      },
      issues: issues,
      recommendation:
        recommendations.join(" | ") || "All images have alt text - great job!",
    };
  }

  /**
   * Check Page Load Speed using Google PageSpeed Insights API
   */
  async checkPageSpeedWithGoogle() {
    try {
      const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
      const apiUrl =
        "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

      console.log(
        "Running Google PageSpeed Insights (this may take 30-60 seconds)...",
      );

      // Run PageSpeed test for both mobile and desktop
      const [mobileResponse, desktopResponse] = await Promise.all([
        axios.get(apiUrl, {
          params: {
            url: this.url,
            key: apiKey,
            strategy: "mobile",
            category: ["performance", "accessibility", "best-practices", "seo"],
          },
          timeout: 60000,
        }),
        axios.get(apiUrl, {
          params: {
            url: this.url,
            key: apiKey,
            strategy: "desktop",
            category: ["performance", "accessibility", "best-practices", "seo"],
          },
          timeout: 60000,
        }),
      ]);

      const mobileData = mobileResponse.data;
      const desktopData = desktopResponse.data;

      // Safely extract scores with fallbacks
      const getScore = (data, category) => {
        try {
          const score = data?.lighthouseResult?.categories?.[category]?.score;
          return score !== undefined && score !== null
            ? Math.round(score * 100)
            : 0;
        } catch (e) {
          return 0;
        }
      };

      const mobilePerformance = getScore(mobileData, "performance");
      const desktopPerformance = getScore(desktopData, "performance");
      const mobileSEO = getScore(mobileData, "seo");
      const accessibility = getScore(mobileData, "accessibility");
      const bestPractices = getScore(mobileData, "best-practices");

      // Safely get Core Web Vitals
      const getMetricValue = (audits, metricName) => {
        try {
          return audits?.[metricName]?.displayValue || "N/A";
        } catch (e) {
          return "N/A";
        }
      };

      const mobileMetrics = mobileData?.lighthouseResult?.audits || {};
      const desktopMetrics = desktopData?.lighthouseResult?.audits || {};

      const coreWebVitals = {
        mobile: {
          FCP: getMetricValue(mobileMetrics, "first-contentful-paint"),
          LCP: getMetricValue(mobileMetrics, "largest-contentful-paint"),
          TBT: getMetricValue(mobileMetrics, "total-blocking-time"),
          CLS: getMetricValue(mobileMetrics, "cumulative-layout-shift"),
          SI: getMetricValue(mobileMetrics, "speed-index"),
        },
        desktop: {
          FCP: getMetricValue(desktopMetrics, "first-contentful-paint"),
          LCP: getMetricValue(desktopMetrics, "largest-contentful-paint"),
          TBT: getMetricValue(desktopMetrics, "total-blocking-time"),
          CLS: getMetricValue(desktopMetrics, "cumulative-layout-shift"),
          SI: getMetricValue(desktopMetrics, "speed-index"),
        },
      };

      // Calculate average performance score
      const avgPerformance = Math.round(
        (mobilePerformance + desktopPerformance) / 2,
      );

      let status = "fail";
      let message = "";
      let recommendations = [];

      if (avgPerformance >= 90) {
        status = "pass";
        message = `Excellent performance! Average score: ${avgPerformance}/100`;
        recommendations.push(
          "Your site is performing great! Continue monitoring and optimizing.",
        );
      } else if (avgPerformance >= 50) {
        status = "warning";
        message = `Moderate performance. Average score: ${avgPerformance}/100`;
        recommendations.push(
          "Optimize images, minify CSS/JS, leverage browser caching, and use a CDN.",
        );
      } else {
        status = "fail";
        message = `Poor performance. Average score: ${avgPerformance}/100`;
        recommendations.push(
          "Critical performance issues detected. Optimize images, reduce server response time, eliminate render-blocking resources, and minify code.",
        );
      }

      // Add specific recommendations based on Core Web Vitals (with safe checks)
      const getAuditScore = (audits, name) => {
        try {
          return audits?.[name]?.score || 0;
        } catch (e) {
          return 0;
        }
      };

      if (getAuditScore(mobileMetrics, "largest-contentful-paint") < 0.5) {
        recommendations.push(
          "Improve Largest Contentful Paint (LCP) by optimizing images and server response time.",
        );
      }
      if (getAuditScore(mobileMetrics, "cumulative-layout-shift") < 0.75) {
        recommendations.push(
          "Reduce Cumulative Layout Shift (CLS) by setting image dimensions and avoiding dynamic content insertion.",
        );
      }
      if (getAuditScore(mobileMetrics, "total-blocking-time") < 0.5) {
        recommendations.push(
          "Reduce Total Blocking Time (TBT) by breaking up long JavaScript tasks and removing unused code.",
        );
      }

      this.results.checks.pageSpeed = {
        name: "Google PageSpeed Insights",
        status: status,
        score: avgPerformance,
        message: message,
        recommendation: recommendations.join(" | "),
        details: {
          scores: {
            mobilePerformance: mobilePerformance,
            desktopPerformance: desktopPerformance,
            seo: mobileSEO,
            accessibility: accessibility,
            bestPractices: bestPractices,
          },
          coreWebVitals: coreWebVitals,
          pageSpeedUrl: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(this.url)}`,
        },
      };

      console.log(`Google PageSpeed completed: ${avgPerformance}/100`);
    } catch (error) {
      console.error("Google PageSpeed API error:", error.message);

      // Fallback to basic speed check if API fails
      this.results.checks.pageSpeed = {
        name: "Page Speed",
        status: "warning",
        score: 50,
        message: "Could not complete Google PageSpeed test",
        recommendation: "Test your site manually at https://pagespeed.web.dev/",
        details: {
          error:
            error.response?.data?.error?.message ||
            error.message ||
            "API request failed. Check your API key or rate limits.",
        },
      };
    }
  }

  /**
   * Check Page Load Speed (Basic - Fallback method)
   */
  checkPageSpeed(loadTime) {
    let score = 0;
    let status = "fail";
    let message = "";
    let recommendation = "";

    const seconds = (loadTime / 1000).toFixed(2);

    if (loadTime < 1000) {
      score = 100;
      status = "pass";
      message = `Excellent load time: ${seconds}s`;
      recommendation =
        "Great job! Keep optimizing to maintain fast load times.";
    } else if (loadTime < 2000) {
      score = 80;
      status = "pass";
      message = `Good load time: ${seconds}s`;
      recommendation =
        "Good performance. Consider further optimization for even better results.";
    } else if (loadTime < 3000) {
      score = 60;
      status = "warning";
      message = `Average load time: ${seconds}s`;
      recommendation =
        "Optimize images, minify CSS/JS, and enable caching to improve load time.";
    } else if (loadTime < 5000) {
      score = 40;
      status = "warning";
      message = `Slow load time: ${seconds}s`;
      recommendation =
        "Page is loading slowly. Optimize images, reduce server response time, and minimize HTTP requests.";
    } else {
      score = 20;
      status = "fail";
      message = `Very slow load time: ${seconds}s`;
      recommendation =
        "Critical: Page load time is too slow. This severely impacts user experience and SEO. Implement caching, CDN, image optimization, and code minification.";
    }

    this.results.checks.pageSpeed = {
      name: "Page Load Speed",
      status: status,
      score: score,
      loadTime: `${seconds}s`,
      message: message,
      recommendation: recommendation,
    };
  }

  /**
   * Check Mobile Responsiveness
   */
  async checkMobileResponsive(page) {
    try {
      // Check viewport meta tag first
      const viewportMeta = await page
        .$eval('meta[name="viewport"]', (el) => el.getAttribute("content"))
        .catch(() => null);

      let score = 0;
      let issues = [];
      let recommendations = [];

      if (viewportMeta) {
        score += 50;
      } else {
        issues.push("Missing viewport meta tag");
        recommendations.push(
          'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> to the <head> section',
        );
      }

      // Test mobile viewport
      await page.setViewport({ width: 375, height: 667 }); // iPhone size
      await page.waitForTimeout(500);

      // Check if content fits without horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return (
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
        );
      });

      if (!hasHorizontalScroll) {
        score += 50;
      } else {
        issues.push("Content extends beyond mobile viewport");
        recommendations.push(
          "Ensure content is responsive and fits mobile screens without horizontal scrolling",
        );
      }

      this.results.checks.mobileResponsive = {
        name: "Mobile Responsiveness",
        status: score >= 70 ? "pass" : score >= 40 ? "warning" : "fail",
        score: score,
        details: {
          hasViewportMeta: !!viewportMeta,
          viewportContent: viewportMeta || "Not set",
          horizontalScroll: hasHorizontalScroll,
        },
        issues: issues,
        recommendation:
          recommendations.join(" | ") || "Website is mobile-friendly!",
      };
    } catch (error) {
      this.results.checks.mobileResponsive = {
        name: "Mobile Responsiveness",
        status: "warning",
        score: 50,
        message: "Could not fully test mobile responsiveness",
        recommendation: "Manually test your website on mobile devices",
      };
    }
  }

  /**
   * Check Social Media Tags (Open Graph, Twitter Cards)
   */
  checkSocialTags($) {
    const ogTitle = $('meta[property="og:title"]').attr("content");
    const ogDescription = $('meta[property="og:description"]').attr("content");
    const ogImage = $('meta[property="og:image"]').attr("content");
    const ogUrl = $('meta[property="og:url"]').attr("content");

    const twitterCard = $('meta[name="twitter:card"]').attr("content");
    const twitterTitle = $('meta[name="twitter:title"]').attr("content");

    let score = 0;
    let recommendations = [];

    if (ogTitle) score += 25;
    else recommendations.push("Add Open Graph title tag");

    if (ogDescription) score += 25;
    else recommendations.push("Add Open Graph description tag");

    if (ogImage) score += 25;
    else recommendations.push("Add Open Graph image tag");

    if (twitterCard) score += 25;
    else recommendations.push("Add Twitter Card tags");

    this.results.checks.socialTags = {
      name: "Social Media Tags",
      status: score >= 70 ? "pass" : score >= 40 ? "warning" : "fail",
      score: score,
      details: {
        openGraph: {
          title: ogTitle || "Not set",
          description: ogDescription || "Not set",
          image: ogImage || "Not set",
          url: ogUrl || "Not set",
        },
        twitter: {
          card: twitterCard || "Not set",
          title: twitterTitle || "Not set",
        },
      },
      recommendation:
        recommendations.join(" | ") ||
        "Social media tags are properly configured!",
    };
  }

  /**
   * Check Content (word count, readability)
   */
  checkContent($) {
    // Remove script and style tags
    $("script, style").remove();

    const bodyText = $("body").text();
    const words = bodyText
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    const wordCount = words.length;

    let score = 0;
    let status = "fail";
    let message = "";
    let recommendation = "";

    if (wordCount >= 300) {
      score = 100;
      status = "pass";
      message = `Good content length: ${wordCount} words`;
      recommendation = "Maintain quality content and update regularly.";
    } else if (wordCount >= 150) {
      score = 60;
      status = "warning";
      message = `Moderate content: ${wordCount} words`;
      recommendation =
        "Consider adding more quality content (aim for 300+ words).";
    } else {
      score = 30;
      status = "fail";
      message = `Low content: ${wordCount} words`;
      recommendation =
        "Add more meaningful content. Pages with 300+ words tend to rank better.";
    }

    this.results.checks.content = {
      name: "Content Quality",
      status: status,
      score: score,
      wordCount: wordCount,
      message: message,
      recommendation: recommendation,
    };
  }

  /**
   * Check Links (Internal and External)
   */
  checkLinks($) {
    const links = $("a[href]");
    let internalLinks = 0;
    let externalLinks = 0;
    let brokenLinks = 0;

    const domain = new URL(this.url).hostname;

    links.each((i, link) => {
      const href = $(link).attr("href");

      if (!href || href === "#" || href.startsWith("javascript:")) {
        return;
      }

      try {
        if (href.startsWith("http")) {
          const linkDomain = new URL(href).hostname;
          if (linkDomain === domain) {
            internalLinks++;
          } else {
            externalLinks++;
          }
        } else {
          internalLinks++;
        }
      } catch (e) {
        // Invalid URL
      }
    });

    let score = 0;
    let recommendations = [];

    if (internalLinks > 0) score += 40;
    else recommendations.push("Add internal links to improve site navigation");

    if (externalLinks > 0) score += 30;

    if (links.length > 0) score += 30;

    this.results.checks.links = {
      name: "Link Structure",
      status: score >= 60 ? "pass" : score >= 30 ? "warning" : "fail",
      score: score,
      details: {
        total: links.length,
        internal: internalLinks,
        external: externalLinks,
      },
      recommendation: recommendations.join(" | ") || "Good link structure!",
    };
  }

  /**
   * Check Robots.txt and Sitemap
   */
  async checkRobotsAndSitemap() {
    const baseUrl = new URL(this.url).origin;

    let robotsExists = false;
    let sitemapExists = false;
    let score = 0;

    // Check robots.txt
    try {
      const robotsResponse = await axios.get(`${baseUrl}/robots.txt`, {
        timeout: 5000,
      });
      if (robotsResponse.status === 200) {
        robotsExists = true;
        score += 50;
      }
    } catch (error) {
      // robots.txt not found
    }

    // Check sitemap.xml
    try {
      const sitemapResponse = await axios.get(`${baseUrl}/sitemap.xml`, {
        timeout: 5000,
      });
      if (sitemapResponse.status === 200) {
        sitemapExists = true;
        score += 50;
      }
    } catch (error) {
      // sitemap.xml not found
    }

    let recommendations = [];
    if (!robotsExists)
      recommendations.push("Create a robots.txt file to guide search engines");
    if (!sitemapExists)
      recommendations.push(
        "Create an XML sitemap to help search engines index your site",
      );

    this.results.checks.robotsAndSitemap = {
      name: "Robots.txt & Sitemap",
      status: score === 100 ? "pass" : score >= 50 ? "warning" : "fail",
      score: score,
      details: {
        robotsTxt: robotsExists ? "Found" : "Not found",
        sitemap: sitemapExists ? "Found" : "Not found",
      },
      recommendation:
        recommendations.join(" | ") ||
        "Both robots.txt and sitemap.xml are present!",
    };
  }

  /**
   * Calculate Overall Score
   */
  calculateOverallScore() {
    const checks = Object.values(this.results.checks);
    const totalScore = checks.reduce(
      (sum, check) => sum + (check.score || 0),
      0,
    );
    const maxScore = checks.length * 100;

    this.results.overallScore = Math.round((totalScore / maxScore) * 100);

    // Determine overall status
    if (this.results.overallScore >= 80) {
      this.results.overallStatus = "Excellent";
      this.results.overallMessage =
        "Your website has excellent SEO! Keep up the good work.";
    } else if (this.results.overallScore >= 60) {
      this.results.overallStatus = "Good";
      this.results.overallMessage =
        "Your website has good SEO with room for improvement.";
    } else if (this.results.overallScore >= 40) {
      this.results.overallStatus = "Needs Improvement";
      this.results.overallMessage =
        "Your website needs SEO improvements to rank better.";
    } else {
      this.results.overallStatus = "Poor";
      this.results.overallMessage =
        "Your website has critical SEO issues that need immediate attention.";
    }
  }
}

module.exports = SEOAuditor;
