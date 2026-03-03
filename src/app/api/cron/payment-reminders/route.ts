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
                // Member owes dues - dispatch reminder
                const mailOptions = {
                    from: `"${process.env.NEXT_PUBLIC_SITE_NAME || 'Rangdhanu Charity'}" <${process.env.ZOHO_EMAIL_USER}>`,
                    to: user.email,
                    subject: "Payment Reminder - Rangdhanu Charity",
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                            <h2>Donation Reminder</h2>
                            <p>Dear ${user.name || user.username || 'Member'},</p>
                            <p>This is a friendly and automated reminder that you currently have <strong>${monthsDue} month(s)</strong> due in your monthly subscription to Rangdhanu Charity.</p>
                            <div style="background-color: #fcf8e3; padding: 15px; border-radius: 8px; border: 1px solid #faebcc; margin: 20px 0;">
                                <h3 style="margin-top: 0; color: #8a6d3b;">Action Required</h3>
                                <p style="margin: 5px 0;">Please log into the platform at your earliest convenience to process your outstanding balance via the "Donate Now" functionality.</p>
                            </div>
                            <p>If you've already made this payment or you believe this to be a mistake, please disregard this email or contact an administrator.</p>
                            <p>Thank you for continuously supporting our cause!</p>
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
