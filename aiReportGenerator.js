const Anthropic = require("@anthropic-ai/sdk");
const { GoogleGenAI } = require("@google/genai");

class AIReportGenerator {
  constructor(auditResults) {
    this.audit = auditResults;
    this.provider = process.env.AI_PROVIDER || "gemini"; // Default to Gemini

    // Initialize AI clients based on provider
    if (this.provider === "gemini" && process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });
    } else if (this.provider === "claude" && process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  }

  /**
   * Generate AI-enhanced report with detailed insights
   */
  async generateEnhancedReport() {
    try {
      console.log(
        `Generating AI-enhanced report using ${this.provider.toUpperCase()}...`,
      );

      // Prepare audit data for AI
      const auditSummary = this.prepareAuditSummary();

      // Generate AI insights based on provider
      const aiInsights = await this.getAIInsights(auditSummary);

      // Merge AI insights with original audit data
      const enhancedReport = {
        ...this.audit,
        aiEnhanced: true,
        aiProvider: this.provider,
        aiInsights: aiInsights,
      };

      console.log("AI-enhanced report generated successfully");
      return enhancedReport;
    } catch (error) {
      console.error("AI Report Generation Error:", error.message);

      // Fallback to original report if AI fails
      return {
        ...this.audit,
        aiEnhanced: false,
        aiError: "AI enhancement unavailable. Showing standard report.",
      };
    }
  }

  /**
   * Prepare audit summary for AI processing
   */
  prepareAuditSummary() {
    const summary = {
      url: this.audit.url,
      overallScore: this.audit.overallScore,
      overallStatus: this.audit.overallStatus,
      checks: {},
    };

    // Extract key information from each check
    Object.entries(this.audit.checks).forEach(([key, check]) => {
      summary.checks[key] = {
        name: check.name,
        status: check.status,
        score: check.score,
        message: check.message,
        recommendation: check.recommendation,
        details: check.details,
        issues: check.issues,
      };
    });

    return summary;
  }

  /**
   * Get AI insights from selected provider
   */
  async getAIInsights(auditSummary) {
    const prompt = `You are an expert SEO consultant analyzing a website audit. Generate a comprehensive, professional SEO report based on the following audit data.

Website: ${auditSummary.url}
Overall SEO Score: ${auditSummary.overallScore}/100
Status: ${auditSummary.overallStatus}

Detailed Audit Results:
${JSON.stringify(auditSummary.checks, null, 2)}

Please provide:

1. EXECUTIVE SUMMARY (2-3 paragraphs)
   - Overall assessment of the website's SEO health
   - Key strengths and critical weaknesses
   - Primary opportunities for improvement

2. DETAILED ANALYSIS (for each failed or warning check)
   - Why this issue matters for SEO and user experience
   - Specific impact on search rankings and conversions
   - Technical explanation in simple terms
   - Industry best practices and benchmarks

3. PRIORITIZED ACTION PLAN
   - Quick wins (can be fixed in hours/days)
   - Medium-term improvements (1-2 weeks)
   - Long-term strategic initiatives (1+ months)
   - For each item: specific steps, expected impact, and difficulty level

4. INDUSTRY INSIGHTS
   - How this site compares to industry standards
   - Competitive advantages to leverage
   - Common pitfalls to avoid in this industry

5. CONTENT RECOMMENDATIONS
   - Specific suggestions for meta titles and descriptions
   - Content optimization opportunities
   - Keyword strategy insights

Format your response as JSON with this structure:
{
  "executiveSummary": "...",
  "detailedAnalysis": [
    {
      "checkName": "...",
      "importance": "...",
      "impact": "...",
      "explanation": "...",
      "bestPractices": "..."
    }
  ],
  "actionPlan": {
    "quickWins": ["..."],
    "mediumTerm": ["..."],
    "longTerm": ["..."]
  },
  "industryInsights": "...",
  "contentRecommendations": {
    "metaTitle": "...",
    "metaDescription": "...",
    "contentStrategy": "..."
  }
}

Be specific, actionable, and professional. Avoid generic advice.`;

    if (this.provider === "gemini" && this.genAI) {
      return await this.getGeminiInsights(prompt);
    } else if (this.provider === "claude" && this.anthropic) {
      return await this.getClaudeInsights(prompt);
    } else {
      throw new Error("No AI provider configured");
    }
  }

  /**
   * Get insights from Google Gemini
   */
  async getGeminiInsights(prompt) {
    try {
      const response = await this.genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const responseText = response.text;

      // Try to parse as JSON
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }

        // If not JSON, return as formatted text
        return {
          executiveSummary: responseText,
          detailedAnalysis: [],
          actionPlan: { quickWins: [], mediumTerm: [], longTerm: [] },
          industryInsights: "",
          contentRecommendations: {},
        };
      } catch (parseError) {
        console.error("Error parsing Gemini response:", parseError);
        return {
          executiveSummary: responseText,
          detailedAnalysis: [],
          actionPlan: { quickWins: [], mediumTerm: [], longTerm: [] },
          industryInsights: "",
          contentRecommendations: {},
        };
      }
    } catch (error) {
      console.error("Gemini API error:", error.message);
      throw error;
    }
  }

  /**
   * Get insights from Claude AI
   */
  async getClaudeInsights(prompt) {
    try {
      const message = await this.anthropic.messages.create({
        model: "claude-3-5-haiku-20241022", // Free tier - Haiku model
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      // Parse AI response
      const responseText = message.content[0].text;

      try {
        // Try to parse as JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }

        // If not JSON, return as formatted text
        return {
          executiveSummary: responseText,
          detailedAnalysis: [],
          actionPlan: { quickWins: [], mediumTerm: [], longTerm: [] },
          industryInsights: "",
          contentRecommendations: {},
        };
      } catch (parseError) {
        console.error("Error parsing Claude response:", parseError);
        return {
          executiveSummary: responseText,
          detailedAnalysis: [],
          actionPlan: { quickWins: [], mediumTerm: [], longTerm: [] },
          industryInsights: "",
          contentRecommendations: {},
        };
      }
    } catch (error) {
      console.error("Claude API error:", error);
      throw error;
    }
  }

  /**
   * Generate AI insights for a specific check (alternative approach)
   */
  async generateCheckInsight(checkName, checkData) {
    try {
      const prompt = `As an SEO expert, provide detailed insights about this SEO check:

Check: ${checkName}
Status: ${checkData.status}
Score: ${checkData.score}/100
Current Finding: ${checkData.message || checkData.recommendation}

Provide:
1. Why this matters (2-3 sentences)
2. Specific impact on SEO and user experience
3. Step-by-step fix instructions
4. Expected improvement after fixing

Keep it concise, actionable, and professional.`;

      const message = await this.anthropic.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      });

      return message.content[0].text;
    } catch (error) {
      console.error(`Error generating insight for ${checkName}:`, error);
      return null;
    }
  }
}

module.exports = AIReportGenerator;
