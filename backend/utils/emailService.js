const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Add aggressive timeouts so if Gmail drops the connection from Render,
  // the app fails fast instead of hanging indefinitely.
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000,
});

// Sends a 6-digit OTP to the user's email address.
const sendOTP = async (toEmail, otp) => {
  await transporter.sendMail({
    from: `"Exam System" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your Password Reset OTP",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px;">
        <h2 style="color: #1F4E79;">Password Reset OTP</h2>
        <p>Your one-time password is:</p>
        <h1 style="letter-spacing: 8px; color: #2E75B6; font-size: 36px;">${otp}</h1>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p style="color: #888;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
};

// Sends an invitation email to a new user created by an organization.
// The activationUrl contains a token that the user must use to set their password.
const sendInvitation = async (toEmail, userName, orgName, activationUrl) => {
  await transporter.sendMail({
    from: `"Raven ACE" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `You've been invited to join ${orgName} on Raven ACE`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0c1d3a; margin: 0;">Welcome to Raven ACE</h2>
          <p style="color: #6b7280; margin-top: 4px;">AI Certification & Examination Platform</p>
        </div>
        <p style="color: #374151;">Hi <strong>${userName}</strong>,</p>
        <p style="color: #374151;">
          <strong>${orgName}</strong> has invited you to join their team on Raven ACE.
          Click the button below to activate your account and set your password.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${activationUrl}"
             style="display: inline-block; padding: 14px 32px; background: #0c1d3a; color: #ffffff;
                    text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Activate My Account
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 13px;">
          This invitation link expires in <strong>7 days</strong>.
          If you did not expect this invitation, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          Raven ACE — AI-Powered Examination & Certification
        </p>
      </div>
    `,
  });
};

module.exports = { sendOTP, sendInvitation };
