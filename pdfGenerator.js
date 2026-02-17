const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

class PDFReportGenerator {
  constructor(auditResults, recipientEmail) {
    this.audit = auditResults;
    this.email = recipientEmail;
    this.doc = null;
    this.currentY = 0;

    // Colors
    this.colors = {
      primary: "#2563eb", // Blue
      success: "#16a34a", // Green
      warning: "#ea580c", // Orange
      danger: "#dc2626", // Red
      text: "#1f2937", // Dark gray
      lightGray: "#f3f4f6",
      mediumGray: "#9ca3af",
      darkGray: "#4b5563",
    };
  }

  /**
   * Generate PDF and return the file path
   */
  async generatePDF() {
    return new Promise((resolve, reject) => {
      try {
        // Create reports directory if it doesn't exist
        const reportsDir = path.join(__dirname, "reports");
        if (!fs.existsSync(reportsDir)) {
          fs.mkdirSync(reportsDir, { recursive: true });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedUrl = this.audit.url.replace(/[^a-z0-9]/gi, "_");
        const filename = `SEO_Report_${sanitizedUrl}_${timestamp}.pdf`;
        const filepath = path.join(reportsDir, filename);

        // Create PDF document
        this.doc = new PDFDocument({
          size: "A4",
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        // Pipe to file
        const stream = fs.createWriteStream(filepath);
        this.doc.pipe(stream);

        // Generate report content
        this.addCoverPage();
        this.addOverviewSection();

        // Add AI insights if available
        if (this.audit.aiEnhanced && this.audit.aiInsights) {
          this.addAIInsightsSection();
        }

        this.addDetailedChecks();
        this.addRecommendations();
        this.addFooter();

        // Finalize PDF
        this.doc.end();

        stream.on("finish", () => {
          console.log(`PDF report generated: ${filename}`);
          resolve(filepath);
        });

        stream.on("error", (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add cover page
   */
  addCoverPage() {
    const centerX = this.doc.page.width / 2;

    // Header background
    this.doc.rect(0, 0, this.doc.page.width, 250).fill(this.colors.primary);

    // Company name
    this.doc
      .fontSize(32)
      .fillColor("#ffffff")
      .text("Business2Virtual", centerX - 150, 80, {
        width: 300,
        align: "center",
      });

    // Report title
    this.doc
      .fontSize(24)
      .fillColor("#ffffff")
      .text("SEO Audit Report", centerX - 150, 140, {
        width: 300,
        align: "center",
      });

    // AI-Enhanced badge
    if (this.audit.aiEnhanced) {
      this.doc
        .fontSize(12)
        .fillColor("#fbbf24")
        .text("🤖 AI-Enhanced Analysis", centerX - 100, 175, {
          width: 200,
          align: "center",
        });
    }

    // Website URL
    this.doc
      .fontSize(14)
      .fillColor("#e0e7ff")
      .text(this.audit.url, centerX - 200, 200, {
        width: 400,
        align: "center",
      });

    // Date
    const reportDate = new Date(this.audit.timestamp).toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      },
    );

    this.doc
      .fontSize(12)
      .fillColor("#c7d2fe")
      .text(`Generated on ${reportDate}`, centerX - 150, 220, {
        width: 300,
        align: "center",
      });

    // Overall score circle
    const scoreY = 320;
    const circleRadius = 80;

    // Circle background
    this.doc
      .circle(centerX, scoreY, circleRadius)
      .fillAndStroke(this.getScoreColor(this.audit.overallScore), "#ffffff");

    // Score text
    this.doc
      .fontSize(48)
      .fillColor("#ffffff")
      .text(this.audit.overallScore.toString(), centerX - 50, scoreY - 25, {
        width: 100,
        align: "center",
      });

    this.doc
      .fontSize(16)
      .fillColor("#ffffff")
      .text("/ 100", centerX - 50, scoreY + 20, {
        width: 100,
        align: "center",
      });

    // Status text
    this.doc
      .fontSize(20)
      .fillColor(this.colors.text)
      .text(this.audit.overallStatus, centerX - 100, scoreY + 100, {
        width: 200,
        align: "center",
      });

    // Add new page for content
    this.doc.addPage();
  }

  /**
   * Add AI-generated insights section
   */
  addAIInsightsSection() {
    if (this.currentY > 650) {
      this.doc.addPage();
      this.currentY = 50;
    }

    this.currentY += 20;
    this.addSectionTitle("🤖 AI-Powered Expert Analysis");

    const insights = this.audit.aiInsights;

    // Executive Summary
    if (insights.executiveSummary) {
      this.doc
        .fontSize(14)
        .fillColor(this.colors.primary)
        .text("Executive Summary", 50, this.currentY);

      this.currentY += 25;

      this.doc
        .fontSize(11)
        .fillColor(this.colors.text)
        .text(insights.executiveSummary, 50, this.currentY, {
          width: 495,
          align: "left",
          lineGap: 5,
        });

      this.currentY +=
        this.doc.heightOfString(insights.executiveSummary, {
          width: 495,
          lineGap: 5,
        }) + 25;
    }

    // Check if we need new page
    if (this.currentY > 600) {
      this.doc.addPage();
      this.currentY = 50;
    }

    // Action Plan
    if (insights.actionPlan) {
      this.doc
        .fontSize(14)
        .fillColor(this.colors.primary)
        .text("Prioritized Action Plan", 50, this.currentY);

      this.currentY += 25;

      // Quick Wins
      if (
        insights.actionPlan.quickWins &&
        insights.actionPlan.quickWins.length > 0
      ) {
        this.doc
          .fontSize(12)
          .fillColor(this.colors.success)
          .text("⚡ Quick Wins (High Impact, Low Effort)", 50, this.currentY);

        this.currentY += 20;

        insights.actionPlan.quickWins.forEach((item, index) => {
          this.doc
            .fontSize(10)
            .fillColor(this.colors.text)
            .text(`${index + 1}. ${item}`, 60, this.currentY, {
              width: 485,
              lineGap: 3,
            });

          this.currentY +=
            this.doc.heightOfString(`${index + 1}. ${item}`, {
              width: 485,
              lineGap: 3,
            }) + 10;

          // Check for page break
          if (this.currentY > 700) {
            this.doc.addPage();
            this.currentY = 50;
          }
        });

        this.currentY += 15;
      }

      // Medium Term
      if (
        insights.actionPlan.mediumTerm &&
        insights.actionPlan.mediumTerm.length > 0
      ) {
        if (this.currentY > 650) {
          this.doc.addPage();
          this.currentY = 50;
        }

        this.doc
          .fontSize(12)
          .fillColor(this.colors.warning)
          .text("📊 Medium-Term Improvements", 50, this.currentY);

        this.currentY += 20;

        insights.actionPlan.mediumTerm.forEach((item, index) => {
          this.doc
            .fontSize(10)
            .fillColor(this.colors.text)
            .text(`${index + 1}. ${item}`, 60, this.currentY, {
              width: 485,
              lineGap: 3,
            });

          this.currentY +=
            this.doc.heightOfString(`${index + 1}. ${item}`, {
              width: 485,
              lineGap: 3,
            }) + 10;

          if (this.currentY > 700) {
            this.doc.addPage();
            this.currentY = 50;
          }
        });

        this.currentY += 15;
      }

      // Long Term
      if (
        insights.actionPlan.longTerm &&
        insights.actionPlan.longTerm.length > 0
      ) {
        if (this.currentY > 650) {
          this.doc.addPage();
          this.currentY = 50;
        }

        this.doc
          .fontSize(12)
          .fillColor(this.colors.primary)
          .text("🎯 Long-Term Strategic Initiatives", 50, this.currentY);

        this.currentY += 20;

        insights.actionPlan.longTerm.forEach((item, index) => {
          this.doc
            .fontSize(10)
            .fillColor(this.colors.text)
            .text(`${index + 1}. ${item}`, 60, this.currentY, {
              width: 485,
              lineGap: 3,
            });

          this.currentY +=
            this.doc.heightOfString(`${index + 1}. ${item}`, {
              width: 485,
              lineGap: 3,
            }) + 10;

          if (this.currentY > 700) {
            this.doc.addPage();
            this.currentY = 50;
          }
        });
      }
    }

    // Industry Insights
    if (insights.industryInsights) {
      if (this.currentY > 600) {
        this.doc.addPage();
        this.currentY = 50;
      }

      this.currentY += 20;

      this.doc
        .fontSize(14)
        .fillColor(this.colors.primary)
        .text("Industry Insights", 50, this.currentY);

      this.currentY += 25;

      this.doc
        .fontSize(11)
        .fillColor(this.colors.text)
        .text(insights.industryInsights, 50, this.currentY, {
          width: 495,
          align: "left",
          lineGap: 5,
        });

      this.currentY +=
        this.doc.heightOfString(insights.industryInsights, {
          width: 495,
          lineGap: 5,
        }) + 25;
    }

    // Content Recommendations
    if (insights.contentRecommendations) {
      if (this.currentY > 600) {
        this.doc.addPage();
        this.currentY = 50;
      }

      this.currentY += 20;

      this.doc
        .fontSize(14)
        .fillColor(this.colors.primary)
        .text("Content Optimization Recommendations", 50, this.currentY);

      this.currentY += 25;

      if (insights.contentRecommendations.metaTitle) {
        this.doc
          .fontSize(11)
          .fillColor(this.colors.darkGray)
          .text("Suggested Meta Title:", 50, this.currentY);

        this.currentY += 18;

        this.doc
          .fontSize(10)
          .fillColor(this.colors.text)
          .text(insights.contentRecommendations.metaTitle, 60, this.currentY, {
            width: 485,
            lineGap: 3,
          });

        this.currentY +=
          this.doc.heightOfString(insights.contentRecommendations.metaTitle, {
            width: 485,
          }) + 15;
      }

      if (insights.contentRecommendations.metaDescription) {
        this.doc
          .fontSize(11)
          .fillColor(this.colors.darkGray)
          .text("Suggested Meta Description:", 50, this.currentY);

        this.currentY += 18;

        this.doc
          .fontSize(10)
          .fillColor(this.colors.text)
          .text(
            insights.contentRecommendations.metaDescription,
            60,
            this.currentY,
            {
              width: 485,
              lineGap: 3,
            },
          );

        this.currentY +=
          this.doc.heightOfString(
            insights.contentRecommendations.metaDescription,
            { width: 485 },
          ) + 15;
      }

      if (insights.contentRecommendations.contentStrategy) {
        this.doc
          .fontSize(11)
          .fillColor(this.colors.darkGray)
          .text("Content Strategy:", 50, this.currentY);

        this.currentY += 18;

        this.doc
          .fontSize(10)
          .fillColor(this.colors.text)
          .text(
            insights.contentRecommendations.contentStrategy,
            60,
            this.currentY,
            {
              width: 485,
              lineGap: 3,
            },
          );

        this.currentY +=
          this.doc.heightOfString(
            insights.contentRecommendations.contentStrategy,
            { width: 485 },
          ) + 20;
      }
    }
  }

  /**
   * Add overview section
   */
  addOverviewSection() {
    this.currentY = 50;

    // Section title
    this.addSectionTitle("Executive Summary");

    // Overall message
    this.doc
      .fontSize(12)
      .fillColor(this.colors.text)
      .text(this.audit.overallMessage, 50, this.currentY, {
        width: 495,
        align: "left",
        lineGap: 5,
      });

    this.currentY += 60;

    // Score breakdown
    this.addSectionTitle("Score Breakdown");

    const checks = Object.values(this.audit.checks);
    const passCount = checks.filter((c) => c.status === "pass").length;
    const warningCount = checks.filter((c) => c.status === "warning").length;
    const failCount = checks.filter((c) => c.status === "fail").length;

    this.currentY += 10;

    // Stats boxes
    this.addStatBox("Passed", passCount, this.colors.success, 50);
    this.addStatBox("Warnings", warningCount, this.colors.warning, 215);
    this.addStatBox("Failed", failCount, this.colors.danger, 380);

    this.currentY += 80;
  }

  /**
   * Add detailed checks section
   */
  addDetailedChecks() {
    this.currentY += 20;

    if (this.currentY > 650) {
      this.doc.addPage();
      this.currentY = 50;
    }

    this.addSectionTitle("Detailed Analysis");

    Object.entries(this.audit.checks).forEach(([key, check], index) => {
      // Check if we need a new page
      if (this.currentY > 650) {
        this.doc.addPage();
        this.currentY = 50;
      }

      this.addCheckItem(check);
    });
  }

  /**
   * Add recommendations section
   */
  addRecommendations() {
    this.doc.addPage();
    this.currentY = 50;

    this.addSectionTitle("Priority Recommendations");

    const failedChecks = Object.values(this.audit.checks)
      .filter((c) => c.status === "fail")
      .slice(0, 5);

    const warningChecks = Object.values(this.audit.checks)
      .filter((c) => c.status === "warning")
      .slice(0, 3);

    if (failedChecks.length > 0) {
      this.doc
        .fontSize(14)
        .fillColor(this.colors.danger)
        .text("Critical Issues:", 50, this.currentY);

      this.currentY += 25;

      failedChecks.forEach((check, index) => {
        this.addRecommendationItem(index + 1, check.name, check.recommendation);
      });
    }

    if (warningChecks.length > 0) {
      this.currentY += 20;

      this.doc
        .fontSize(14)
        .fillColor(this.colors.warning)
        .text("Improvement Opportunities:", 50, this.currentY);

      this.currentY += 25;

      warningChecks.forEach((check, index) => {
        this.addRecommendationItem(
          failedChecks.length + index + 1,
          check.name,
          check.recommendation,
        );
      });
    }

    if (failedChecks.length === 0 && warningChecks.length === 0) {
      this.doc
        .fontSize(12)
        .fillColor(this.colors.success)
        .text(
          "Excellent! Your website has passed all major SEO checks. Keep monitoring and maintaining your SEO performance.",
          50,
          this.currentY,
          {
            width: 495,
          },
        );
    }
  }

  /**
   * Add footer to last page
   */
  addFooter() {
    const pageCount = this.doc.bufferedPageRange().count;
    const startPage = this.doc.bufferedPageRange().start;

    for (let i = 0; i < pageCount; i++) {
      this.doc.switchToPage(startPage + i);

      // Footer line
      this.doc
        .moveTo(50, this.doc.page.height - 50)
        .lineTo(this.doc.page.width - 50, this.doc.page.height - 50)
        .strokeColor(this.colors.lightGray)
        .stroke();

      // Footer text
      this.doc
        .fontSize(10)
        .fillColor(this.colors.mediumGray)
        .text(
          "Generated by Business2Virtual | https://business2virtual.com",
          50,
          this.doc.page.height - 40,
          { align: "center", width: this.doc.page.width - 100 },
        );

      // Page number
      this.doc
        .fontSize(10)
        .fillColor(this.colors.mediumGray)
        .text(
          `Page ${i + 1} of ${pageCount}`,
          this.doc.page.width - 100,
          this.doc.page.height - 40,
          { width: 50, align: "right" },
        );
    }
  }

  /**
   * Helper: Add section title
   */
  addSectionTitle(title) {
    this.doc
      .fontSize(18)
      .fillColor(this.colors.primary)
      .text(title, 50, this.currentY);

    this.currentY += 30;
  }

  /**
   * Helper: Add stat box
   */
  addStatBox(label, value, color, x) {
    // Box
    this.doc.rect(x, this.currentY, 150, 60).fillAndStroke(color, color);

    // Value
    this.doc
      .fontSize(28)
      .fillColor("#ffffff")
      .text(value.toString(), x, this.currentY + 10, {
        width: 150,
        align: "center",
      });

    // Label
    this.doc
      .fontSize(12)
      .fillColor("#ffffff")
      .text(label, x, this.currentY + 42, {
        width: 150,
        align: "center",
      });
  }

  /**
   * Helper: Add check item
   */
  addCheckItem(check) {
    const statusColor =
      check.status === "pass"
        ? this.colors.success
        : check.status === "warning"
          ? this.colors.warning
          : this.colors.danger;

    const statusIcon =
      check.status === "pass" ? "✓" : check.status === "warning" ? "!" : "✗";

    // Status indicator
    this.doc.circle(60, this.currentY + 8, 8).fill(statusColor);

    this.doc
      .fontSize(12)
      .fillColor("#ffffff")
      .text(statusIcon, 56, this.currentY + 3);

    // Check name and score
    this.doc
      .fontSize(14)
      .fillColor(this.colors.text)
      .text(check.name, 80, this.currentY);

    this.doc
      .fontSize(12)
      .fillColor(statusColor)
      .text(`${check.score}/100`, this.doc.page.width - 100, this.currentY);

    this.currentY += 25;

    // Message or recommendation
    const displayText = check.message || check.recommendation || "";

    if (displayText) {
      this.doc
        .fontSize(10)
        .fillColor(this.colors.darkGray)
        .text(displayText, 80, this.currentY, {
          width: 450,
          lineGap: 3,
        });

      this.currentY +=
        this.doc.heightOfString(displayText, { width: 450 }) + 20;
    } else {
      this.currentY += 15;
    }
  }

  /**
   * Helper: Add recommendation item
   */
  addRecommendationItem(number, title, recommendation) {
    // Number badge
    this.doc.circle(60, this.currentY + 8, 12).fill(this.colors.primary);

    this.doc
      .fontSize(10)
      .fillColor("#ffffff")
      .text(number.toString(), 54, this.currentY + 3);

    // Title
    this.doc
      .fontSize(12)
      .fillColor(this.colors.text)
      .text(title, 85, this.currentY);

    this.currentY += 20;

    // Recommendation
    this.doc
      .fontSize(10)
      .fillColor(this.colors.darkGray)
      .text(recommendation, 85, this.currentY, {
        width: 460,
        lineGap: 3,
      });

    this.currentY +=
      this.doc.heightOfString(recommendation, { width: 460 }) + 20;
  }

  /**
   * Helper: Get color based on score
   */
  getScoreColor(score) {
    if (score >= 80) return this.colors.success;
    if (score >= 60) return this.colors.primary;
    if (score >= 40) return this.colors.warning;
    return this.colors.danger;
  }
}

module.exports = PDFReportGenerator;
