const fs = require('fs');

// New compact professional account status HTML fragment (collections page style)
// Uses 3 stat pills + year/row list style
function buildNewStatusBlock(vars) {
    // vars = { passed, paid, due, yearGrid }
    return `
                                            <div style="margin:24px 0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
                                                <div style="background:linear-gradient(135deg,#1e3a8a 0%,#0f766e 100%);padding:11px 18px">
                                                    <span style="color:#fff;font-weight:700;font-size:14px;letter-spacing:0.3px">Account Summary</span>
                                                </div>
                                                <div style="background:#f8fafc;padding:14px 18px;border-bottom:1px solid #e2e8f0">
                                                    <table style="width:100%;border-collapse:collapse"><tr>
                                                        <td style="width:33%;padding:0 5px 0 0">
                                                            <div style="text-align:center;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 6px">
                                                                <div style="font-size:22px;font-weight:800;color:#334155">${vars.passed}</div>
                                                                <div style="font-size:10px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Months Passed</div>
                                                            </div>
                                                        </td>
                                                        <td style="width:33%;padding:0 5px">
                                                            <div style="text-align:center;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 6px">
                                                                <div style="font-size:22px;font-weight:800;color:#15803d">${vars.paid}</div>
                                                                <div style="font-size:10px;color:#16a34a;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Donated</div>
                                                            </div>
                                                        </td>
                                                        <td style="width:33%;padding:0 0 0 5px">
                                                            <div style="text-align:center;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 6px">
                                                                <div style="font-size:22px;font-weight:800;color:#c2410c">${vars.due}</div>
                                                                <div style="font-size:10px;color:#ea580c;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Due</div>
                                                            </div>
                                                        </td>
                                                    </tr></table>
                                                </div>
                                                ${vars.yearGrid}
                                            </div>`;
}

// ---- COLLECTIONS PAGE ----
let content = fs.readFileSync('src/app/admin/collections/page.tsx', 'utf8');

// Find and replace the old status block using known anchor text that appears only once
const oldBlockStart = '<div style="margin:20px 0;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">';
const oldBlockEnd = '})()}\r\n                                            </div>';

const sIdx = content.indexOf(oldBlockStart);
const eIdx = content.indexOf(oldBlockEnd, sIdx);

if (sIdx === -1 || eIdx === -1) {
    console.error('Anchors not found. sIdx:', sIdx, 'eIdx:', eIdx);
    process.exit(1);
}

const endOfBlock = eIdx + oldBlockEnd.length;

