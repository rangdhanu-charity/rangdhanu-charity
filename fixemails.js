const fs = require('fs');

const files = [
    'src/app/admin/collections/page.tsx',
    'src/app/admin/requests/page.tsx',
    'src/app/api/cron/payment-reminders/route.ts'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // 1. Hook up the dynamic period string generator logic
    // We'll insert it right before the account summary HTML is generated.
    // In collections: before `<div style="margin:24px 0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">`
    const periodLogic = `
                                                    let periodString = 'Months Passed';
                                                    if (settings && settings.collectionYears && settings.collectionYears.length > 0) {
                                                        const sortedYears = [...settings.collectionYears].sort();
                                                        const firstYear = sortedYears[0];
                                                        const firstMonthArr = settings.collectionMonths?.[firstYear] || [1];
                                                        const firstMonth = Math.min(...firstMonthArr);
                                                        const firstMonthName = new Date(2000, firstMonth - 1, 1).toLocaleString('en-US', { month: 'short' });
                                                        periodString = \`From \${firstMonthName} \${firstYear} to Present\`;
                                                    }
    `;

    // 2. Fix the "relevantMonths" filter
    // Old:
    // const rel = yr < _cy ? am : yr === _cy ? am.filter((m) => m <= _cm) : [];
    // OR
    // const relevant = yr < currentYearLocal ? activeMonths : yr === currentYearLocal ? activeMonths.filter((m: number) => m <= currentMonthLocal) : [];
    // New:
    // const relevant = activeMonths.filter(m => { const isPast = (yr < currentYearLocal) || (yr === currentYearLocal && m <= currentMonthLocal); return isPast || paidMonthsSet.has(m + '-' + yr); });


    // We will do a generic regex replace for the relevant filter
    // collections page:
    content = content.replace(
        /const relevantMonths = yr < currentYearLocal[\s\S]*?: \[\];/,
        `const relevantMonths = activeMonths.filter((m: number) => {
                                                            const isPast = (yr < currentYearLocal) || (yr === currentYearLocal && m <= currentMonthLocal);
                                                            return isPast || paidMonthsSet.has(\`\${m}-\${yr}\`);
                                                        });`
    );

    // requests page:
    content = content.replace(
        /const relevant = yr < cYear[\s\S]*?: \[\];/,
        `const relevant = mons.filter((m: number) => {
                                    const isPast = (yr < cYear) || (yr === cYear && m <= cMonth);
                                    return isPast || paidSet.has(\`\${m}-\${yr}\`);
                                });`
    );

    // cron page
    content = content.replace(
        /const relevant = yr < currentYear[\s\S]*?: \[\];/,
        `const relevant = mons.filter((m: number) => {
                        const isPast = (yr < currentYear) || (yr === currentYear && m <= currentMonth);
                        return isPast || paidMonthsSet.has(\`\${m}-\${yr}\`);
                    });`
    );

    // Replace the text "Months Passed" in the first pill with the dynamic string
    // In collections & cron:
    // <div style="font-size:10px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Months Passed</div>
    // becomes:
    // <div style="font-size:9px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:0.2px">\${periodString}</div>

    // First, let's inject the periodLogic right before the HTML backtick starts.
    // For collections: it's inside `html: \`` but we need it before that. We can evaluate it inside the \${(() => { ... })()} block that builds the grid!
    // Wait, the pills are OUTSIDE the year grid builder. 
    // Collections page logic:
    if (file.includes('collections')) {
        // Find: mailOptions = { ... html: `
        // We'll calculate periodString right inside the `sendMail` try block or before it.
        content = content.replace(/const totalPaidMonthsCount = paidMonthsSet\.size;/, `const totalPaidMonthsCount = paidMonthsSet.size;
                                                let periodString = 'Months Passed';
                                                if (settings && settings.collectionYears && settings.collectionYears.length > 0) {
                                                    const sortedYears = [...settings.collectionYears].sort();
                                                    const firstYear = sortedYears[0];
                                                    const firstMonthArr = settings.collectionMonths?.[firstYear] || [1];
                                                    const firstMonth = Math.min(...firstMonthArr);
                                                    const firstMonthName = new Date(2000, firstMonth - 1, 1).toLocaleString('en-US', { month: 'short' });
                                                    periodString = \`From \${firstMonthName} \${firstYear} to Present\`;
                                                }`);
        content = content.replace(/<div style="font-size:10px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Months Passed<\/div>/,
            `<div style="font-size:9px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:0.2px">\${periodString}</div>`);
    }

    if (file.includes('requests')) {
        content = content.replace(/const totalPaidCount = paidSet\.size;/, `const totalPaidCount = paidSet.size;
                            let periodString = 'Months Passed';
                            if (sData && sData.collectionYears && sData.collectionYears.length > 0) {
                                const sortedYears = [...sData.collectionYears].sort();
                                const firstYear = sortedYears[0];
                                const firstMonthArr = sData.collectionMonths?.[firstYear] || [1];
                                const firstMonth = Math.min(...firstMonthArr);
                                const firstMonthName = new Date(2000, firstMonth - 1, 1).toLocaleString('en-US', { month: 'short' });
                                periodString = \`From \${firstMonthName} \${firstYear} to Present\`;
                            }`);
        content = content.replace(/<div style="font-size:10px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Months Passed<\/div>/,
            `<div style="font-size:9px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:0.2px">\${periodString}</div>`);
    }

    if (file.includes('payment-reminders')) {
        content = content.replace(/const paidMonthsCount = paidMonthsSet\.size;/, `const paidMonthsCount = paidMonthsSet.size;
                let periodString = 'Months Passed';
                if (settings && settings.collectionYears && settings.collectionYears.length > 0) {
                    const sortedYears = [...settings.collectionYears].sort();
                    const firstYear = sortedYears[0];
                    const firstMonthArr = settings.collectionMonths?.[firstYear] || [1];
                    const firstMonth = Math.min(...firstMonthArr);
                    const firstMonthName = new Date(2000, firstMonth - 1, 1).toLocaleString('en-US', { month: 'short' });
                    periodString = \`From \${firstMonthName} \${firstYear} to Present\`;
                }`);
        content = content.replace(/<div style="font-size:10px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Months Passed<\/div>/,
            `<div style="font-size:9px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:0.2px">\${periodString}</div>`);
    }

    fs.writeFileSync(file, content, 'utf8');
});

console.log("Done upgrading email grids for prepayments and dynamic dates.");
