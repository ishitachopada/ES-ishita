require('dotenv').config();
const nodemailer = require('nodemailer');

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SERVICE = process.env.SMTP_SERVICE || 'gmail';

let transporter;
if (SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
        service: SMTP_SERVICE,
        auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
} else {
    console.warn('SMTP credentials not set. Configure SMTP_USER and SMTP_PASS in environment.');
}

function sendOtpEmail(to, otp) {
    if (!transporter) return Promise.reject(new Error('No mail transporter configured'));
    return transporter.sendMail({
        from: SMTP_USER,
        to,
        subject: 'Your OTP Verification Code',
        text: `Your OTP code is: ${otp}`
    });
}

function sendPasswordResetOtp(to, otp, username) {
    if (!transporter) return Promise.reject(new Error('No mail transporter configured'));

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#F8FAFC;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:40px 20px;">
        <tr><td align="center">
          <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
            <tr>
              <td style="background:linear-gradient(135deg,#1E3A8A 0%,#10B981 100%);padding:32px 40px;text-align:center;">
                <div style="font-size:2rem;">&#127891;</div>
                <h1 style="color:#ffffff;margin:8px 0 4px;font-size:1.5rem;font-weight:700;">ExamSystem</h1>
                <p style="color:rgba(255,255,255,0.75);margin:0;font-size:0.85rem;">Secure Assessment Portal</p>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px;">
                <h2 style="margin:0 0 8px;color:#0F172A;font-size:1.25rem;font-weight:600;">Password Reset Request</h2>
                <p style="margin:0 0 24px;color:#64748B;font-size:0.9rem;line-height:1.6;">
                  Hi <strong style="color:#0F172A;">${username}</strong>, we received a request to reset your password.
                  Use the OTP below. It expires in <strong>10 minutes</strong>.
                </p>
                <div style="background:#F1F5F9;border:2px dashed #2563EB;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                  <p style="margin:0 0 6px;font-size:0.75rem;text-transform:uppercase;letter-spacing:1.5px;color:#64748B;font-weight:600;">Your OTP Code</p>
                  <div style="font-size:2.5rem;font-weight:700;letter-spacing:0.5rem;color:#2563EB;font-family:'Courier New',monospace;">${otp}</div>
                </div>
                <p style="margin:0;color:#64748B;font-size:0.825rem;line-height:1.6;">
                  If you did not request this, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 40px;text-align:center;">
                <p style="margin:0;color:#94A3B8;font-size:0.775rem;">&copy; 2026 ExamSystem. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>`;

    return transporter.sendMail({
        from: `"ExamSystem" <${SMTP_USER}>`,
        to,
        subject: 'Password Reset OTP — ExamSystem',
        text: `Hi ${username},\n\nYour password reset OTP is: ${otp}\n\nIt expires in 10 minutes.\n\nIf you did not request this, ignore this email.\n\n— ExamSystem`,
        html
    });
}

module.exports = { sendOtpEmail, sendPasswordResetOtp };
