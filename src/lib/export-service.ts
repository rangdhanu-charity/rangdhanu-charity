import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export const ExportService = {
    // --- EXCEL EXPORTS ---

    exportToExcel: (data: any[], fileName: string, sheetName: string = "Data") => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
    },

    // --- PDF EXPORTS ---

    exportFinancialSummaryPDF: (title: string, data: any[], summary: any) => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text(title, 14, 22);
        doc.setFontSize(11);
        doc.text(`Generated on: ${format(new Date(), "PPpp")}`, 14, 30);

        // Summary Box
        doc.setDrawColor(0);
        doc.setFillColor(240, 240, 240);
        doc.rect(14, 35, 180, 25, 'F');
        doc.setFontSize(10);
        doc.text(`Total Income: ${summary.income}`, 20, 45);
        doc.text(`Total Expenses: ${summary.expenses}`, 20, 52);
        doc.text(`Net Balance: ${summary.balance}`, 100, 45);

        // Table
        autoTable(doc, {
            startY: 65,
            head: [['Date', 'Description', 'Type', 'Amount', 'Status']],
            body: data.map(item => [
                item.date,
                item.description,
                item.type,
                item.amount,
                item.status || '-'
            ]),
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });

        doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
    },

    exportMemberRecordsPDF: (members: any[], payments: any[]) => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Member Financial Report", 14, 22);

        let yPos = 30;

        members.forEach((member, index) => {
            if (index > 0) {
                doc.addPage();
                yPos = 30;
            }

            const memberPayments = payments.filter(p => p.userId === member.id);
            const totalPaid = memberPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

            doc.setFontSize(14);
            doc.text(`Member: ${member.name || member.username}`, 14, yPos);
            doc.setFontSize(10);
            doc.text(`Email: ${member.email || '-'} | Phone: ${member.phone || '-'}`, 14, yPos + 6);
            doc.text(`Total Contributed: ${totalPaid}`, 14, yPos + 12);

            autoTable(doc, {
                startY: yPos + 20,
                head: [['Date', 'Trx ID', 'Type', 'Amount', 'Notes']],
                body: memberPayments.map(p => [
                    format(p.date?.toDate ? p.date.toDate() : new Date(p.date), "MMM d, yyyy"),
                    p.transactionId || '-',
                    p.type === 'monthly' ? `Monthly (${p.year}-${p.month})` : 'One-time',
                    p.amount,
                    p.notes || '-'
                ]),
                styles: { fontSize: 9, cellPadding: 4 },
                headStyles: { fillColor: [46, 204, 113], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [245, 245, 245] }
            });
        });

        doc.save("member_financial_records.pdf");
    },

    exportCollectionMatrixExcel: (users: any[], payments: any[], settings: any) => {
        const data: any[] = [];
        const currentYear = new Date().getFullYear();
        const years = settings?.collectionYears || [currentYear];

        users.forEach(user => {
            const row: any = {
                Name: user.name || user.username,
                Email: user.email,
                Phone: user.phone || '-'
            };

            years.forEach((yr: number) => {
                const months = settings?.collectionMonths?.[yr] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                months.forEach((m: number) => {
                    const monthName = new Date(0, m - 1).toLocaleString('default', { month: 'short' });
                    // Handle duplicate payments natively by reducing
                    const monthPayments = payments.filter(p => p.userId === user.id && p.type === 'monthly' && p.year === yr && p.month === m);
                    const amountPaid = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
                    const targetAmount = settings?.donationAmount || 500;

                    if (amountPaid >= targetAmount) {
                        row[`${monthName} ${yr}`] = "Paid";
                    } else if (amountPaid > 0) {
                        row[`${monthName} ${yr}`] = `Partial (${amountPaid})`;
                    } else {
                        row[`${monthName} ${yr}`] = "Due";
                    }
                });
            });

            data.push(row);
        });

        ExportService.exportToExcel(data, "Collection_Matrix", "Matrix");
    }
};
