/**
 * Quick test script to verify the SEO audit engine works
 * Run: node test-audit.js
 */

const SEOAuditor = require("./auditEngine");

async function testAudit() {
  console.log("🧪 Testing SEO Audit Engine...\n");

  // Test URL - you can change this to any website
  const testUrl = "https://example.com";

  console.log(`📊 Auditing: ${testUrl}\n`);
  console.log("⏳ This may take 10-30 seconds...\n");

  try {
    const auditor = new SEOAuditor(testUrl);
    const results = await auditor.runAudit();

    console.log("✅ Audit Complete!\n");
    console.log("=".repeat(60));
    console.log(`Overall Score: ${results.overallScore}/100`);
    console.log(`Status: ${results.overallStatus}`);
    console.log(`Message: ${results.overallMessage}`);
    console.log("=".repeat(60));
    console.log("\nDetailed Results:\n");

    // Display each check
    Object.entries(results.checks).forEach(([key, check]) => {
      const statusIcon =
        check.status === "pass"
          ? "✅"
          : check.status === "warning"
            ? "⚠️"
            : "❌";
      console.log(
        `${statusIcon} ${check.name}: ${check.score}/100 (${check.status})`,
      );

      if (check.message) {
        console.log(`   → ${check.message}`);
      }

      if (check.recommendation) {
        console.log(`   💡 ${check.recommendation}`);
      }

      console.log("");
    });

    console.log("\n✨ Test completed successfully!");
    console.log(
      "\nYou can now test via Postman or integrate with your WordPress form.",
    );
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("\nTroubleshooting:");
    console.error("1. Make sure all dependencies are installed: npm install");
    console.error("2. Check if the URL is accessible");
    console.error("3. Ensure you have internet connection");
  }
}

// Run the test
testAudit();