// The new status block for collections uses JS template literals with ${...} for variables
const newCollectionsBlock = `<div style="margin:24px 0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
                                                <div style="background:linear-gradient(135deg,#1e3a8a 0%,#0f766e 100%);padding:11px 18px">
                                                    <span style="color:#fff;font-weight:700;font-size:14px;letter-spacing:0.3px">Account Summary</span>
                                                </div>
                                                <div style="background:#f8fafc;padding:14px 18px;border-bottom:1px solid #e2e8f0">
                                                    <table style="width:100%;border-collapse:collapse"><tr>
                                                        <td style="width:33%;padding:0 5px 0 0"><div style="text-align:center;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 6px"><div style="font-size:22px;font-weight:800;color:#334155">\${totalPassedMonths}</div><div style="font-size:10px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Months Passed</div></div></td>
                                                        <td style="width:33%;padding:0 5px"><div style="text-align:center;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 6px"><div style="font-size:22px;font-weight:800;color:#15803d">\${totalPaidMonthsCount}</div><div style="font-size:10px;color:#16a34a;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Donated</div></div></td>
                                                        <td style="width:33%;padding:0 0 0 5px"><div style="text-align:center;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 6px"><div style="font-size:22px;font-weight:800;color:#c2410c">\${monthsDue}</div><div style="font-size:10px;color:#ea580c;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Due</div></div></td>
                                                    </tr></table>
                                                </div>
                                                \${(() => {
                                                    const _cm = new Date().getMonth() + 1;
                                                    const _cy = new Date().getFullYear();
                                                    if (!settings || !settings.collectionYears || settings.collectionYears.length === 0) return '';
                                                    return settings.collectionYears.map((yr) => {
                                                        const am = settings.collectionMonths?.[yr] || [1,2,3,4,5,6,7,8,9,10,11,12];
                                                        const rel = yr < _cy ? am : yr === _cy ? am.filter((m) => m <= _cm) : [];
                                                        if (rel.length === 0) return '';
                                                        const pL = rel.filter((m) => paidMonthsSet.has(\`\${m}-\${yr}\`)).map((m) => new Date(2000,m-1,1).toLocaleString('en-US',{month:'short'})).join(', ') || '—';
                                                        const dL = rel.filter((m) => !paidMonthsSet.has(\`\${m}-\${yr}\`)).map((m) => new Date(2000,m-1,1).toLocaleString('en-US',{month:'short'})).join(', ') || '—';
                                                        const hasDue = rel.some((m) => !paidMonthsSet.has(\`\${m}-\${yr}\`));
                                                        return \`<div style="padding:10px 18px;border-bottom:1px solid #f1f5f9"><div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:5px">\${yr}</div><table style="width:100%;border-collapse:collapse;font-size:12px"><tr><td style="padding:2px 0;color:#15803d;width:70px;font-weight:600">&#10003; Donated</td><td style="padding:2px 0;color:#166534">\${pL}</td></tr>\${hasDue ? \`<tr><td style="padding:2px 0;color:#c2410c;width:70px;font-weight:600">&#9679; Due</td><td style="padding:2px 0;color:#9a3412">\${dL}</td></tr>\` : ''}</table></div>\`;
                                                    }).join('');
                                                })()}
                                            </div>`;

content = content.slice(0, sIdx) + newCollectionsBlock + content.slice(endOfBlock);
fs.writeFileSync('src/app/admin/collections/page.tsx', content, 'utf8');
console.log('Collections page account status redesigned.');

// ---- REQUESTS PAGE ----
// Also update yearGridRows builder in requests to use the same row style
let reqContent = fs.readFileSync('src/app/admin/requests/page.tsx', 'utf8');

const oldYearGrid = `return \`<div style="padding:8px 16px;border-bottom:1px solid #e5e7eb"><div style="font-weight:700;font-size:12px;color:#374151;margin-bottom:5px">\${yr}</div><table style="border-collapse:collapse;width:100%"><tr>\${cells}</tr></table></div>\`;`;
const newYearGrid = `const pL2 = relevant.filter((m) => paidSet.has(\`\${m}-\${yr}\`)).map((m) => new Date(2000,m-1,1).toLocaleString('en-US',{month:'short'})).join(', ') || '—';
                                                const dL2 = relevant.filter((m) => !paidSet.has(\`\${m}-\${yr}\`)).map((m) => new Date(2000,m-1,1).toLocaleString('en-US',{month:'short'})).join(', ') || '—';
                                                const hasDue2 = relevant.some((m) => !paidSet.has(\`\${m}-\${yr}\`));
                                                return \`<div style="padding:10px 18px;border-bottom:1px solid #f1f5f9"><div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:5px">\${yr}</div><table style="width:100%;border-collapse:collapse;font-size:12px"><tr><td style="padding:2px 0;color:#15803d;width:70px;font-weight:600">&#10003; Donated</td><td style="padding:2px 0;color:#166534">\${pL2}</td></tr>\${hasDue2 ? \`<tr><td style="padding:2px 0;color:#c2410c;width:70px;font-weight:600">&#9679; Due</td><td style="padding:2px 0;color:#9a3412">\${dL2}</td></tr>\` : ''}</table></div>\`;`;

if (reqContent.includes(oldYearGrid)) {
    reqContent = reqContent.replace(oldYearGrid, newYearGrid);
    console.log('Updated yearGrid builder in requests page.');
} else {
    console.log('yearGrid builder not found in requests page by exact match - trying partial.');
}

