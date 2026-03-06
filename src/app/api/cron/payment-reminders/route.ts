import { NextResponse } from 'next/server';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import nodemailer from 'nodemailer';

const getTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.ZOHO_SMTP_HOST || 'smtp.zoho.com',
        port: Number(process.env.ZOHO_SMTP_PORT) || 465,
        secure: true,
        auth: {
            user: process.env.ZOHO_EMAIL_USER,
            pass: process.env.ZOHO_EMAIL_PASSWORD,
        },
    });
};

export async function GET(request: Request) {
    // 1. Authorization
    const authHeader = request.headers.get('authorization');
    if (
        process.env.NODE_ENV !== 'development' &&
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
        return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
    }

    try {
        // 2. Fetch required data from Firestore
        const [usersSnap, paymentsSnap, settingsSnap] = await Promise.all([
            getDocs(collection(db, 'users')),
            getDocs(collection(db, 'payments')),
            getDoc(doc(db, 'admin', 'settings'))
        ]);

        const users = usersSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        const payments = paymentsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        const settings = settingsSnap.exists() ? settingsSnap.data() : { collectionYears: [], collectionMonths: {} };

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        let emailsSent = 0;
        let emailsFailed = 0;
        const transporter = getTransporter();

        for (const user of users) {
            // Only examine users with a valid email address
            if (!user.email) continue;

            const userPayments = payments.filter((p: any) => p.userId === user.id);
            const paidMonthsCount = new Set(
                userPayments.filter((p: any) => p.type === 'monthly').map((p: any) => `${p.month}-${p.year}`)
            ).size;

            let totalPassedMonths = 0;

            if (settings && settings.collectionYears) {
                settings.collectionYears.forEach((year: number) => {
                    const activeMonthsInYear = settings.collectionMonths?.[year] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                    if (year < currentYear) {
                        totalPassedMonths += activeMonthsInYear.length;
                    } else if (year === currentYear) {
                        totalPassedMonths += activeMonthsInYear.filter((m: number) => m <= currentMonth).length;
                    }
                });
            }

            const monthsDue = Math.max(0, totalPassedMonths - paidMonthsCount);

            if (monthsDue > 0) {
                // Build per-year due-month grid for the email
                const paidMonthsSet = new Set(
                    userPayments.filter((p: any) => p.type === 'monthly').map((p: any) => `${p.month}-${p.year}`)
                );

                const yearGridHtml = (settings.collectionYears || []).map((yr: number) => {
                    const mons: number[] = settings.collectionMonths?.[yr] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                    const relevant = yr < currentYear ? mons : yr === currentYear ? mons.filter((m: number) => m <= currentMonth) : [];
                    if (relevant.length === 0) return '';
                    const cells = relevant.map((m: number) => {
                        const paid = paidMonthsSet.has(`${m}-${yr}`);
                        const mName = new Date(2000, m - 1, 1).toLocaleString('en-US', { month: 'short' });
                        return `<td style="padding:5px 8px;text-align:center;border:1px solid #e5e7eb;background:${paid ? '#f0fdf4' : '#fff7ed'};color:${paid ? '#15803d' : '#b45309'};font-size:11px;white-space:nowrap">${paid ? '✅' : '🔴'} ${mName}</td>`;
                    }).join('');
                    return `<div style="padding:8px 16px;border-bottom:1px solid #e5e7eb">
                        <div style="font-weight:700;font-size:12px;color:#374151;margin-bottom:5px">${yr}</div>
                        <table style="border-collapse:collapse;width:100%"><tr>${cells}</tr></table>
                    </div>`;
                }).join('');

                const mailOptions = {
                    from: `"${process.env.NEXT_PUBLIC_SITE_NAME || 'Rangdhanu Charity'}" <${process.env.ZOHO_EMAIL_USER}>`,
                    to: user.email,
                    subject: `💛 A Gentle Donation Reminder — Rangdhanu Charity`,
                    html: `
                        <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#1f2937;background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
                            <div style="background:linear-gradient(135deg,#78350f,#b45309);padding:28px 32px">
                                <h2 style="margin:0;color:#fff;font-size:22px">💛 A Gentle Reminder from Rangdhanu</h2>
                                <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px">Rangdhanu Charity Foundation — Together for a brighter future</p>
                            </div>
                            <div style="padding:28px 32px">
                                <p style="font-size:15px">Dear <strong>${user.name || user.username || 'Valued Member'}</strong>,</p>
                                <p>We hope you are doing well! This is a warm and friendly reminder that your monthly donation account shows <strong style="color:#b45309">${monthsDue} month(s)</strong> still awaiting your generous contribution.</p>

                                <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:18px;margin:20px 0">
                                    <p style="margin:0;color:#92400e;font-size:14px">💡 <strong>No rush — we have flexible timelines!</strong><br/>
                                    There is no strict deadline. You are welcome to donate at a time that is convenient for you — whether it's a few months later or multiple months together. Your support, whenever it comes, means the world to the children we serve. 🙏</p>
                                </div>

                                <div style="margin:20px 0;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
                                    <div style="background:linear-gradient(135deg,#1e3a8a,#0f766e);padding:12px 16px">
                                        <span style="color:#fff;font-weight:700;font-size:15px">📊 Your Donation Account Overview</span>
                                    </div>
                                    <div style="padding:12px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb">
                                        <table style="width:100%;border-collapse:collapse;font-size:13px">
                                            <tr><td style="padding:4px 0;color:#6b7280">Total Months Since Foundation Start</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#374151">${totalPassedMonths}</td></tr>
                                            <tr><td style="padding:4px 0;color:#15803d;font-weight:600">Total Months Donated</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#15803d">${paidMonthsCount}</td></tr>
                                            <tr><td style="padding:4px 0;color:#b45309;font-weight:600">Months Awaiting Your Donation</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#b45309">${monthsDue}</td></tr>
                                        </table>
                                    </div>
                                    ${yearGridHtml}
                                </div>

                                <p style="font-size:13px;color:#6b7280">Green months (✅) are already donated. Red months (🔴) are gently waiting for your contribution. You can pay for multiple months at once when you are ready.</p>
                                <p style="font-size:14px">To make your donation, simply log in to your member profile and click <strong>"Donate Now"</strong>. It only takes a minute! 😊</p>
                                <p style="margin-top:20px">If you have already made the payment or believe there is any error, please feel free to contact us — we are always happy to help.</p>
                                <p style="margin:24px 0 0">With heartfelt gratitude,<br/><strong>Team Rangdhanu</strong><br/><span style="font-size:12px;color:#6b7280">Rangdhanu Charity Foundation</span></p>
                            </div>
                            <div style="background:#f9fafb;padding:14px 32px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb">
                                This is an automated friendly reminder. You are receiving this because you are a registered member of Rangdhanu Charity Foundation.
                            </div>
                        </div>
                    `,
                };

                try {
                    await transporter.sendMail(mailOptions);
                    emailsSent++;
                } catch (e) {
                    console.error(`Failed to send reminder to ${user.email}:`, e);
                    emailsFailed++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Cron job executed successfully. Sent ${emailsSent} reminders (Failed: ${emailsFailed}).`
        });

    } catch (error: any) {
        console.error("Cron Error: ", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
