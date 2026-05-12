import nodemailer from 'nodemailer';

// Store verification codes in memory
const verificationCodes = new Map();
const passwordResetCodes = new Map();

// Create Brevo SMTP transporter
const createTransporter = () => {
    const user = process.env.BREVO_SMTP_USER;
    const pass = process.env.BREVO_SMTP_PASS;

    if (!user || !pass) {
        console.error('BREVO_SMTP_USER or BREVO_SMTP_PASS not set!');
        throw new Error('Email service not configured');
    }

    return nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: { user, pass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
    });
};

const getFromEmail = () => process.env.BREVO_FROM_EMAIL || 'detorresphilip08@gmail.com';
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send verification code email
export const sendVerificationCode = async (email, name) => {
    const code = generateCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    verificationCodes.set(email.toLowerCase(), { code, expiresAt, name });

    const transporter = createTransporter();
    await transporter.sendMail({
        from: `"JAPZ POS" <${getFromEmail()}>`,
        to: email,
        subject: 'Verify Your Email - JAPZ POS',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1a1a1a;">JAPZ POS</h1>
                </div>
                <div style="background-color: #f9f9f9; border-radius: 12px; padding: 30px; text-align: center;">
                    <h2 style="color: #333;">Welcome, ${name}!</h2>
                    <p style="color: #666; margin-bottom: 20px;">Use the verification code below to complete your registration:</p>
                    <div style="background-color: #FFCE1B; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${code}</span>
                    </div>
                    <p style="color: #999; font-size: 14px;">This code expires in 10 minutes.</p>
                </div>
            </div>`
    });
    return { success: true };
};

export const verifyCode = (email, code) => {
    const stored = verificationCodes.get(email.toLowerCase());
    if (!stored) return { valid: false, error: 'No verification code found. Please request a new one.' };
    if (Date.now() > stored.expiresAt) { verificationCodes.delete(email.toLowerCase()); return { valid: false, error: 'Verification code has expired.' }; }
    if (stored.code !== code) return { valid: false, error: 'Invalid verification code.' };
    verificationCodes.delete(email.toLowerCase());
    return { valid: true };
};

export const sendPasswordResetCode = async (email, name) => {
    const code = generateCode();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    passwordResetCodes.set(email.toLowerCase(), { code, expiresAt, name });

    const transporter = createTransporter();
    await transporter.sendMail({
        from: `"JAPZ POS" <${getFromEmail()}>`,
        to: email,
        subject: 'Password Reset - JAPZ POS',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1a1a1a;">JAPZ POS</h1>
                </div>
                <div style="background-color: #f9f9f9; border-radius: 12px; padding: 30px; text-align: center;">
                    <h2 style="color: #333;">Password Reset</h2>
                    <p style="color: #666;">Hi ${name}, use the code below:</p>
                    <div style="background-color: #FFCE1B; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${code}</span>
                    </div>
                    <p style="color: #999; font-size: 14px;">This code expires in 15 minutes.</p>
                </div>
            </div>`
    });
    return { success: true };
};

export const verifyPasswordResetCode = (email, code) => {
    const stored = passwordResetCodes.get(email.toLowerCase());
    if (!stored) return { valid: false, error: 'No reset code found.' };
    if (Date.now() > stored.expiresAt) { passwordResetCodes.delete(email.toLowerCase()); return { valid: false, error: 'Reset code expired.' }; }
    if (stored.code !== code) return { valid: false, error: 'Invalid reset code.' };
    passwordResetCodes.delete(email.toLowerCase());
    return { valid: true };
};

export const sendApprovalEmail = async (email, name, approved, role = null) => {
    const transporter = createTransporter();
    const subject = approved ? 'Account Approved - JAPZ POS' : 'Account Status Update - JAPZ POS';
    const html = approved
        ? `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center;"><h1 style="color: #1a1a1a;">JAPZ POS</h1></div>
            <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 12px; padding: 30px; text-align: center;">
                <h2 style="color: #166534;">Congratulations, ${name}!</h2>
                <p style="color: #15803d;">Your account has been approved.</p>
                <p style="color: #666;">Role: <strong>${role || 'User'}</strong></p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="display: inline-block; background-color: #FFCE1B; color: #1a1a1a; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">Log In Now</a>
            </div></div>`
        : `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center;"><h1 style="color: #1a1a1a;">JAPZ POS</h1></div>
            <div style="background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 12px; padding: 30px; text-align: center;">
                <h2 style="color: #991b1b;">Hello, ${name}</h2>
                <p style="color: #dc2626;">Your registration was not approved.</p>
            </div></div>`;

    await transporter.sendMail({ from: `"JAPZ POS" <${getFromEmail()}>`, to: email, subject, html });
    return { success: true };
};

export default { sendVerificationCode, verifyCode, sendApprovalEmail, sendPasswordResetCode, verifyPasswordResetCode };