// Also replace the container div in requests page memberFinanceSummaryHtml
const oldReqContainer = `<div style="margin:20px 0;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
                                    <div style="background:linear-gradient(135deg,#1e3a8a,#0f766e);padding:12px 16px">
                                        <span style="color:#fff;font-weight:700;font-size:15px">`;
const newReqContainer = `<div style="margin:24px 0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
                                    <div style="background:linear-gradient(135deg,#1e3a8a 0%,#0f766e 100%);padding:11px 18px">
                                        <span style="color:#fff;font-weight:700;font-size:14px;letter-spacing:0.3px">`;

if (reqContent.includes(oldReqContainer)) {
    reqContent = reqContent.replace(oldReqContainer, newReqContainer);
    console.log('Updated requests page container style.');
} else {
    console.log('Requests container not found by exact match.');
}

// Update the summary table inside requests page
const oldReqSummaryTable = `<div style="padding:12px 16px;background:#f9fafb;border-bottom:1px solid #e5e7eb">
                                        <table style="width:100%;border-collapse:collapse;font-size:13px">
                                            <tr><td style="padding:4px 0;color:#6b7280">Total Months Passed (Since Foundation Start)</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#374151">\${totalPassed}</td></tr>
                                            <tr><td style="padding:4px 0;color:#15803d;font-weight:600">Total Months Donated</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#15803d">\${totalPaidCount}</td></tr>
                                            <tr><td style="padding:4px 0;color:#b45309;font-weight:600">Total Months Due</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#b45309">\${totalDue}</td></tr>
                                        </table>
                                    </div>`;
const newReqSummaryTable = `<div style="background:#f8fafc;padding:14px 18px;border-bottom:1px solid #e2e8f0">
                                        <table style="width:100%;border-collapse:collapse"><tr>
                                            <td style="width:33%;padding:0 5px 0 0"><div style="text-align:center;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 6px"><div style="font-size:22px;font-weight:800;color:#334155">\${totalPassed}</div><div style="font-size:10px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Months Passed</div></div></td>
                                            <td style="width:33%;padding:0 5px"><div style="text-align:center;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 6px"><div style="font-size:22px;font-weight:800;color:#15803d">\${totalPaidCount}</div><div style="font-size:10px;color:#16a34a;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Donated</div></div></td>
                                            <td style="width:33%;padding:0 0 0 5px"><div style="text-align:center;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 6px"><div style="font-size:22px;font-weight:800;color:#c2410c">\${totalDue}</div><div style="font-size:10px;color:#ea580c;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Due</div></div></td>
                                        </tr></table>
                                    </div>`;

if (reqContent.includes(oldReqSummaryTable)) {
    reqContent = reqContent.replace(oldReqSummaryTable, newReqSummaryTable);
    console.log('Updated requests page summary table.');
} else {
    console.log('Requests summary table not found by exact match.');
}

fs.writeFileSync('src/app/admin/requests/page.tsx', reqContent, 'utf8');

// ---- CRON REMINDER ----
let cronContent = fs.readFileSync('src/app/api/cron/payment-reminders/route.ts', 'utf8');

const oldCronContainer = `<div style="margin:20px 0;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
                                    <div style="background:linear-gradient(135deg,#1e3a8a,#0f766e);padding:12px 16px">
                                        <span style="color:#fff;font-weight:700;font-size:15px">`;
const newCronContainer = `<div style="margin:24px 0;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">
                                    <div style="background:linear-gradient(135deg,#1e3a8a 0%,#0f766e 100%);padding:11px 18px">
                                        <span style="color:#fff;font-weight:700;font-size:14px;letter-spacing:0.3px">`;
if (cronContent.includes(oldCronContainer)) {
    cronContent = cronContent.replace(oldCronContainer, newCronContainer);
    console.log('Updated cron page container.');
} else {
    console.log('Cron container not found.');
}

