import { Resend } from 'resend';

// Store verification codes in memory (in production, use Redis or database)
const verificationCodes = new Map();
const passwordResetCodes = new Map();

// Create Resend client
const getResend = () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.error('RESEND_API_KEY is not set!');
        throw new Error('Email service not configured');
    }
    return new Resend(apiKey);
};

// Email sender - Resend free tier shared domain
const FROM_EMAIL = 'JAPZ POS <onboarding@resend.dev>';

// Generate 6-digit code
const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification code email
export const sendVerificationCode = async (email, name) => {
    const code = generateCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
    verificationCodes.set(email.toLowerCase(), { code, expiresAt, name });

    const resend = getResend();
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [email],
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
        });
        if (error) {
            console.error('Resend API error:', error);
            throw new Error(error.message || 'Failed to send email');
        }
        console.log('Email sent successfully:', data);
        return { success: true };
    } catch (error) {
        console.error('Email send error:', error);
        throw new Error('Failed to send verification email: ' + error.message);
    }
};

// Verify the code
export const verifyCode = (email, code) => {
    const stored = verificationCodes.get(email.toLowerCase());
    if (!stored) return { valid: false, error: 'No verification code found. Please request a new one.' };
    if (Date.now() > stored.expiresAt) { verificationCodes.delete(email.toLowerCase()); return { valid: false, error: 'Verification code has expired. Please request a new one.' }; }
    if (stored.code !== code) return { valid: false, error: 'Invalid verification code. Please try again.' };
    verificationCodes.delete(email.toLowerCase());
    return { valid: true };
};

// Send password reset code email
export const sendPasswordResetCode = async (email, name) => {
    const code = generateCode();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    passwordResetCodes.set(email.toLowerCase(), { code, expiresAt, name });

    const resend = getResend();
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [email],
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
                        If you didn't request a password reset, please ignore this email.
                    </p>
                </div>
            `
        });
        if (error) throw new Error(error.message || 'Failed to send email');
        return { success: true };
    } catch (error) {
        console.error('Email send error:', error);
        throw new Error('Failed to send password reset email: ' + error.message);
    }
};

// Verify password reset code
export const verifyPasswordResetCode = (email, code) => {
    const stored = passwordResetCodes.get(email.toLowerCase());
    if (!stored) return { valid: false, error: 'No reset code found. Please request a new one.' };
    if (Date.now() > stored.expiresAt) { passwordResetCodes.delete(email.toLowerCase()); return { valid: false, error: 'Reset code has expired. Please request a new one.' }; }
    if (stored.code !== code) return { valid: false, error: 'Invalid reset code. Please try again.' };
    passwordResetCodes.delete(email.toLowerCase());
    return { valid: true };
};

// Send approval notification email
export const sendApprovalEmail = async (email, name, approved, role = null) => {
    const resend = getResend();
    const subject = approved ? 'Account Approved - JAPZ POS' : 'Account Status Update - JAPZ POS';
    const html = approved
        ? `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;"><h1 style="color: #1a1a1a;">JAPZ POS</h1></div>
            <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 12px; padding: 30px; text-align: center;">
                <h2 style="color: #166534;">Congratulations, ${name}!</h2>
                <p style="color: #15803d;">Your account has been approved by an administrator.</p>
                <div style="background-color: white; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="color: #666; margin: 0;">Your assigned role: <strong>${role || 'User'}</strong></p>
                </div>
                <p style="color: #666;">You can now log in to the JAPZ POS system.</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="display: inline-block; background-color: #FFCE1B; color: #1a1a1a; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">Log In Now</a>
            </div></div>`
        : `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;"><h1 style="color: #1a1a1a;">JAPZ POS</h1></div>
            <div style="background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 12px; padding: 30px; text-align: center;">
                <h2 style="color: #991b1b;">Hello, ${name}</h2>
                <p style="color: #dc2626;">Your account registration has not been approved at this time.</p>
                <p style="color: #666;">Please contact the system administrator.</p>
            </div></div>`;

    try {
        const { data, error } = await resend.emails.send({ from: FROM_EMAIL, to: [email], subject, html });
        if (error) throw new Error(error.message || 'Failed to send email');
        return { success: true };
    } catch (error) {
        console.error('Email send error:', error);
        throw new Error('Failed to send notification email: ' + error.message);
    }
};

export default {
    sendVerificationCode,
    verifyCode,
    sendApprovalEmail,
    sendPasswordResetCode,
    verifyPasswordResetCode
};
