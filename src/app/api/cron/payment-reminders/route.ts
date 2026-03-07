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
                    const relevant = mons.filter((m: number) => {
                        const isPast = (yr < currentYear) || (yr === currentYear && m <= currentMonth);
                        return isPast || paidMonthsSet.has(`${m}-${yr}`);
                    });
                    if (relevant.length === 0) return '';

                    const paidList = relevant.filter((m: number) => paidMonthsSet.has(`${m}-${yr}`));
                    const dueList = relevant.filter((m: number) => !paidMonthsSet.has(`${m}-${yr}`));

                    const paidLabels = paidList.map((m: number) => new Date(2000, m - 1, 1).toLocaleString('en-US', { month: 'short' })).join(', ') || '—';
                    const dueLabels = dueList.map((m: number) => new Date(2000, m - 1, 1).toLocaleString('en-US', { month: 'short' })).join(', ') || '—';
                    const hasDue = dueList.length > 0;

                    return `<div style="padding:10px 18px;border-bottom:1px solid #f1f5f9">
                        <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:5px">${yr}</div>
                        <table style="width:100%;border-collapse:collapse;font-size:12px">
                            <tr><td style="padding:2px 0;color:#15803d;width:70px;font-weight:600">&#10003; Donated</td><td style="padding:2px 0;color:#166534">${paidLabels}</td></tr>
                            ${hasDue ? `<tr><td style="padding:2px 0;color:#c2410c;width:70px;font-weight:600">&#9679; Due</td><td style="padding:2px 0;color:#9a3412">${dueLabels}</td></tr>` : ''}
                        </table>
                    </div>`;
                }).join('');

                let periodString = 'Months Passed';
                if (settings && settings.collectionYears && settings.collectionYears.length > 0) {
                    const sortedYears = [...settings.collectionYears].sort();
                    const firstYear = sortedYears[0];
                    const firstMonthArr = settings.collectionMonths?.[firstYear] || [1];
                    const firstMonth = Math.min(...firstMonthArr);
                    const firstMonthName = new Date(2000, firstMonth - 1, 1).toLocaleString('en-US', { month: 'short' });
                    periodString = `From ${firstMonthName} ${firstYear} to Present`;
                }

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

                                <div style="margin:24px 0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
                                    <div style="background:linear-gradient(135deg,#1e3a8a 0%,#0f766e 100%);padding:11px 18px">
                                        <span style="color:#fff;font-weight:700;font-size:14px;letter-spacing:0.3px">Account Summary</span>
                                    </div>
                                    <div style="background:#f8fafc;padding:14px 18px;border-bottom:1px solid #e2e8f0">
                                        <div style="font-size:11px;color:#64748b;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.2px;text-align:center">${periodString}</div><table style="width:100%;border-collapse:collapse"><tr>
                                            <td style="width:33%;padding:0 5px 0 0"><div style="text-align:center;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 6px"><div style="font-size:18px;font-weight:800;color:#334155">${totalPassedMonths} <span style="font-size:12px;font-weight:600">Months</span></div><div style="font-size:10px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:0.2px">Passed</div></div></td>
                                            <td style="width:33%;padding:0 5px"><div style="text-align:center;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 6px"><div style="font-size:18px;font-weight:800;color:#15803d">${paidMonthsCount} <span style="font-size:12px;font-weight:600">Months</span></div><div style="font-size:10px;color:#16a34a;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Donated</div></div></td>
                                            <td style="width:33%;padding:0 0 0 5px"><div style="text-align:center;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 6px"><div style="font-size:18px;font-weight:800;color:#c2410c">${monthsDue} <span style="font-size:12px;font-weight:600">Months</span></div><div style="font-size:10px;color:#ea580c;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Due</div></div></td>
                                        </tr></table>
                                    </div>
                                    ${yearGridHtml}
                                </div>

                                <p style="font-size:13px;color:#6b7280">Green months are already donated. Orange months are gently waiting for your contribution. You can pay for multiple months at once when you are ready.</p>
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
