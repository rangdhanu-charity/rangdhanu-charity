import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { format } from 'date-fns';

const parseDate = (d: any): Date => {
    if (!d) return new Date();
    if (d.toDate) return d.toDate();
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
};

// Safely loads a remote image URL to a transparent Data URL using Canvas, resolving CORS on-the-fly
const loadLogoImage = (url: string): Promise<string> => {
    return new Promise((resolve) => {
        if (!url) {
            resolve('');
            return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                    return;
                }
            } catch (e) {
                console.error("CORS or canvas error conversion:", e);
            }
            resolve('');
        };
        img.onerror = () => resolve('');
        img.src = url;
    });
};

export const ReceiptService = {
    /**
     * Generates a unique code for a donation receipt.
     */
    getDonationCode: (id: string, date: any): string => {
        const d = parseDate(date);
        const shortId = id ? id.toUpperCase().substring(0, 8) : 'TEMP';
        return `DON-${shortId}-${format(d, 'yyyyMMdd')}`;
    },

    /**
     * Generates a unique code for an expenditure payment slip.
     */
    getExpenseCode: (id: string, date: any): string => {
        const d = parseDate(date);
        const shortId = id ? id.toUpperCase().substring(0, 8) : 'TEMP';
        return `EXP-${shortId}-${format(d, 'yyyyMMdd')}`;
    },

    /**
     * Generates a beautifully styled Donation Receipt PDF with a QR code for verification.
     */
    exportDonationReceipt: async (payment: any, orgLogoURL?: string) => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const paymentDate = parseDate(payment.date || payment.createdAt);
        const receiptCode = ReceiptService.getDonationCode(payment.id, paymentDate);
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://rangdhanu.org';
        const verificationUrl = `${origin}/verify/receipt/${payment.id || 'invalid'}`;

        // Generate QR code data URL offline
        let qrDataUrl = '';
        try {
            qrDataUrl = await QRCode.toDataURL(verificationUrl, {
                width: 150,
                margin: 1,
                color: {
                    dark: '#0A2540', // Deep Blue matching brand
                    light: '#FFFFFF'
                }
            });
        } catch (err) {
            console.error('Failed to generate QR Code:', err);
        }

        // Fetch dynamic organization logo if provided
        const logoDataUrl = orgLogoURL ? await loadLogoImage(orgLogoURL) : '';

        // --- BRAND STYLING ---
        // Header Banner (Deep Blue)
        doc.setFillColor(10, 37, 64);
        doc.rect(0, 0, 210, 20, 'F');

        // Banner Logo
        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, 'PNG', 15, 3, 14, 14);
            } catch (err) {
                console.error("Failed to render logo image on PDF:", err);
            }
        }

        // Banner Text
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('RANGDHANU CHARITY FOUNDATION', logoDataUrl ? 33 : 15, 13);

        // Header Accent line (Warm Yellow)
        doc.setFillColor(255, 184, 0);
        doc.rect(0, 20, 210, 2, 'F');

        // --- DOCUMENT TITLE ---
        doc.setTextColor(10, 37, 64);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('DONATION RECEIPT', 15, 35);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text('Official receipt of contribution to educational and social development programs.', 15, 41);

        // Draw a separator line
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(15, 46, 195, 46);

        // --- TWO-COLUMN DETAILS SECTION ---
        doc.setTextColor(15, 23, 42);

        // Column 1: Receipt & Payment Details
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('RECEIPT DETAILS', 15, 55);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);
        
        let y = 62;
        const drawDetailRow = (label: string, value: string) => {
            doc.setFont('helvetica', 'bold');
            doc.text(`${label}:`, 15, y);
            doc.setFont('helvetica', 'normal');
            doc.text(value, 55, y);
            y += 7;
        };

        drawDetailRow('Receipt No', receiptCode);
        drawDetailRow('Payment Date', format(paymentDate, 'MMMM d, yyyy h:mm a'));
        drawDetailRow('Payment Method', (payment.method || 'Direct / Bank').toUpperCase());
        if (payment.transactionId) {
            drawDetailRow('Trx ID', payment.transactionId);
        }
        
        // Subscription type details
        const typeStr = payment.type === 'monthly' 
            ? `Monthly Subscription (${format(new Date(2000, (payment.month || 1) - 1, 1), 'MMMM')} ${payment.year || new Date().getFullYear()})`
            : 'One-time General Contribution';
        drawDetailRow('Donation Type', typeStr);

        // Column 2: Donor Info
        let yCol2 = 55;
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('DONOR INFORMATION', 115, yCol2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`Name: ${payment.memberName || 'Guest Donor'}`, 115, yCol2 + 7);
        doc.text(`Status: Verified & Approved`, 115, yCol2 + 14);

        // Draw QR Code
        if (qrDataUrl) {
            doc.addImage(qrDataUrl, 'PNG', 145, 80, 42, 42);
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text('Scan with phone to verify authenticity online', 139, 125);
        }

        // --- AMOUNT CONTENT BOX ---
        doc.setFillColor(240, 246, 255); // Soft blue background
        doc.setDrawColor(14, 165, 233);  // Sky blue border
        doc.setLineWidth(0.5);
        doc.rect(15, 133, 180, 24, 'FD');

        doc.setTextColor(10, 37, 64);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('TOTAL AMOUNT RECEIVED:', 20, 142);
        
        doc.setFontSize(16);
        doc.setTextColor(22, 163, 74); // Vibrant Green
        doc.text(`TK ${Number(payment.amount).toLocaleString('en-IN')}.00 BDT`, 20, 150);

        // --- THANK YOU / STATEMENT SECTION ---
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text('Thank you for your generous support!', 15, 172);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);
        
        const termsText = [
            'Your contribution directly supports our mission to provide educational resources, physical facilities,',
            'and essential welfare support to underprivileged communities. Every contribution acts as a stepping stone',
            'towards a brighter and more equitable society.'
        ];
        
        let termY = 178;
        termsText.forEach(line => {
            doc.text(line, 15, termY);
            termY += 5;
        });

        // --- SIGNATURES ---
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.5);
        doc.line(130, 240, 195, 240);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text('Authorized Signature', 143, 245);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Rangdhanu Charity Foundation', 141, 249);

        // Placeholder Signature Logo / Initials
        doc.setTextColor(14, 165, 233);
        doc.setFont('courier', 'italic');
        doc.setFontSize(14);
        doc.text('Rangdhanu', 146, 235);

        // --- FOOTER ---
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 270, 210, 27, 'F');
        
        doc.setDrawColor(226, 232, 240);
        doc.line(0, 270, 210, 270);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Rangdhanu Charity Foundation. Registered Welfare Trust.', 65, 277);
        doc.text('Email: info@rangdhanu.org | Web: www.rangdhanu.org', 66, 282);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(10, 37, 64);
        doc.text('This is a computer generated, authenticated document.', 67, 289);

        // Save PDF
        doc.save(`receipt_${receiptCode.toLowerCase()}.pdf`);
    },

    /**
     * Generates a beautifully styled Expenditure Payment Slip PDF with a QR code for verification.
     */
    exportExpenseSlip: async (expense: any, orgLogoURL?: string) => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const expenseDate = parseDate(expense.date || expense.createdAt);
        const expenseCode = ReceiptService.getExpenseCode(expense.id, expenseDate);
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://rangdhanu.org';
        const verificationUrl = `${origin}/verify/expense/${expense.id || 'invalid'}`;

        // Generate QR code data URL offline
        let qrDataUrl = '';
        try {
            qrDataUrl = await QRCode.toDataURL(verificationUrl, {
                width: 150,
                margin: 1,
                color: {
                    dark: '#1E293B', // Charcoal Slate color
                    light: '#FFFFFF'
                }
            });
        } catch (err) {
            console.error('Failed to generate QR Code:', err);
        }

        // Fetch dynamic organization logo if provided
        const logoDataUrl = orgLogoURL ? await loadLogoImage(orgLogoURL) : '';

        // --- BRAND STYLING ---
        // Header Banner (Charcoal slate)
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, 210, 20, 'F');

        // Banner Logo
        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, 'PNG', 15, 3, 14, 14);
            } catch (err) {
                console.error("Failed to render logo image on PDF:", err);
            }
        }

        // Banner Text
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('RANGDHANU CHARITY FOUNDATION', logoDataUrl ? 33 : 15, 13);

        // Header Accent line (Red/Crimson for outflow)
        doc.setFillColor(239, 68, 68);
        doc.rect(0, 20, 210, 2, 'F');

        // --- DOCUMENT TITLE ---
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('EXPENDITURE PAYMENT SLIP', 15, 35);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text('Official record of fund utilization and disbursements.', 15, 41);

        // Draw a separator line
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(15, 46, 195, 46);

        // --- DETAILS SECTION (Clean Parallel Layout) ---
        doc.setTextColor(15, 23, 42);

        // Left Side: Slip Details
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('VOUCHER DETAILS', 15, 55);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);
        
        let y = 62;
        const drawDetailRow = (label: string, value: string) => {
            doc.setFont('helvetica', 'bold');
            doc.text(`${label}:`, 15, y);
            doc.setFont('helvetica', 'normal');
            doc.text(value, 55, y);
            y += 7;
        };

        drawDetailRow('Slip Number', expenseCode);
        drawDetailRow('Voucher Date', format(expenseDate, 'MMMM d, yyyy h:mm a'));
        drawDetailRow('Category', (expense.category || 'Operational').toUpperCase());
        drawDetailRow('Recorded By', expense.recordedBy || 'Admin');

        // Right Side: QR Code (Perfect header balance!)
        if (qrDataUrl) {
            doc.addImage(qrDataUrl, 'PNG', 145, 52, 40, 40);
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text('Scan with phone to verify transparency online', 139, 95);
        }

        // Draw a thin separator line below details
        doc.setDrawColor(241, 245, 249);
        doc.line(15, 100, 195, 100);

        // --- DISBURSEMENT TITLE & PURPOSE (Full-width Block Layout) ---
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('DISBURSEMENT PURPOSE & DESCRIPTION', 15, 107);

        // Disbursement Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        const splitTitle = doc.splitTextToSize(expense.title || 'Untitled Expense', 180);
        doc.text(splitTitle, 15, 114);

        // Calculate offset based on split lines to prevent overlap with amount box
        const titleLines = splitTitle.length;
        const titleOffset = titleLines * 5.5;

        // Notes / Memo Section (Centered Full Width)
        let memoHeight = 0;
        if (expense.notes) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.setTextColor(15, 23, 42);
            doc.text('MEMO / REMARKS:', 15, 115 + titleOffset);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);
            const splitNotes = doc.splitTextToSize(expense.notes, 180);
            doc.text(splitNotes, 15, 121 + titleOffset);
            memoHeight = splitNotes.length * 4.8 + 8;
        }

        // Adjust starting Y of Amount box dynamically based on content heights
        const amountBoxY = Math.max(136, 122 + titleOffset + memoHeight);

        // --- AMOUNT CONTENT BOX ---
        doc.setFillColor(254, 242, 242); // Soft red background
        doc.setDrawColor(239, 68, 68);   // Red border
        doc.setLineWidth(0.5);
        doc.rect(15, amountBoxY, 180, 24, 'FD');

        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('TOTAL AMOUNT DISBURSED:', 20, amountBoxY + 9);
        
        doc.setFontSize(16);
        doc.setTextColor(220, 38, 38); // Vibrant Red
        doc.text(`TK ${Number(expense.amount).toLocaleString('en-IN')}.00 BDT`, 20, amountBoxY + 17);

        // --- REGULATORY STATEMENT SECTION ---
        const stmtStartY = amountBoxY + 33;
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text('Transparency & Accountability Declaration', 15, stmtStartY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);
        
        const statementText = [
            'This expense voucher has been recorded in compliance with the financial transparency protocols of',
            'Rangdhanu Charity Foundation. All disbursements are subjected to periodic internal audits and',
            'are publicly viewable on our website under our transparency portal.'
        ];
        
        let stmtY = stmtStartY + 6;
        statementText.forEach(line => {
            doc.text(line, 15, stmtY);
            stmtY += 5;
        });

        // --- DOUBLE SIGNATURES ---
        // Signature 1: Prepared By
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.5);
        doc.line(15, 240, 80, 240);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text('Prepared By', 38, 245);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(expense.recordedBy || 'Admin', 42, 249);

        // Signature 2: Approved By
        doc.line(130, 240, 195, 240);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text('Approved By', 153, 245);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Finance Committee', 143, 249);

        // --- FOOTER ---
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 270, 210, 27, 'F');
        
        doc.setDrawColor(226, 232, 240);
        doc.line(0, 270, 210, 270);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Rangdhanu Charity Foundation. Registered Welfare Trust.', 65, 277);
        doc.text('Email: info@rangdhanu.org | Web: www.rangdhanu.org', 68, 282);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Official and Auditable Electronic Record.', 77, 289);

        // Save PDF
        doc.save(`voucher_${expenseCode.toLowerCase()}.pdf`);
    }
};
