const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const Handlebars = require("handlebars");
const chromium = require("@sparticuz/chromium");

class HTMLPDFGenerator {
  constructor(auditResults, recipientEmail) {
    this.audit = auditResults;
    this.email = recipientEmail;
  }

  /**
   * Generate PDF from HTML template
   */
  async generatePDF() {
    try {
      console.log("Generating PDF from HTML template...");

      // Use /tmp on production (Render ephemeral FS), local reports/ in dev
      const reportsDir =
        process.env.NODE_ENV === "production"
          ? "/tmp/reports"
          : path.join(__dirname, "reports");

      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedUrl = this.audit.url.replace(/[^a-z0-9]/gi, "_");
      const filename = `SEO_Report_${sanitizedUrl}_${timestamp}.pdf`;
      const filepath = path.join(reportsDir, filename);

      // Prepare template data
      const templateData = this.prepareTemplateData();

      // Load and compile template
      const templatePath = path.join(
        __dirname,
        "templates",
        "report-template.html",
      );
      const templateSource = fs.readFileSync(templatePath, "utf8");

      // Register Handlebars helpers
      this.registerHandlebarsHelpers();

      const template = Handlebars.compile(templateSource);
      const html = template(templateData);

      // Generate PDF using Puppeteer 
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });

      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      // Wait for fonts/styles to settle
      await page.waitForTimeout(1500).catch(() => {});

