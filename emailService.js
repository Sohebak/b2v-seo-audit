const axios = require("axios");
const fs = require("fs");

class EmailService {
  constructor() {
    this.fromEmail = "info@business2virtual.com";
    this.fromName = process.env.EMAIL_FROM_NAME || "Business2Virtual SEO Audit";
    this.apiKey = process.env.BREVO_API_KEY;
    this.initialized = !!this.apiKey;

    if (this.initialized) {
      console.log(`✅ Email ready — Brevo API, from: ${this.fromEmail}`);
    } else {
      console.warn("⚠️  BREVO_API_KEY not set. Email sending disabled.");
    }
  }

  // ─── Test connection ───────────────────────────────────────────────────────
  async verifyConnection() {
    if (!this.initialized) {
      return { success: false, error: "BREVO_API_KEY not set in .env" };
    }
    try {
      // Hit the Brevo account endpoint to verify the key works
      const res = await axios.get("https://api.brevo.com/v3/account", {
        headers: { "api-key": this.apiKey },
      });
      return {
        success: true,
        message: `Connected! Brevo account: ${res.data.email} — sending from: ${this.fromEmail}`,
      };
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      return { success: false, error: `Brevo API error: ${msg}` };
    }
  }

  // ─── Detect SMTP-not-yet-activated error ──────────────────────────────────
  isPendingActivation(err) {
    return err?.message?.toLowerCase().includes("smtp is not yet activated");
  }

  // ─── Send report to client ────────────────────────────────────────────────
  async sendReport(recipientEmail, auditResults, pdfPath) {
    if (!this.initialized)
      throw new Error(
        "Email service not configured. Set BREVO_API_KEY in .env",
      );

    const { url, overallScore: score, overallStatus: status } = auditResults;

    // Read PDF and encode as base64 attachment
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfBase64 = pdfBuffer.toString("base64");
    const filename = `SEO_Report_${this._hostname(url)}.pdf`;

    await this._sendViaAPI({
      to: [{ email: recipientEmail }],
      subject: `Your SEO Audit Report is Ready – Score: ${score}/100`,
      htmlContent: this._clientTemplate(url, score, status, auditResults),
      textContent: this._clientTextVersion(url, score, status, auditResults),
      attachment: [{ name: filename, content: pdfBase64 }],
    });

    console.log(`✅ Report emailed to ${recipientEmail}`);
    return { success: true };
  }

  // ─── Send internal lead notification ──────────────────────────────────────
  async sendInternalNotification(clientEmail, auditResults, pdfPath) {
    if (!this.initialized) return;

    const { url, overallScore: score } = auditResults;

    try {
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfBase64 = pdfBuffer.toString("base64");
      const filename = `SEO_Report_${this._hostname(url)}.pdf`;

      await this._sendViaAPI({
        to: [{ email: this.fromEmail }],
        subject: `🔔 New Audit Lead — ${this._hostname(url)} (Score: ${score}/100)`,
        htmlContent: this._internalTemplate(
          clientEmail,
          url,
          score,
          auditResults,
        ),
        textContent: `New SEO Audit Lead\n\nClient: ${clientEmail}\nURL: ${url}\nScore: ${score}/100 — ${auditResults.overallStatus}\n\nFull report attached.`,
        attachment: [{ name: filename, content: pdfBase64 }],
      });

      console.log(`✅ Internal lead notification sent`);
    } catch (err) {
      console.warn(
        "⚠️  Internal notification failed (non-critical):",
        err.message,
      );
    }
  }

  // ─── Plain-text version of client email ───────────────────────────────────
  // Gmail uses presence of a text/plain part as a strong inbox signal
  _clientTextVersion(url, score, status, auditResults) {
    const checks = Object.values(auditResults.checks || {});
    const passed = checks.filter((c) => c.status === "pass").length;
    const warnings = checks.filter((c) => c.status === "warning").length;
    const failed = checks.filter((c) => c.status === "fail").length;

    const topIssues = [
      ...checks.filter((c) => c.status === "fail"),
      ...checks.filter((c) => c.status === "warning"),
    ].slice(0, 3);

    const issueLines = topIssues
      .map(
        (c) =>
          `  ${c.status === "fail" ? "✗" : "!"} ${c.name} (${c.score}/100)\n    ${c.recommendation || c.message || ""}`,
      )
      .join("\n\n");

    return `Hi there,

Your SEO audit for ${url} is complete.

SCORE: ${score}/100 — ${status}

RESULTS SUMMARY
---------------
Passed:   ${passed}
Warnings: ${warnings}
Failed:   ${failed}

${topIssues.length > 0 ? `TOP ISSUES TO ADDRESS\n---------------------\n${issueLines}\n\n` : ""}Your full AI-powered SEO report is attached as a PDF.

Want us to fix these issues?
Visit: https://business2virtual.com/contact

---
Business2Virtual
https://business2virtual.com
info@business2virtual.com`.trim();
  }

