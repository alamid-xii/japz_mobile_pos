import nodemailer from 'nodemailer';

// Store verification codes in memory (in production, use Redis or database)
const verificationCodes = new Map();
const passwordResetCodes = new Map();

// Create transporter - configure with your email service
const createTransporter = () => {
    return nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD // Use App Password for Gmail
        }
    });
};

// Generate 6-digit code
const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification code email
export const sendVerificationCode = async (email, name) => {
    const code = generateCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    // Store code with email as key
    verificationCodes.set(email.toLowerCase(), { code, expiresAt, name });

    const transporter = createTransporter();

    const mailOptions = {
        from: `"JAPZ POS" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify Your Email - JAPZ POS',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1a1a1a; margin-bottom: 10px;">JAPZ POS</h1>
                </div>
                <div style="background-color: #f9f9f9; border-radius: 12px; padding: 30px; text-align: center;">
                    <h2 style="color: #333; margin-bottom: 10px;">Welcome, ${name}!</h2>
                    <p style="color: #666; margin-bottom: 20px;">Use the verification code below to complete your registration:</p>
                    <div style="background-color: #FFCE1B; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${code}</span>
                    </div>
                    <p style="color: #999; font-size: 14px;">This code expires in 10 minutes.</p>
                </div>
                <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
                    If you didn't request this code, please ignore this email.
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Email send error:', error);
        throw new Error('Failed to send verification email');
    }
};

// Verify the code
export const verifyCode = (email, code) => {
    const stored = verificationCodes.get(email.toLowerCase());

    if (!stored) {
        return { valid: false, error: 'No verification code found. Please request a new one.' };
    }

    if (Date.now() > stored.expiresAt) {
        verificationCodes.delete(email.toLowerCase());
        return { valid: false, error: 'Verification code has expired. Please request a new one.' };
    }

    if (stored.code !== code) {
        return { valid: false, error: 'Invalid verification code. Please try again.' };
    }

    // Code is valid, remove it
    verificationCodes.delete(email.toLowerCase());
    return { valid: true };
};

// Send password reset code email
export const sendPasswordResetCode = async (email, name) => {
    const code = generateCode();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes expiry

    // Store code with email as key
    passwordResetCodes.set(email.toLowerCase(), { code, expiresAt, name });

    const transporter = createTransporter();

    const mailOptions = {
        from: `"JAPZ POS" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset - JAPZ POS',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1a1a1a; margin-bottom: 10px;">JAPZ POS</h1>
                </div>
                <div style="background-color: #f9f9f9; border-radius: 12px; padding: 30px; text-align: center;">
                    <h2 style="color: #333; margin-bottom: 10px;">Password Reset Request</h2>
                    <p style="color: #666; margin-bottom: 10px;">Hi ${name},</p>
                    <p style="color: #666; margin-bottom: 20px;">Use the code below to reset your password:</p>
                    <div style="background-color: #FFCE1B; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${code}</span>
                    </div>
                    <p style="color: #999; font-size: 14px;">This code expires in 15 minutes.</p>
                </div>
                <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
                    If you didn't request a password reset, please ignore this email or contact support if you're concerned.
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Email send error:', error);
        throw new Error('Failed to send password reset email');
    }
};

// Verify password reset code
export const verifyPasswordResetCode = (email, code) => {
    const stored = passwordResetCodes.get(email.toLowerCase());

    if (!stored) {
        return { valid: false, error: 'No reset code found. Please request a new one.' };
    }

    if (Date.now() > stored.expiresAt) {
        passwordResetCodes.delete(email.toLowerCase());
        return { valid: false, error: 'Reset code has expired. Please request a new one.' };
    }

    if (stored.code !== code) {
        return { valid: false, error: 'Invalid reset code. Please try again.' };
    }

    // Code is valid, remove it
    passwordResetCodes.delete(email.toLowerCase());
    return { valid: true };
};

// Send approval notification email
export const sendApprovalEmail = async (email, name, approved, role = null) => {
    const transporter = createTransporter();

    const subject = approved
        ? 'Account Approved - JAPZ POS'
        : 'Account Status Update - JAPZ POS';

    const html = approved
        ? `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1a1a1a; margin-bottom: 10px;">JAPZ POS</h1>
                </div>
                <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 12px; padding: 30px; text-align: center;">
                    <table width="60" height="60" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 20px; background-color: #22c55e; border-radius: 50%;">
                        <tr>
                            <td align="center" valign="middle" style="color: white; font-size: 30px; line-height: 60px;">✓</td>
                        </tr>
                    </table>
                    <h2 style="color: #166534; margin-bottom: 10px;">Congratulations, ${name}!</h2>
                    <p style="color: #15803d; margin-bottom: 20px;">Your account has been approved by an administrator.</p>
                    <div style="background-color: white; border-radius: 8px; padding: 15px; margin: 20px 0;">
                        <p style="color: #666; margin: 0;">Your assigned role: <strong style="color: #1a1a1a;">${role || 'User'}</strong></p>
                    </div>
                    <p style="color: #666; margin-bottom: 20px;">You can now log in to the JAPZ POS system.</p>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" 
                       style="display: inline-block; background-color: #FFCE1B; color: #1a1a1a; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                        Log In Now
                    </a>
                </div>
                <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
                    If you have any questions, please contact your administrator.
                </p>
            </div>
        `
        : `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1a1a1a; margin-bottom: 10px;">JAPZ POS</h1>
                </div>
                <div style="background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 12px; padding: 30px; text-align: center;">
                    <table width="60" height="60" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 20px; background-color: #ef4444; border-radius: 50%;">
                        <tr>
                            <td align="center" valign="middle" style="color: white; font-size: 30px; line-height: 60px;">✕</td>
                        </tr>
                    </table>
                    <h2 style="color: #991b1b; margin-bottom: 10px;">Hello, ${name}</h2>
                    <p style="color: #dc2626; margin-bottom: 20px;">We regret to inform you that your account registration has not been approved at this time.</p>
                    <p style="color: #666;">If you believe this was a mistake or have questions, please contact the system administrator.</p>
                </div>
                <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
                    Thank you for your interest in JAPZ POS.
                </p>
            </div>
        `;

    const mailOptions = {
        from: `"JAPZ POS" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Email send error:', error);
        throw new Error('Failed to send notification email');
    }
};

export default {
    sendVerificationCode,
    verifyCode,
    sendApprovalEmail,
    sendPasswordResetCode,
    verifyPasswordResetCode
};
