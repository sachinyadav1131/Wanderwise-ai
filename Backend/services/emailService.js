import nodemailer from "nodemailer";

// --- CORE EMAIL SENDER ---
export const sendEmail = async ({ email, subject, message }) => {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        service: process.env.SMTP_SERVICE, // Fixed typo here
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_MAIL,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    const mailOptions = {
        from: process.env.SMTP_MAIL,
        to: email,
        subject,
        html: message,
    };

    await transporter.sendMail(mailOptions);
};

// --- WANDERWISE AI EMAIL TEMPLATES ---

export function generateVerificationOtpEmailTemplate(otpCode) {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
        <h2 style="color: #333; text-align: center;">Welcome to Wanderwise AI!</h2>
        <p style="font-size: 16px; color: #555;">Dear Traveler,</p>
        <p style="font-size: 16px; color: #555;">
            To complete your registration and start planning your next trip, please use the verification code below:
        </p>
        <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; font-size: 32px; font-weight: bold; color: #222; background-color: #f5f5f5; padding: 12px 24px; border-radius: 8px; letter-spacing: 4px;">
                ${otpCode}
            </span>
        </div>
        <p style="font-size: 16px; color: #888;">This code is valid for <strong>15 minutes</strong>. Please do not share this code with anyone.</p>
        <p style="font-size: 16px; color: #888;">
            If you did not request this email, you can safely ignore it.
        </p>
        <footer style="margin-top: 40px; text-align: center; font-size: 14px; color: #999;">
            <p>Happy Travels,<br><strong>Wanderwise AI Team</strong></p>
            <p style="font-size: 12px; color: #aaa;">This is an automated message. Please do not reply to this email.</p>
        </footer>
    </div>
    `;
}

export function generateForgotPasswordEmailTemplate(resetPasswordUrl) {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">Reset Your Wanderwise Password</h2>
        <p style="font-size: 16px; color: #555;">Dear Traveler,</p>
        <p style="font-size: 16px; color: #555;">You requested to reset your password. Please click the button below to set a new one:</p>
        <div style="text-align: center; margin: 20px 0;">
            <a href="${resetPasswordUrl}" 
               style="display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: bold; color: #fff; background-color: #000; text-decoration: none; border-radius: 5px;">
                Reset Password
            </a>
        </div>
        <p style="font-size: 16px; color: #555;">
            If you did not request this, please ignore this email. The link will expire in 30 minutes.
        </p>
        <p style="font-size: 16px; color: #555;">
            If the button above doesn't work, copy and paste the following URL into your browser:
        </p>
        <p style="font-size: 14px; color: #0066cc; word-wrap: break-word;">${resetPasswordUrl}</p>
        <footer style="margin-top: 40px; text-align: center; font-size: 14px; color: #999;">
            <p>Thank you,<br><strong>Wanderwise AI Team</strong></p>
            <p style="font-size: 12px; color: #aaa;">This is an automated message. Please do not reply to this email.</p>
        </footer>
    </div>
    `;
}