      await page.pdf({
        path: filepath,
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        },
      });

      await browser.close();

      console.log(`PDF generated successfully: ${filename}`);
      return filepath;
    } catch (error) {
      console.error("PDF generation error:", error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  /**
   * Register Handlebars helpers
   */
  registerHandlebarsHelpers() {
    // Helper for conditional rendering
    Handlebars.registerHelper("if", function (conditional, options) {
      if (conditional) {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    // Helper for each loop
    Handlebars.registerHelper("each", function (context, options) {
      let ret = "";
      if (context && context.length > 0) {
        for (let i = 0; i < context.length; i++) {
          ret = ret + options.fn(context[i]);
        }
      }
      return ret;
    });
  }

  /**
   * Prepare data for template
   */
  prepareTemplateData() {
    const score = this.audit.overallScore;

    // Determine score color class
    let scoreStrokeClass = "stroke-red";
    if (score >= 80) scoreStrokeClass = "stroke-green";
    else if (score >= 60) scoreStrokeClass = "stroke-orange";

    // Format date
    const date = new Date(this.audit.timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Count test results
    const checks = Object.values(this.audit.checks);
    const passedCount = checks.filter((c) => c.status === "pass").length;
    const warningCount = checks.filter((c) => c.status === "warning").length;
    const failedCount = checks.filter((c) => c.status === "fail").length;

    // Prepare data
    const data = {
      url: this.audit.url,
      date: date,
      overallScore: score,
      overallStatus: this.audit.overallStatus,
      scoreStrokeClass: scoreStrokeClass,
      scoreDashArray: score,

      // Test counts
      passedCount: passedCount,
      warningCount: warningCount,
      failedCount: failedCount,

      // All checks for detailed page
      allChecks: this.prepareAllChecks(),

      // AI Insights
      executiveSummary: this.getExecutiveSummary(),
      detailedAnalysis: this.getDetailedAnalysis(),
      hasDetailedAnalysis: this.hasDetailedAnalysis(),

      // Action Plan
      quickWins: this.getActionItems("quickWins"),
      mediumTerm: this.getActionItems("mediumTerm"),
      longTerm: this.getActionItems("longTerm"),

      // Industry & Content
      industryInsights: this.getIndustryInsights(),
      metaTitle: this.getContentRecommendation("metaTitle"),
      metaDescription: this.getContentRecommendation("metaDescription"),
      contentStrategy: this.getContentRecommendation("contentStrategy"),

      // Technical Metrics
      metrics: this.prepareMetrics(),
    };

    return data;
  }

  /**
   * Get executive summary
   */
  getExecutiveSummary() {
    if (this.audit.aiInsights && this.audit.aiInsights.executiveSummary) {
      return this.audit.aiInsights.executiveSummary;
    }
    return this.audit.overallMessage || "SEO audit completed successfully.";
  }

  /**
   * Get detailed analysis
   */
  getDetailedAnalysis() {
    if (!this.audit.aiInsights || !this.audit.aiInsights.detailedAnalysis) {
      return [];
    }

    return this.audit.aiInsights.detailedAnalysis.slice(0, 3).map((item) => {
      // Determine priority badge
      let priority = "Medium";
      let badgeClass = "badge-medium";

      if (
        item.importance &&
        item.importance.toLowerCase().includes("critical")
      ) {
        priority = "Critical";
        badgeClass = "badge-critical";
      } else if (
        item.importance &&
        item.importance.toLowerCase().includes("high")
      ) {
        priority = "High";
        badgeClass = "badge-high";
      }

      return {
        checkName: item.checkName || "",
        priority: priority,
        badgeClass: badgeClass,
        explanation: item.explanation || item.impact || "",
      };
    });
  }

  /**
   * Check if has detailed analysis
   */
  hasDetailedAnalysis() {
    return (
      this.audit.aiInsights &&
      this.audit.aiInsights.detailedAnalysis &&
      this.audit.aiInsights.detailedAnalysis.length > 0
    );
  }

  /**
   * Get action items
   */
  getActionItems(type) {
    if (
      this.audit.aiInsights &&
      this.audit.aiInsights.actionPlan &&
      this.audit.aiInsights.actionPlan[type]
    ) {
      return this.audit.aiInsights.actionPlan[type];
    }

    // Default items if AI not available
    const defaults = {
      quickWins: [
        "Add missing meta descriptions to all pages",
        "Optimize images with proper alt text",
        "Fix any broken internal links",
      ],
      mediumTerm: [
        "Improve page load speed through optimization",
        "Enhance mobile responsiveness",
        "Create XML sitemap if missing",
      ],
      longTerm: [
        "Develop comprehensive content strategy",
        "Build quality backlink profile",
        "Implement structured data markup",
      ],
    };

    return defaults[type] || [];
  }

  /**
   * Get industry insights
   */
  getIndustryInsights() {
    if (this.audit.aiInsights && this.audit.aiInsights.industryInsights) {
      return this.audit.aiInsights.industryInsights;
    }
    return "Based on current SEO best practices, focus on technical optimization, quality content, and user experience to improve search rankings.";
  }

  /**
   * Get content recommendation
   */
  getContentRecommendation(type) {
    if (
      this.audit.aiInsights &&
      this.audit.aiInsights.contentRecommendations &&
      this.audit.aiInsights.contentRecommendations[type]
    ) {
      return this.audit.aiInsights.contentRecommendations[type];
    }

    // Defaults
    const defaults = {
      metaTitle: "Optimize your page title (50-60 characters)",
      metaDescription:
        "Create compelling meta description (120-160 characters)",
      contentStrategy:
        "Focus on user intent and provide valuable, well-structured content",
    };

    return defaults[type] || "";
  }

  /**
   * Prepare all checks for detailed page
   */
  prepareAllChecks() {
    const allChecks = [];
    const checks = this.audit.checks;

    Object.entries(checks).forEach(([key, check]) => {
      let icon = "✓";
      let iconClass = "icon-pass";

      if (check.status === "warning") {
        icon = "!";
        iconClass = "icon-warn";
      } else if (check.status === "fail") {
        icon = "✗";
        iconClass = "icon-fail";
      }

      allChecks.push({
        name: check.name,
        score: check.score || 0,
        icon: icon,
        iconClass: iconClass,
        message: check.message || check.recommendation || "Check completed",
      });
    });

    return allChecks;
  }

  /**
   * Prepare metrics for page 3
   */
  prepareMetrics() {
    const metrics = [];
    const checks = this.audit.checks;

    // SSL
    if (checks.ssl) {
      metrics.push({
        name: "SSL Security",
        description: checks.ssl.message || checks.ssl.recommendation,
        score: checks.ssl.score,
        barClass: this.getBarClass(checks.ssl.score),
        textClass: this.getTextClass(checks.ssl.score),
      });
    }

    // Page Speed
    if (checks.pageSpeed) {
      metrics.push({
        name: "Page Performance",
        description:
          checks.pageSpeed.message || checks.pageSpeed.recommendation,
        score: checks.pageSpeed.score,
        barClass: this.getBarClass(checks.pageSpeed.score),
        textClass: this.getTextClass(checks.pageSpeed.score),
      });
    }

    // Meta Tags
    if (checks.metaTags) {
      metrics.push({
        name: "Meta Tags",
        description: checks.metaTags.recommendation || checks.metaTags.message,
        score: checks.metaTags.score,
        barClass: this.getBarClass(checks.metaTags.score),
        textClass: this.getTextClass(checks.metaTags.score),
      });
    }

    // Headings
    if (checks.headings) {
      const h1 = checks.headings.details?.h1 || 0;
      const h2 = checks.headings.details?.h2 || 0;
      metrics.push({
        name: "Heading Structure",
        description: `${h1} H1, ${h2} H2s`,
        score: checks.headings.score,
        barClass: this.getBarClass(checks.headings.score),
        textClass: this.getTextClass(checks.headings.score),
      });
    }

    // Content
    if (checks.content) {
      metrics.push({
        name: "Content Quality",
        description: `${checks.content.wordCount || 0} words found`,
        score: checks.content.score,
        barClass: this.getBarClass(checks.content.score),
        textClass: this.getTextClass(checks.content.score),
      });
    }

    // Mobile
    if (checks.mobileResponsive) {
      metrics.push({
        name: "Mobile Friendliness",
        description:
          checks.mobileResponsive.recommendation ||
          checks.mobileResponsive.message,
        score: checks.mobileResponsive.score,
        barClass: this.getBarClass(checks.mobileResponsive.score),
        textClass: this.getTextClass(checks.mobileResponsive.score),
      });
    }

    // Social Tags
    if (checks.socialTags) {
      metrics.push({
        name: "Social Metadata",
        description:
          checks.socialTags.recommendation || checks.socialTags.message,
        score: checks.socialTags.score,
        barClass: this.getBarClass(checks.socialTags.score),
        textClass: this.getTextClass(checks.socialTags.score),
      });
    }

    return metrics;
  }

  /**
   * Get CSS class for progress bar
   */
  getBarClass(score) {
    if (score >= 70) return "bg-green";
    if (score >= 40) return "bg-orange";
    return "bg-red";
  }

  /**
   * Get CSS class for text
   */
  getTextClass(score) {
    if (score >= 70) return "text-green";
    if (score >= 40) return "text-orange";
    return "text-red";
  }
}

module.exports = HTMLPDFGenerator;
