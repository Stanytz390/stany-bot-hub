import nodemailer from "nodemailer";

// ============================================================
// MIPANGILIO KUTOKA ENVIRONMENT VARIABLES
// ============================================================
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const MAIL_FROM = process.env.MAIL_FROM || `STANY Host <noreply@host.stanymaxhub.online>`;

export const mailerConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

// ============================================================
// UNDA TRANSPORTER
// ============================================================
const transporter = mailerConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: { rejectUnauthorized: false },
      pool: true,
      maxConnections: 5,
      maxMessages: 100
    })
  : null;

if (transporter) {
  transporter.verify((error: Error | null) => {
    if (error) {
      console.error('[Mailer] Verification failed:', error);
    } else {
      console.log(`[Mailer] Ready to send emails via ${SMTP_HOST}:${SMTP_PORT}`);
    }
  });
}

// ============================================================
// TUMIA BARUA PEPE
// ============================================================
export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!transporter) {
    console.warn(`[mailer] SMTP not configured. Email to ${to} skipped.`);
    return false;
  }
  try {
    const info = await transporter.sendMail({
      from: MAIL_FROM,
      to,
      subject,
      html,
      headers: {
        'X-Entity-Ref-ID': Date.now().toString(),
        'X-Bird-Idempotency-Key': `${to}-${Date.now()}`
      }
    });
    console.log(`[mailer] Email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error("[mailer] send failed", err);
    return false;
  }
}

// ============================================================
// TEMPLATES - FONT AWESOME, SQ COINS
// ============================================================

// 1. WELCOME EMAIL
export function welcomeEmailHtml(username: string, sqCoins: number, referralCode: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to STANY Host</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      background: #08060c;
      padding: 20px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 560px;
      width: 100%;
      background: linear-gradient(160deg, #140a18, #0c0910);
      border-radius: 24px;
      overflow: hidden;
      border: 1px solid rgba(255, 45, 142, 0.2);
      box-shadow: 0 25px 60px rgba(0,0,0,0.7);
    }
    .header {
      background: linear-gradient(135deg, #FF2D8E, #FF69B4);
      padding: 40px 30px 30px;
      text-align: center;
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 100%;
      height: 100%;
      background: rgba(255,255,255,0.05);
      border-radius: 50%;
    }
    .header img {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      border: 3px solid rgba(255,255,255,0.3);
      position: relative;
      z-index: 1;
    }
    .header h1 {
      color: #ffffff;
      font-size: 26px;
      font-weight: 700;
      margin-top: 12px;
      position: relative;
      z-index: 1;
    }
    .header p {
      color: rgba(255,255,255,0.85);
      font-size: 15px;
      margin-top: 6px;
      position: relative;
      z-index: 1;
    }
    .content { padding: 30px 28px; }
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 12px;
    }
    .greeting span { color: #FF69B4; }
    .message {
      color: #b8b3c4;
      line-height: 1.8;
      font-size: 14px;
      margin-bottom: 24px;
    }
    .stats {
      display: flex;
      gap: 12px;
      margin: 20px 0 28px;
    }
    .stat-card {
      flex: 1;
      background: rgba(255, 45, 142, 0.08);
      border-radius: 12px;
      padding: 16px 12px;
      text-align: center;
      border: 1px solid rgba(255, 45, 142, 0.15);
    }
    .stat-card .icon {
      font-size: 20px;
      color: #FF69B4;
      margin-bottom: 4px;
    }
    .stat-card .number {
      font-size: 24px;
      font-weight: 700;
      color: #FF69B4;
    }
    .stat-card .label {
      font-size: 11px;
      color: #6f6a7d;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #FF2D8E, #FF69B4);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 40px;
      border-radius: 50px;
      font-weight: 600;
      font-size: 15px;
      box-shadow: 0 8px 30px rgba(255, 45, 142, 0.35);
      transition: transform 0.2s;
    }
    .btn:hover { transform: translateY(-2px); }
    .divider {
      height: 1px;
      background: rgba(255, 45, 142, 0.15);
      margin: 28px 0;
    }
    .referral-box {
      background: rgba(255, 45, 142, 0.06);
      border-radius: 12px;
      padding: 20px;
      border: 1px dashed rgba(255, 45, 142, 0.3);
      text-align: center;
    }
    .referral-box .icon {
      font-size: 18px;
      color: #FF69B4;
      margin-bottom: 4px;
    }
    .referral-box .label {
      font-size: 13px;
      color: #6f6a7d;
    }
    .referral-box code {
      background: #0c0910;
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 700;
      color: #FF69B4;
      border: 1px solid rgba(255, 45, 142, 0.2);
      display: inline-block;
      margin-top: 8px;
      letter-spacing: 2px;
      font-family: 'Courier New', monospace;
    }
    .referral-box .note {
      font-size: 12px;
      color: #6f6a7d;
      margin-top: 10px;
    }
    .referral-box .note strong { color: #FF69B4; }
    .footer {
      background: rgba(255, 45, 142, 0.04);
      padding: 20px 28px;
      text-align: center;
      border-top: 1px solid rgba(255, 45, 142, 0.08);
    }
    .footer p {
      color: #6f6a7d;
      font-size: 12px;
      line-height: 1.6;
    }
    .footer a { color: #FF69B4; text-decoration: none; }
    .footer .social {
      margin-top: 12px;
      display: flex;
      justify-content: center;
      gap: 16px;
    }
    .footer .social a {
      color: #6f6a7d;
      font-size: 14px;
      text-decoration: none;
      transition: color 0.2s;
    }
    .footer .social a:hover { color: #FF69B4; }
    @media (max-width: 480px) {
      .stats { flex-direction: column; }
      .header h1 { font-size: 20px; }
      .content { padding: 20px 16px; }
      .btn { display: block; text-align: center; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://www.image2url.com/r2/default/images/1785768016118-4dd34d8a-8898-4f18-be89-c0ff6508d6b3.png" alt="STANY Host" />
      <h1>Welcome to STANY Host</h1>
      <p>Your bot hosting journey begins here</p>
    </div>
    <div class="content">
      <div class="greeting">Hello, <span>${username}</span></div>
      <div class="message">
        We're thrilled to have you on board! Your account has been verified successfully and you're now ready to start hosting your bots with STANY Host.
      </div>
      <div class="stats">
        <div class="stat-card">
          <div class="icon"><i class="fas fa-coins"></i></div>
          <div class="number">${sqCoins}</div>
          <div class="label">SQ Coins</div>
        </div>
        <div class="stat-card">
          <div class="icon"><i class="fas fa-gem"></i></div>
          <div class="number">Free</div>
          <div class="label">Tier</div>
        </div>
        <div class="stat-card">
          <div class="icon"><i class="fas fa-rocket"></i></div>
          <div class="number">Active</div>
          <div class="label">Status</div>
        </div>
      </div>
      <div style="text-align: center;">
        <a href="https://host.stanymaxhub.online/dashboard" class="btn"><i class="fas fa-arrow-right"></i> Go to Dashboard</a>
      </div>
      <div class="divider"></div>
      <div class="referral-box">
        <div class="icon"><i class="fas fa-gift"></i></div>
        <div class="label">Share and Earn</div>
        <div style="font-size:12px;color:#6f6a7d;margin-top:4px;">Your referral code</div>
        <code>${referralCode}</code>
        <div class="note">Share this code with friends and earn <strong>2 SQ Coins</strong> for each signup!</div>
      </div>
    </div>
    <div class="footer">
      <p>
        <strong style="color:#ffffff;">STANY Host</strong> — The fastest bot hosting platform.<br>
        Need help? <a href="mailto:support@stanyhost.com">support@stanyhost.com</a>
      </p>
      <div class="social">
        <a href="#"><i class="fab fa-twitter"></i></a>
        <a href="#"><i class="fab fa-discord"></i></a>
        <a href="#"><i class="fab fa-github"></i></a>
      </div>
      <p style="font-size:10px;margin-top:8px;color:#4a4556;">
        &copy; 2026 STANY Host. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// 2. OTP VERIFICATION EMAIL
export function otpEmailHtml(code: string, username: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>STANY Host Verification</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      background: #08060c;
      padding: 20px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 480px;
      width: 100%;
      background: linear-gradient(160deg, #140a18, #0c0910);
      border-radius: 20px;
      padding: 36px 28px;
      border: 1px solid rgba(255, 45, 142, 0.2);
      box-shadow: 0 25px 60px rgba(0,0,0,0.7);
      text-align: center;
    }
    .logo {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 22px;
      color: #ffffff;
      margin-bottom: 8px;
    }
    p {
      color: #b8b3c4;
      font-size: 14px;
      line-height: 1.7;
      margin-bottom: 20px;
    }
    .code-box {
      background: rgba(255, 45, 142, 0.06);
      border: 2px dashed rgba(255, 45, 142, 0.3);
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    .code {
      font-size: 34px;
      font-weight: 700;
      color: #FF69B4;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
    }
    .expiry {
      font-size: 12px;
      color: #6f6a7d;
      margin-top: 8px;
    }
    .expiry strong { color: #FF69B4; }
    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 45, 142, 0.08);
      font-size: 12px;
      color: #6f6a7d;
    }
    .footer a { color: #FF69B4; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <img class="logo" src="https://www.image2url.com/r2/default/images/1785768016118-4dd34d8a-8898-4f18-be89-c0ff6508d6b3.png" alt="STANY Host" />
    <h1><i class="fas fa-lock" style="color:#FF69B4;"></i> Verify Your Email</h1>
    <p>Hi <strong style="color:#ffffff;">${username}</strong>,<br>Enter the code below to verify your email address.</p>
    <div class="code-box">
      <div class="code">${code}</div>
    </div>
    <p class="expiry"><i class="fas fa-clock" style="color:#6f6a7d;"></i> This code expires in <strong>10 minutes</strong></p>
    <p style="font-size:12px;color:#6f6a7d;">If you didn't request this, please ignore this email.</p>
    <div class="footer">
      <strong style="color:#ffffff;">STANY Host</strong> — <a href="https://host.stanymaxhub.online">host.stanymaxhub.online</a>
    </div>
  </div>
</body>
</html>`;
}

// 3. RESET PASSWORD EMAIL
export function resetPasswordEmailHtml(username: string, resetLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      background: #08060c;
      padding: 20px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 480px;
      width: 100%;
      background: linear-gradient(160deg, #140a18, #0c0910);
      border-radius: 20px;
      padding: 36px 28px;
      border: 1px solid rgba(255, 45, 142, 0.2);
      box-shadow: 0 25px 60px rgba(0,0,0,0.7);
      text-align: center;
    }
    .logo { width: 60px; height: 60px; border-radius: 50%; margin-bottom: 16px; }
    h1 { font-size: 22px; color: #ffffff; margin-bottom: 8px; }
    p { color: #b8b3c4; font-size: 14px; line-height: 1.7; margin-bottom: 20px; }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #FF2D8E, #FF69B4);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 40px;
      border-radius: 50px;
      font-weight: 600;
      font-size: 15px;
      margin: 10px 0 20px;
      box-shadow: 0 8px 30px rgba(255, 45, 142, 0.35);
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .divider { height: 1px; background: rgba(255, 45, 142, 0.15); margin: 24px 0; }
    .warning { font-size: 12px; color: #ff6b6b; }
    .footer { font-size: 12px; color: #6f6a7d; margin-top: 20px; }
    .footer a { color: #FF69B4; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <img class="logo" src="https://www.image2url.com/r2/default/images/1785768016118-4dd34d8a-8898-4f18-be89-c0ff6508d6b3.png" alt="STANY Host" />
    <h1><i class="fas fa-key" style="color:#FF69B4;"></i> Reset Your Password</h1>
    <p>Hi <strong style="color:#ffffff;">${username}</strong>,<br>We received a request to reset your password. Click the button below to set a new one.</p>
    <a href="${resetLink}" class="btn"><i class="fas fa-sync-alt"></i> Reset Password</a>
    <p style="font-size:12px;color:#6f6a7d;"><i class="fas fa-clock" style="color:#6f6a7d;"></i> This link expires in <strong style="color:#FF69B4;">1 hour</strong></p>
    <div class="divider"></div>
    <p class="warning"><i class="fas fa-exclamation-triangle"></i> If you didn't request this, ignore this email. Your password won't change.</p>
    <div class="footer">
      <strong style="color:#ffffff;">STANY Host</strong> — <a href="https://host.stanymaxhub.online">host.stanymaxhub.online</a>
    </div>
  </div>
</body>
</html>`;
}