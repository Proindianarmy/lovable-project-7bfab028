import nodemailer from "nodemailer";

// ─── Detection helpers ────────────────────────────────────────────────────────

function isResendConfigured() {
  const key = process.env.RESEND_API_KEY;
  return !!(key && key.startsWith("re_") && key.length > 10);
}

function isGmailConfigured() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASS;
  if (!user || !pass) return false;
  if (user === "your.gmail@gmail.com" || pass === "xxxxxxxxxxxxxxxx") return false;
  if (pass.replace(/\s/g, "").length !== 16) return false;
  return true;
}

function isSmtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function isEmailConfigured() {
  return isResendConfigured() || isGmailConfigured() || isSmtpConfigured();
}

export function logEmailMode() {
  if (isResendConfigured()) {
    console.log("📧 Email mode:   Resend API (HTTP) ✅");
  } else if (isSmtpConfigured()) {
    console.log("📧 Email mode:   SMTP configured ✅");
  } else if (isGmailConfigured()) {
    console.log("📧 Email mode:   credentials detected — run a test OTP to confirm Gmail/SMTP accepts them.");
  } else {
    console.log("📧 Email mode:   CONSOLE ONLY (no credentials configured)");
  }
}

async function sendViaResend({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || "IssueSnap <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Resend API error ${response.status}: ${err.message || JSON.stringify(err)}`);
  }

  return await response.json();
}

function createSmtpTransporter() {
  if (isSmtpConfigured()) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
    });
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: (process.env.GMAIL_APP_PASS || "").replace(/\s/g, ""),
    },
    tls: { rejectUnauthorized: false },
  });
}

function otpEmailHtml(otp, purpose) {
  const isReset = purpose === "reset";
  const heading = isReset ? "Reset Your Password" : "Verify Your Email";
  const subtext = isReset
    ? "You requested a password reset. Use the code below."
    : "Welcome to IssueSnap! Use the code below to verify your account.";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f7fb;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 40px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">📍</div>
          <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">IssueSnap</h1>
          <p style="color:#bfdbfe;margin:6px 0 0;font-size:14px;">Civic Issue Reporting Portal</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="color:#1e293b;margin:0 0 12px;font-size:20px;">${heading}</h2>
          <p style="color:#64748b;margin:0 0 28px;font-size:15px;line-height:1.6;">${subtext}</p>
          <div style="background:#f1f5f9;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
            <p style="color:#64748b;font-size:13px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">Your OTP Code</p>
            <div style="display:inline-block;background:#fff;border:2px solid #2563eb;border-radius:8px;padding:16px 32px;">
              <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#1e40af;">${otp}</span>
            </div>
            <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;">⏱ Expires in <strong>10 minutes</strong></p>
          </div>
          <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">If you did not request this, please ignore this email. Never share this code with anyone.</p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} IssueSnap. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendOtpEmail(toEmail, otp, purpose) {
  if (!isEmailConfigured()) {
    console.info(`\n📧 [DEV] OTP for ${toEmail}: ${otp} (purpose: ${purpose})\n`);
    return;
  }

  const subject = purpose === "reset"
    ? "IssueSnap — Password Reset OTP"
    : "IssueSnap — Email Verification OTP";

  const html = otpEmailHtml(otp, purpose);
  const text = `Your IssueSnap OTP is: ${otp}. It expires in 10 minutes.`;

  try {
    if (isResendConfigured()) {
      await sendViaResend({ to: toEmail, subject, html, text });
    } else {
      const transporter = createSmtpTransporter();
      const FROM = `"IssueSnap" <${process.env.EMAIL_FROM || process.env.GMAIL_USER || "noreply@issuesnap.com"}>`;
      await transporter.sendMail({ from: FROM, to: toEmail, subject, html, text });
    }
    console.info(`✅ OTP email sent to ${toEmail} (purpose: ${purpose})`);
  } catch (err) {
    console.error(`❌ Failed to send OTP email to ${toEmail}:`, err.message);
    throw new Error("Failed to send OTP email. Please check your email configuration.");
  }
}

export async function sendWelcomeEmail(toEmail, name) {
  if (!isEmailConfigured()) return;

  const subject = "Welcome to IssueSnap! 🎉";
  const html = `<p>Hi ${name},</p><p>Welcome to IssueSnap! Start reporting civic issues in your community.</p>`;
  const text = `Hi ${name}, Welcome to IssueSnap!`;

  try {
    if (isResendConfigured()) {
      await sendViaResend({ to: toEmail, subject, html, text });
    } else {
      const transporter = createSmtpTransporter();
      const FROM = `"IssueSnap" <${process.env.EMAIL_FROM || process.env.GMAIL_USER || "noreply@issuesnap.com"}>`;
      await transporter.sendMail({ from: FROM, to: toEmail, subject, html, text });
    }
  } catch (err) {
    console.warn(`⚠️ Welcome email could not be sent to ${toEmail}:`, err.message);
  }
}