import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Create a transporter object using Zoho SMTP
// We recreate this on every request to ensure it picks up env vars
// in serverless environments, though it could be cached outside.
const getTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com',
        port: Number(process.env.ZOHO_SMTP_PORT) || 465,
        secure: true, // Use SSL
        auth: {
            user: process.env.ZOHO_EMAIL_USER,
            pass: process.env.ZOHO_EMAIL_PASSWORD,
        },
    });
};

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { to, subject, html, text, attachments } = body;

        if (!to || !subject || (!html && !text)) {
            return NextResponse.json(
                { error: 'Missing required email fields (to, subject, and either html or text).' },
                { status: 400 }
            );
        }

        // Verify credentials exist
        if (!process.env.ZOHO_EMAIL_USER || !process.env.ZOHO_EMAIL_PASSWORD) {
            console.error('Zoho credentials are not configured in environment variables.');
            return NextResponse.json(
                { error: 'Email server configuration is incomplete.' },
                { status: 500 }
            );
        }

        const transporter = getTransporter();

        // Convert base64 string attachments into clean server-side binary Buffer objects
        // to prevent corruption, missing attachment files, and MIME header parsing bugs in mail clients.
        const formattedAttachments = attachments ? attachments.map((att: any) => {
            if (att.encoding === 'base64' && typeof att.content === 'string') {
                let base64Data = att.content;
                if (base64Data.includes(';base64,')) {
                    base64Data = base64Data.split(';base64,').pop() || '';
                }
                return {
                    filename: att.filename,
                    content: Buffer.from(base64Data, 'base64'),
                    contentType: att.contentType || 'application/pdf'
                };
            }
            return att;
        }) : [];

        const mailOptions = {
            from: `"${process.env.NEXT_PUBLIC_SITE_NAME || 'Rangdhanu Charity'}" <${process.env.ZOHO_EMAIL_USER}>`,
            replyTo: process.env.ZOHO_EMAIL_USER,
            to,
            subject,
            text,
            html,
            headers: {
                'X-Entity-Ref-ID': Date.now().toString()
            },
            attachments: formattedAttachments
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);

        return NextResponse.json({ success: true, messageId: info.messageId }, { status: 200 });

    } catch (error: any) {
        console.error('Error sending email:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send email' },
            { status: 500 }
        );
    }
}
