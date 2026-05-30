import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { format } from 'date-fns';

const parseDate = (d: any): Date => {
    if (!d) return new Date();
    if (d.toDate) return d.toDate();
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
};

// Safely loads a remote image URL to a transparent Data URL using fetch and FileReader, resolving CORS and caching issues
const loadLogoImage = async (url: string): Promise<string> => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    
    try {
        // Add cache-buster to prevent browser CORS cache issues
        const cleanUrl = url.includes('?') ? `${url}&_cb=${Date.now()}` : `${url}?_cb=${Date.now()}`;
        const res = await fetch(cleanUrl, { mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const blob = await res.blob();
        
        return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result as string);
            };
            reader.onerror = () => {
                resolve('');
            };
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Failed to load logo via fetch/FileReader, trying canvas fallback:", e);
        // Robust fallback using traditional HTMLImageElement + Canvas
        return new Promise((resolve) => {
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
                } catch (err) {
                    console.error("Canvas fallback conversion failed:", err);
                }
                resolve('');
            };
            img.onerror = (err) => {
                console.error("Canvas image fallback load failed:", err);
                resolve('');
            };
            // Add cache-buster to avoid browser CORS caching bugs in fallback
            img.src = url.includes('?') ? `${url}&_cb=${Date.now()}` : `${url}?_cb=${Date.now()}`;
        });
    }
};

/**
 * Renders text on jsPDF. If it contains non-ASCII characters (like Bangla script),
 * it dynamically rasterizes it onto a high-DPI canvas using system fonts and embeds
 * it cleanly as a crisp PNG, ensuring perfect Unicode support and zero layout overlap.
 * 
 * Returns the height in millimeters consumed by the text block.
 */