const oldCronSummaryTable = `<table style="width:100%;border-collapse:collapse;font-size:13px">
                                            <tr><td style="padding:4px 0;color:#6b7280">Total Months Since Foundation Start</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#374151">\${totalPassedMonths}</td></tr>
                                            <tr><td style="padding:4px 0;color:#15803d;font-weight:600">Total Months Donated</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#15803d">\${paidMonthsCount}</td></tr>
                                            <tr><td style="padding:4px 0;color:#b45309;font-weight:600">Months Awaiting Your Donation</td><td style="padding:4px 0;text-align:right;font-weight:700;color:#b45309">\${monthsDue}</td></tr>
                                        </table>`;
const newCronSummaryTable = `<table style="width:100%;border-collapse:collapse"><tr>
                                            <td style="width:33%;padding:0 5px 0 0"><div style="text-align:center;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 6px"><div style="font-size:22px;font-weight:800;color:#334155">\${totalPassedMonths}</div><div style="font-size:10px;color:#64748b;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Months Passed</div></div></td>
                                            <td style="width:33%;padding:0 5px"><div style="text-align:center;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 6px"><div style="font-size:22px;font-weight:800;color:#15803d">\${paidMonthsCount}</div><div style="font-size:10px;color:#16a34a;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Donated</div></div></td>
                                            <td style="width:33%;padding:0 0 0 5px"><div style="text-align:center;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 6px"><div style="font-size:22px;font-weight:800;color:#c2410c">\${monthsDue}</div><div style="font-size:10px;color:#ea580c;margin-top:2px;text-transform:uppercase;letter-spacing:0.5px">Due</div></div></td>
                                        </tr></table>`;

if (cronContent.includes(oldCronSummaryTable)) {
    cronContent = cronContent.replace(oldCronSummaryTable, newCronSummaryTable);
    console.log('Updated cron summary table.');
} else {
    console.log('Cron summary table not found.');
}

// Update yearGridHtml builder in cron to row-style
const oldCronYearGrid = `return \`<div style="padding:8px 16px;border-bottom:1px solid #e5e7eb">
                        <div style="font-weight:700;font-size:12px;color:#374151;margin-bottom:5px">\${yr}</div>
                        <table style="border-collapse:collapse;width:100%"><tr>\${cells}</tr></table>
                    </div>\`;`;
const newCronYearGrid = `const pL3 = relevant.filter((m) => paidMonthsSet.has(\`\${m}-\${yr}\`)).map((m) => new Date(2000,m-1,1).toLocaleString('en-US',{month:'short'})).join(', ') || '—';
                    const dL3 = relevant.filter((m) => !paidMonthsSet.has(\`\${m}-\${yr}\`)).map((m) => new Date(2000,m-1,1).toLocaleString('en-US',{month:'short'})).join(', ') || '—';
                    const hasDue3 = relevant.some((m) => !paidMonthsSet.has(\`\${m}-\${yr}\`));
                    return \`<div style="padding:10px 18px;border-bottom:1px solid #f1f5f9"><div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:5px">\${yr}</div><table style="width:100%;border-collapse:collapse;font-size:12px"><tr><td style="padding:2px 0;color:#15803d;width:70px;font-weight:600">&#10003; Donated</td><td style="padding:2px 0;color:#166534">\${pL3}</td></tr>\${hasDue3 ? \`<tr><td style="padding:2px 0;color:#c2410c;width:70px;font-weight:600">&#9679; Due</td><td style="padding:2px 0;color:#9a3412">\${dL3}</td></tr>\` : ''}</table></div>\`;`;

if (cronContent.includes(oldCronYearGrid)) {
    cronContent = cronContent.replace(oldCronYearGrid, newCronYearGrid);
    console.log('Updated cron year grid builder.');
} else {
    console.log('Cron year grid builder not found by exact match.');
}

fs.writeFileSync('src/app/api/cron/payment-reminders/route.ts', cronContent, 'utf8');
console.log('All files updated!');
