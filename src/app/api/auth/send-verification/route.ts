import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { userId, email, name } = await request.json();
    
    // Create a verification token
    const customToken = await getAuth().createCustomToken(userId);
    const verificationLink = `${process.env.NEXT_PUBLIC_SITE_URL}/verify-email/confirm?token=${customToken}`;
    
    // Setup email transporter (configure with your email provider)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    
    // Send beautiful HTML email
    await transporter.sendMail({
      from: `"Greenhouse 2025" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Verify Your Greenhouse 2025 Account",
      html: `
        <div style="background-color: #f9f9f9; padding: 20px; font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #4CAF50, #8BC34A); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Verify Your Email</h1>
            </div>
            <div style="padding: 30px;">
              <p>Hi ${name},</p>
              <p>Thank you for registering for Greenhouse 2025! To complete your registration, please verify your email address:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Verify Email Address</a>
              </div>
              <p>This link will expire in 24 hours.</p>
              <p>If you didn't create an account, you can safely ignore this email.</p>
              <p>Best regards,<br>The Greenhouse 2025 Team</p>
            </div>
            <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
              <p>&copy; 2023 Greenhouse 2025. All rights reserved.</p>
            </div>
          </div>
        </div>
      `
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending verification email:', error);
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
  }
} 