  // ─── Core API caller ──────────────────────────────────────────────────────
  async _sendViaAPI({
    to,
    subject,
    htmlContent,
    textContent,
    attachment,
    headers,
  }) {
    try {
      const payload = {
        sender: { name: this.fromName, email: this.fromEmail },
        to,
        subject,
        htmlContent,
        textContent, // Plain-text version — improves inbox placement
        attachment,
        headers: {
          "X-Mailer": "Business2Virtual SEO Tool",
          "X-Category": "transactional",
          // Tells Gmail this is a one-to-one transactional email, not bulk
          Precedence: "transactional",
          ...headers,
        },
      };

      await axios.post("https://api.brevo.com/v3/smtp/email", payload, {
        headers: {
          "api-key": this.apiKey,
          "Content-Type": "application/json",
        },
      });
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      throw new Error(`Brevo send failed: ${msg}`);
    }
  }

  // ─── Utilities ────────────────────────────────────────────────────────────
  _hostname(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return url.replace(/[^a-z0-9]/gi, "_");
    }
  }

  _color(score) {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#2563eb";
    if (score >= 40) return "#f59e0b";
    return "#ef4444";
  }

  // ─── Client Email Template ────────────────────────────────────────────────
  _clientTemplate(url, score, status, auditResults) {
    const checks = Object.values(auditResults.checks || {});
    const passed = checks.filter((c) => c.status === "pass").length;
    const warnings = checks.filter((c) => c.status === "warning").length;
    const failed = checks.filter((c) => c.status === "fail").length;
    const color = this._color(score);

    const topIssues = [
      ...checks.filter((c) => c.status === "fail"),
      ...checks.filter((c) => c.status === "warning"),
    ].slice(0, 3);

    const issueRows = topIssues
      .map((c) => {
        const isFail = c.status === "fail";
        const dot = isFail ? "#ef4444" : "#f59e0b";
        const icon = isFail ? "✗" : "!";
        return `<tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
        <table cellpadding="0" cellspacing="0" width="100%"><tr>
          <td width="20" valign="top" style="padding-top:2px;">
            <span style="color:${dot};font-weight:700;font-size:15px;">${icon}</span>
          </td>
          <td style="padding-left:8px;">
            <div style="font-weight:600;font-size:13px;color:#1e293b;">${c.name}</div>
            <div style="font-size:11px;color:#64748b;margin-top:3px;line-height:1.5;">${c.recommendation || c.message || ""}</div>
          </td>
          <td align="right" width="48" valign="top">
            <span style="font-weight:700;font-size:13px;color:${dot};">${c.score}/100</span>
          </td>
        </tr></table>
      </td></tr>`;
      })
      .join("");

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;">
<table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;padding:40px 20px;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" width="600" style="max-width:600px;">

  <tr><td style="background:#0f172a;border-radius:16px 16px 0 0;padding:28px 35px;">
    <table width="100%"><tr>
      <td>
        <div style="font-size:22px;font-weight:800;color:white;letter-spacing:-0.5px;">Business2Virtual</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:4px;">Professional SEO Audit Report</div>
      </td>
      <td align="right" valign="middle">
        <table cellpadding="0" cellspacing="0"><tr>
          <td align="center" valign="middle" style="background:${color};border-radius:50%;width:72px;height:72px;">
            <div style="color:white;font-size:22px;font-weight:800;line-height:1.2;">${score}</div>
            <div style="color:rgba(255,255,255,0.8);font-size:10px;">/100</div>
          </td>
        </tr></table>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="background:white;padding:35px;">
    <p style="font-size:15px;color:#334155;margin:0 0 16px;line-height:1.6;">Hi there,</p>
    <p style="font-size:14px;color:#475569;margin:0 0 25px;line-height:1.7;">
      Your SEO audit for <strong style="color:#2563eb;">${url}</strong> is complete.
      Your site scored <strong style="color:${color};font-size:16px;">${score}/100</strong>
      — <strong>${status}</strong>. The full PDF report is attached to this email.
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;"><tr>
      <td width="33%" style="padding:4px;">
        <div style="background:#f0fdf4;border-radius:10px;padding:16px;text-align:center;">
          <div style="font-size:30px;font-weight:800;color:#10b981;">${passed}</div>
          <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Passed</div>
        </div>
      </td>
      <td width="33%" style="padding:4px;">
        <div style="background:#fffbeb;border-radius:10px;padding:16px;text-align:center;">
          <div style="font-size:30px;font-weight:800;color:#f59e0b;">${warnings}</div>
          <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Warnings</div>
        </div>
      </td>
      <td width="33%" style="padding:4px;">
        <div style="background:#fef2f2;border-radius:10px;padding:16px;text-align:center;">
          <div style="font-size:30px;font-weight:800;color:#ef4444;">${failed}</div>
          <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">Failed</div>
        </div>
      </td>
    </tr></table>

    ${
      topIssues.length > 0
        ? `
    <div style="margin-bottom:28px;">
      <div style="font-size:13px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">🔍 Top Issues to Address</div>
      <table cellpadding="0" cellspacing="0" width="100%">${issueRows}</table>
    </div>`
        : ""
    }

    <div style="background:#eff6ff;border-radius:12px;padding:25px;text-align:center;margin-bottom:25px;">
      <div style="font-size:16px;font-weight:700;color:#1e293b;margin-bottom:8px;">Want Us to Fix These Issues?</div>
      <div style="font-size:13px;color:#64748b;margin-bottom:18px;line-height:1.6;">
        Our SEO experts can implement all these recommendations<br>and dramatically improve your search rankings.
      </div>
      <a href="https://business2virtual.com/contact"
         style="background:#2563eb;color:white;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;">
        Get a Free Consultation →
      </a>
    </div>

    <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.6;">
      📎 Your full AI-powered SEO report is attached as a PDF.<br>
      Reply to this email if you have any questions — we're happy to help!
    </p>
  </td></tr>

  <tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:18px 35px;border-top:1px solid #e2e8f0;">
    <table width="100%"><tr>
      <td style="font-size:11px;color:#94a3b8;line-height:1.6;">
        © 2026 Business2Virtual. All rights reserved.<br>
        <a href="https://business2virtual.com" style="color:#2563eb;text-decoration:none;">business2virtual.com</a>
        &nbsp;·&nbsp;
        <a href="mailto:info@business2virtual.com" style="color:#2563eb;text-decoration:none;">info@business2virtual.com</a>
      </td>
      <td align="right" style="font-size:11px;color:#94a3b8;">Sent by B2V SEO Audit Tool</td>
    </tr></table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
  }

  // ─── Internal Notification Template ───────────────────────────────────────
  _internalTemplate(clientEmail, url, score, auditResults) {
    const color = this._color(score);
    const checks = Object.values(auditResults.checks || {});
    const passed = checks.filter((c) => c.status === "pass").length;
    const warnings = checks.filter((c) => c.status === "warning").length;
    const failed = checks.filter((c) => c.status === "fail").length;
    const tip =
      score < 60
        ? "Significant issues found — high potential to pitch your full SEO services!"
        : score < 80
          ? "Moderate issues found — good opportunity to pitch improvement services."
          : "Site is healthy — pitch ongoing monitoring and advanced optimisation.";

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;padding:30px;margin:0;">
<div style="max-width:520px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
  <div style="background:#0f172a;padding:20px 28px;">
    <div style="color:white;font-size:18px;font-weight:700;">🔔 New Audit Lead</div>
    <div style="color:#94a3b8;font-size:12px;margin-top:4px;">Business2Virtual SEO Tool</div>
  </div>
  <div style="padding:25px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <td style="padding:10px 0;font-size:13px;color:#64748b;width:38%;border-bottom:1px solid #f1f5f9;">Client Email</td>
        <td style="padding:10px 0;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">
          <a href="mailto:${clientEmail}" style="color:#2563eb;">${clientEmail}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;">Audited URL</td>
        <td style="padding:10px 0;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">
          <a href="${url}" style="color:#2563eb;">${url}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;">SEO Score</td>
        <td style="padding:10px 0;font-size:22px;font-weight:800;color:${color};border-bottom:1px solid #f1f5f9;">
          ${score}/100 — ${auditResults.overallStatus}
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;">Results</td>
        <td style="padding:10px 0;font-size:13px;border-bottom:1px solid #f1f5f9;">
          <span style="color:#10b981;font-weight:600;">${passed} passed</span> &nbsp;·&nbsp;
          <span style="color:#f59e0b;font-weight:600;">${warnings} warnings</span> &nbsp;·&nbsp;
          <span style="color:#ef4444;font-weight:600;">${failed} failed</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;font-size:13px;color:#64748b;">AI Enhanced</td>
        <td style="padding:10px 0;font-size:13px;color:#1e293b;">
          ${auditResults.aiEnhanced ? "✅ Yes (" + (auditResults.aiProvider || "AI") + ")" : "❌ No"}
        </td>
      </tr>
    </table>
    <div style="background:#eff6ff;border-radius:8px;padding:15px;margin-top:20px;">
      <div style="font-size:13px;color:#1e40af;font-weight:600;margin-bottom:5px;">💡 Follow-up Tip</div>
      <div style="font-size:12px;color:#3b82f6;line-height:1.6;">${tip}</div>
    </div>
  </div>
</div>
</body>
</html>`;
  }
}

module.exports = EmailService;
