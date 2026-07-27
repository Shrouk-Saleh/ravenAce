const BREVO_API_KEY = process.env.EMAIL_PASS; // We will use EMAIL_PASS to store the Brevo API Key
const FROM_EMAIL = process.env.EMAIL_FROM || process.env.EMAIL_USER; 

async function sendEmail({ to, subject, html }, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "Raven ACE",
          email: FROM_EMAIL
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html,
      }),
      signal: controller.signal,
    });
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`Brevo ${res.status}: ${errorText}`);
    }
    
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Sends a 6-digit OTP to the user's email address.
const sendOTP = (toEmail, otp) =>
  sendEmail({
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

// Sends an invitation email to a new user created by an organization.
// The activationUrl contains a token that the user must use to set their password.
const sendInvitation = (toEmail, userName, orgName, activationUrl) =>
  sendEmail({
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

// Sends an exam invitation to a candidate
const sendExamInvitation = (toEmail, examTitle, companyName, inviteUrl) =>
  sendEmail({
    to: toEmail,
    subject: `You have been invited to take the "${examTitle}" exam by ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0c1d3a; margin: 0;">Exam Invitation</h2>
          <p style="color: #6b7280; margin-top: 4px;">Raven ACE & ${companyName}</p>
        </div>
        <p style="color: #374151;">Hello,</p>
        <p style="color: #374151;">
          <strong>${companyName}</strong> has invited you to complete the <strong>"${examTitle}"</strong> assessment.
          Click the button below to start your exam.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${inviteUrl}"
             style="display: inline-block; padding: 14px 32px; background: #0c1d3a; color: #ffffff;
                    text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Start Assessment
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 13px;">
          This invitation link expires in <strong>7 days</strong>.
        </p>
      </div>
    `,
  });

module.exports = { sendOTP, sendInvitation, sendExamInvitation };
