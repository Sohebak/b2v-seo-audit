const express = require("express");
const cors = require("cors");
const { body, validationResult } = require("express-validator");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const SEOAuditor = require("./auditEngine");
const HTMLPDFGenerator = require("./htmlPdfGenerator");
const AIReportGenerator = require("./aiReportGenerator");
const EmailService = require("./emailService");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize email service once at startup
const emailService = new EmailService();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration - Allow requests from your WordPress site
app.use(
  cors({
    origin: [
      "https://business2virtual.com",
      "http://business2virtual.com",
      "https://www.business2virtual.com",
      "http://www.business2virtual.com",
      "http://localhost:3000", // For local testing
    ],
    methods: ["POST", "GET"],
    credentials: true,
  }),
);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "SEO Audit API is running",
    version: "1.0.0",
  });
});

// Email configuration test endpoint
app.get("/api/test-email", async (req, res) => {
  const result = await emailService.verifyConnection();
  res.status(result.success ? 200 : 500).json({
    status: result.success ? "success" : "error",
    message: result.message || result.error,
  });
});

// Download PDF report endpoint
app.get("/api/download/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, "reports", filename);

  // Check if file exists
  if (fs.existsSync(filePath)) {
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error("Download error:", err);
        res.status(500).json({
          status: "error",
          message: "Failed to download file",
        });
      }
    });
  } else {
    res.status(404).json({
      status: "error",
      message: "File not found",
    });
  }
});

// Main audit endpoint
app.post(
  "/api/audit",
  // Validation middleware
  [
    body("url")
      .notEmpty()
      .withMessage("URL is required")
      .isURL({
        protocols: ["http", "https"],
        require_protocol: true,
      })
      .withMessage("Please provide a valid URL"),
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail(),
  ],
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: "error",
        errors: errors.array().map((err) => ({
          field: err.path,
          message: err.msg,
        })),
      });
    }

    const { url, email } = req.body;

    try {
      console.log(`New audit request: ${url} from ${email}`);

      // Run SEO audit
      const auditor = new SEOAuditor(url);
      const auditResults = await auditor.runAudit();

      // Enhance with AI insights (if API key is available)
      let finalResults = auditResults;
      const hasGemini =
        process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== "your-gemini-api-key-here";
      const hasClaude =
        process.env.ANTHROPIC_API_KEY &&
        process.env.ANTHROPIC_API_KEY !== "your-anthropic-api-key-here";

      if (hasGemini || hasClaude) {
        const provider = process.env.AI_PROVIDER || "gemini";
        console.log(
          `Enhancing report with AI insights using ${provider.toUpperCase()}...`,
        );
        const aiGenerator = new AIReportGenerator(auditResults);
        finalResults = await aiGenerator.generateEnhancedReport();
      } else {
        console.log("AI enhancement skipped (no API key configured)");
        finalResults.aiEnhanced = false;
      }

      // Generate PDF report
      console.log("Generating PDF report...");
      const pdfGenerator = new HTMLPDFGenerator(finalResults, email);
      const pdfPath = await pdfGenerator.generatePDF();
      console.log(`PDF generated: ${pdfPath}`);

      // Send email with PDF report
      let emailSent = false;
      let emailStatus = "not_configured";

      try {
        console.log(`Sending report to ${email}...`);
        await emailService.sendReport(email, finalResults, pdfPath);
        await emailService.sendInternalNotification(
          email,
          finalResults,
          pdfPath,
        );
        emailSent = true;
        emailStatus = "sent";
        console.log("✅ Emails sent successfully!");
      } catch (err) {
        emailStatus = emailService.isPendingActivation(err)
          ? "pending_activation"
          : "failed";

        if (emailStatus === "pending_activation") {
          console.log(
            "📧 Email queued — Brevo SMTP not yet activated. Report PDF is saved locally.",
          );
        } else {
          console.error("⚠️  Email error (non-critical):", err.message);
        }
      }

      // Return success response
      res.json({
        status: "success",
        message: emailSent
          ? `Audit complete! Report sent to ${email}`
          : emailStatus === "pending_activation"
            ? `Audit complete! PDF generated. Email will send once Brevo SMTP is activated.`
            : `Audit complete! PDF generated (email unavailable).`,
        data: {
          url: url,
          email: email,
          overallScore: finalResults.overallScore,
          overallStatus: finalResults.overallStatus,
          pdfGenerated: true,
          emailSent: emailSent,
          emailStatus: emailStatus,
          aiEnhanced: finalResults.aiEnhanced || false,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error processing audit:", error);
      res.status(500).json({
        status: "error",
        message:
          "An error occurred while processing your request. Please check the URL and try again.",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Endpoint not found",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SEO Audit API server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