const renderUnicodeText = (
    doc: jsPDF, 
    text: string, 
    x: number, 
    y: number, 
    fontSize: number, 
    isBold: boolean, 
    textColor: string, 
    maxPageWidthMm: number = 180
): number => {
    if (!text) return 0;
    
    // If text only contains standard ASCII characters, use native jsPDF text (crisp vector)
    const isASCII = !/[^\x00-\x7F]/.test(text);
    if (isASCII) {
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setFontSize(fontSize);
        const hexColor = textColor.startsWith('#') ? textColor : '#000000';
        // Parse hex to RGB
        const r = parseInt(hexColor.slice(1, 3), 16) || 0;
        const g = parseInt(hexColor.slice(3, 5), 16) || 0;
        const b = parseInt(hexColor.slice(5, 7), 16) || 0;
        doc.setTextColor(r, g, b);
        
        const split = doc.splitTextToSize(text, maxPageWidthMm);
        doc.text(split, x, y + fontSize * 0.25); // Minor alignment adjustment
        return split.length * (fontSize * 0.3527 * 1.25); // height in mm
    }

    // Otherwise, render dynamically via Canvas to support Unicode (e.g. Bangla) perfectly!
    try {
        const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
        if (!canvas) throw new Error("Document/Canvas is not available");
        
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Failed to get 2D context");

        const scale = 5; // Very high DPI scale for super-crisp rendering when printed
        const canvasFont = `${isBold ? 'bold ' : ''}${fontSize * scale}px "Segoe UI", Arial, "SolaimanLipi", "Nikosh", sans-serif`;
        ctx.font = canvasFont;

        // Newline-aware word wrapping algorithm inside canvas
        const rawLines = text.split(/\r?\n/);
        const lines: string[] = [];
        
        // Max width in pixels (1 mm = 3.7795 px)
        const maxPx = Math.ceil(maxPageWidthMm * 3.7795 * scale);

        for (const rawLine of rawLines) {
            const words = rawLine.split(' ');
            let currentLine = '';
            for (let i = 0; i < words.length; i++) {
                const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
                const testWidth = ctx.measureText(testLine).width;
                if (testWidth > maxPx && i > 0) {
                    lines.push(currentLine);
                    currentLine = words[i];
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) {
                lines.push(currentLine);
            } else if (rawLine === '') {
                lines.push('');
            }
        }

        // Height of each line in pixels (line height = 1.35)
        const lineHeightPx = fontSize * 1.35 * scale;
        const padding = Math.ceil(15 * (fontSize / 10)); // Scale padding based on font size

        // Set canvas dimensions with integer values
        canvas.width = Math.ceil(maxPx + padding * 2);
        canvas.height = Math.ceil(lines.length * lineHeightPx + padding * 2);

        // Re-apply font context after resizing canvas
        ctx.font = canvasFont;
        ctx.textBaseline = 'top';
        ctx.fillStyle = textColor;

        // Premium anti-aliasing settings
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw text lines
        lines.forEach((line, index) => {
            ctx.fillText(line, padding, padding + index * lineHeightPx);
        });

        // Map dimensions back to mm
        const wMm = maxPageWidthMm + (padding * 2) / (3.7795 * scale);
        const hMm = canvas.height / (3.7795 * scale);

        // Render canvas element directly onto PDF document
        doc.addImage(canvas, 'PNG', x - (padding) / (3.7795 * scale), y - 2, wMm, hMm);

        return hMm - 2; // Return actual height consumed in mm
    } catch (e) {
        console.error("Failed to render Unicode text via Canvas, falling back to doc.text:", e);
        // Safe fallback using Helvetica
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setFontSize(fontSize);
        const hexColor = textColor.startsWith('#') ? textColor : '#000000';
        const r = parseInt(hexColor.slice(1, 3), 16) || 0;
        const g = parseInt(hexColor.slice(3, 5), 16) || 0;
        const b = parseInt(hexColor.slice(5, 7), 16) || 0;
        doc.setTextColor(r, g, b);
        
        const split = doc.splitTextToSize(text, maxPageWidthMm);
        doc.text(split, x, y + fontSize * 0.25);
        return split.length * (fontSize * 0.3527 * 1.25);
    }
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
    /**
     * Generates a beautifully styled Donation Receipt PDF instance.
     * Exposed as a public method so other pages can generate it for email attachments, etc.
     */
    generateDonationReceipt: async (payment: any): Promise<jsPDF> => {
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

        // Fetch dynamic organization logo fresh from Firestore
        let orgLogoURL = '';
        try {
            const { db } = await import('@/lib/firebase');
            const { doc: fsDoc, getDoc: fsGetDoc } = await import('firebase/firestore');
            const settingsSnap = await fsGetDoc(fsDoc(db, 'system_settings', 'general'));
            if (settingsSnap.exists()) {
                orgLogoURL = settingsSnap.data().orgLogoURL || '';
            }
        } catch (err) {
            console.error("Failed to fetch settings logo from Firestore:", err);
        }

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

        // Column 1: Receipt Details
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('RECEIPT DETAILS', 15, 55);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);
        
        let detailY = 62;
        const drawDetailRow = (label: string, value: string) => {
            doc.setFont('helvetica', 'bold');
            doc.text(`${label}:`, 15, detailY);
            doc.setFont('helvetica', 'normal');
            doc.text(value, 55, detailY);
            detailY += 7;
        };

        const formatMethod = (m: string) => {
            if (!m || m.trim() === '' || m.toLowerCase() === 'manual admin entry') return 'Cash / Not Applicable';
            const lower = m.toLowerCase();
            if (lower === 'bkash') return 'bKash';
            if (lower === 'nagad') return 'Nagad';
            if (lower === 'dbbl') return 'DBBL / Rocket';
            if (lower === 'cash') return 'Cash';
            if (lower === 'bank') return 'Bank Transfer';
            return m.charAt(0).toUpperCase() + m.slice(1);
        };

        drawDetailRow('Receipt No', receiptCode);
        drawDetailRow('Payment Date', format(paymentDate, 'MMMM d, yyyy h:mm a'));
        drawDetailRow('Payment Method', formatMethod(payment.method));
        if (payment.transactionId && payment.transactionId !== "Manual Admin Entry") {
            drawDetailRow('Trx ID', payment.transactionId);
        }
        
        // --- DYNAMIC MULTI-MONTH RESOLUTION ---
        let paidMonths: number[] = [];
        let paymentYear = payment.year || new Date().getFullYear();
        let amountBreakdown: { [month: number]: number } = {};
        let isMultiMonth = false;

        // Try to fetch related batch/session payments from Firestore first to get exact allocations
        let paymentsInBatch: any[] = [];
        try {
            const { db } = await import('@/lib/firebase');
            const { collection: fsCol, query: fsQuery, where: fsWhere, getDocs: fsGetDocs } = await import('firebase/firestore');
            
            let q;
            if (payment.batchId) {
                q = fsQuery(fsCol(db, 'payments'), fsWhere('batchId', '==', payment.batchId));
            } else if (payment.transactionId && payment.transactionId !== "Manual Admin Entry" && payment.transactionId !== "") {
                q = fsQuery(fsCol(db, 'payments'), fsWhere('transactionId', '==', payment.transactionId), fsWhere('userId', '==', payment.userId));
            } else if (payment.userId) {
                // Group by proximity in time (same user, monthly, same year)
                q = fsQuery(
                    fsCol(db, 'payments'),
                    fsWhere('userId', '==', payment.userId),
                    fsWhere('type', '==', 'monthly'),
                    fsWhere('year', '==', Number(paymentYear))
                );
            }
            
            if (q) {
                const snap = await fsGetDocs(q);
                const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
                if (payment.batchId || (payment.transactionId && payment.transactionId !== "Manual Admin Entry" && payment.transactionId !== "")) {
                    paymentsInBatch = fetched;
                } else {
                    const targetTime = parseDate(payment.createdAt || payment.date).getTime();
                    paymentsInBatch = fetched.filter(p => {
                        const pTime = parseDate(p.createdAt || p.date).getTime();
                        return Math.abs(pTime - targetTime) <= 5000; // 5 seconds
                    });
                }
            }
        } catch (err) {
            console.error("Failed to fetch related payments in batch:", err);
        }

        if (paymentsInBatch.length > 1) {
            isMultiMonth = true;
            paidMonths = paymentsInBatch.map(p => p.month).filter(m => m !== undefined).sort((a, b) => a - b);
            paymentsInBatch.forEach(p => {
                amountBreakdown[p.month] = Number(p.amount);
            });
            payment.amount = paymentsInBatch.reduce((sum, p) => sum + Number(p.amount), 0);
        } else if (Array.isArray(payment.months) && payment.months.length > 0) {
            // Fallback: use passed months list and split amount equally
            paidMonths = [...payment.months].sort((a, b) => a - b);
            isMultiMonth = paidMonths.length > 1;
            const amountPerMonth = Number(payment.amount) / paidMonths.length;
            paidMonths.forEach(m => {
                amountBreakdown[m] = amountPerMonth;
            });
        } else {
            // Single month default
            paidMonths = [payment.month || new Date().getMonth() + 1];
            amountBreakdown[paidMonths[0]] = Number(payment.amount);
        }


        // Subscription type details
        let typeStr = '';
        if (payment.type === 'one-time') {
            typeStr = 'One-time General Contribution';
        } else {
            const monthNames = paidMonths.map(m => format(new Date(2000, m - 1, 1), 'MMMM')).join(', ');
            typeStr = `Monthly Subscription (${monthNames} ${paymentYear})`;
        }
        
        // Donation Type text draw using renderUnicodeText for safety
        doc.setFont('helvetica', 'bold');
        doc.text(`Donation Type:`, 15, detailY);
        renderUnicodeText(doc, typeStr, 55, detailY - 3, 9.5, false, '#475569', 55);

        // Column 2: Donor Info
        let yCol2 = 55;
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('DONOR INFORMATION', 115, yCol2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);
        
        doc.setFont('helvetica', 'bold');
        doc.text(`Name:`, 115, yCol2 + 7);
        // Donor Name render using renderUnicodeText to perfectly support Unicode (Bangla)
        renderUnicodeText(doc, payment.memberName || 'Guest Donor', 130, yCol2 + 4, 9.5, false, '#475569', 65);
        
        doc.setFont('helvetica', 'bold');
        doc.text(`Status:`, 115, yCol2 + 14);
        doc.setFont('helvetica', 'normal');
        doc.text(`Verified & Approved`, 130, yCol2 + 14);

        // Draw QR Code
        if (qrDataUrl) {
            doc.addImage(qrDataUrl, 'PNG', 145, 80, 42, 42);
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text('Scan with phone to verify authenticity online', 139, 125);
        }

        // --- MULTI-MONTH BREAKDOWN TABLE ---
        let breakdownHeight = 0;
        if (payment.type === 'monthly' && isMultiMonth) {
            const tableY = 95;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(10, 37, 64);
            doc.text('MONTH-BY-MONTH BREAKDOWN', 15, tableY);

            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(15, tableY + 2, 115, tableY + 2); // Thin horizontal line for header

            // Header row
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(71, 85, 105);
            doc.text('Month / Period', 18, tableY + 6);
            doc.text('Amount', 95, tableY + 6);
            
            doc.line(15, tableY + 8, 115, tableY + 8);

            // Group consecutive months with identical amounts to compress vertical space
            const groupedRanges: { startMonth: number; endMonth: number; amountPerMonth: number }[] = [];
            if (paidMonths.length > 0) {
                let currentRange = {
                    startMonth: paidMonths[0],
                    endMonth: paidMonths[0],
                    amountPerMonth: amountBreakdown[paidMonths[0]] || 0
                };
                
                for (let i = 1; i < paidMonths.length; i++) {
                    const m = paidMonths[i];
                    const amt = amountBreakdown[m] || 0;
                    if (m === currentRange.endMonth + 1 && amt === currentRange.amountPerMonth) {
                        currentRange.endMonth = m;
                    } else {
                        groupedRanges.push(currentRange);
                        currentRange = {
                            startMonth: m,
                            endMonth: m,
                            amountPerMonth: amt
                        };
                    }
                }
                groupedRanges.push(currentRange);
            }

            let rowY = tableY + 12;
            groupedRanges.forEach(range => {
                let periodText = '';
                let amountText = '';
                
                if (range.startMonth === range.endMonth) {
                    const monthName = format(new Date(2000, range.startMonth - 1, 1), 'MMMM');
                    periodText = `${monthName} ${paymentYear}`;
                    amountText = `TK ${range.amountPerMonth.toLocaleString()}`;
                } else {
                    const startMonthName = format(new Date(2000, range.startMonth - 1, 1), 'MMMM');
                    const endMonthName = format(new Date(2000, range.endMonth - 1, 1), 'MMMM');
                    periodText = `${startMonthName} to ${endMonthName} ${paymentYear}`;
                    
                    const count = range.endMonth - range.startMonth + 1;
                    amountText = `TK ${range.amountPerMonth.toLocaleString()} * ${count}`;
                }

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8.5);
                doc.setTextColor(71, 85, 105);
                doc.text(periodText, 18, rowY);
                
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(22, 163, 74); // Green
                doc.text(amountText, 95, rowY);

                doc.line(15, rowY + 2, 115, rowY + 2);
                rowY += 6;
            });
            
            breakdownHeight = rowY - tableY;
        }

        // Adjust Y positions dynamically based on breakdown table height
        const amountBoxY = Math.max(133, 90 + breakdownHeight + 10);

        // --- AMOUNT CONTENT BOX ---
        doc.setFillColor(240, 246, 255); // Soft blue background
        doc.setDrawColor(14, 165, 233);  // Sky blue border
        doc.setLineWidth(0.5);
        doc.rect(15, amountBoxY, 180, 24, 'FD');

        doc.setTextColor(10, 37, 64);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('TOTAL AMOUNT RECEIVED:', 20, amountBoxY + 9);
        
        doc.setFontSize(16);
        doc.setTextColor(22, 163, 74); // Vibrant Green
        doc.text(`TK ${Number(payment.amount).toLocaleString('en-IN')}.00 BDT`, 20, amountBoxY + 17);

        // --- THANK YOU / STATEMENT SECTION ---
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text('Thank you for your generous support!', 15, amountBoxY + 39);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);
        
        const termsText = [
            'Your contribution directly supports our mission to provide educational resources, physical facilities,',
            'and essential welfare support to underprivileged communities. Every contribution acts as a stepping stone',
            'towards a brighter and more equitable society.'
        ];
        
        let termY = amountBoxY + 45;
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
        doc.text('Email: info@rangdhanu.org | Web: www.rangdhanu.org', 68, 282);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(10, 37, 64);
        doc.text('This is a computer generated, authenticated document.', 67, 289);

        return doc;
    },

    exportDonationReceipt: async (payment: any) => {
        const paymentDate = parseDate(payment.date || payment.createdAt);
        const receiptCode = ReceiptService.getDonationCode(payment.id, paymentDate);
        const doc = await ReceiptService.generateDonationReceipt(payment);
        doc.save(`receipt_${receiptCode.toLowerCase()}.pdf`);
    },

    /**
     * Generates a beautifully styled Expenditure Payment Slip PDF with a QR code for verification.
     */
    exportExpenseSlip: async (expense: any) => {
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

        // Fetch dynamic organization logo fresh from Firestore
        let orgLogoURL = '';
        try {
            const { db } = await import('@/lib/firebase');
            const { doc: fsDoc, getDoc: fsGetDoc } = await import('firebase/firestore');
            const settingsSnap = await fsGetDoc(fsDoc(db, 'system_settings', 'general'));
            if (settingsSnap.exists()) {
                orgLogoURL = settingsSnap.data().orgLogoURL || '';
            }
        } catch (err) {
            console.error("Failed to fetch settings logo from Firestore:", err);
        }

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

        // Disbursement Title rendered using renderUnicodeText to perfectly support Unicode (Bangla)
        const titleHeight = renderUnicodeText(
            doc, 
            expense.title || 'Untitled Expense', 
            15, 
            114, 
            12, 
            true, 
            '#1E293B', 
            180
        );

        // Notes / Remarks Section rendered dynamically below Title
        let memoHeight = 0;
        if (expense.notes) {
            const memoStartY = 115 + titleHeight;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.setTextColor(15, 23, 42);
            doc.text('MEMO / REMARKS:', 15, memoStartY);
            
            const notesHeight = renderUnicodeText(
                doc, 
                expense.notes, 
                15, 
                memoStartY + 5, 
                9, 
                false, 
                '#475569', 
                180
            );
            memoHeight = notesHeight + 10;
        }

        // Adjust starting Y of Amount box dynamically based on content heights
        const amountBoxY = Math.max(136, 116 + titleHeight + memoHeight);

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
