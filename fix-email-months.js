const fs = require('fs');

const files = [
    'src/app/admin/collections/page.tsx',
    'src/app/admin/requests/page.tsx',
    'src/app/api/cron/payment-reminders/route.ts'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Make numbers smaller and add " Months"
    content = content.replace(/<div style="font-size:22px;font-weight:800;color:#334155">\$\{([^}]+)\}<\/div>/g,
        `<div style="font-size:18px;font-weight:800;color:#334155">\${\$1} <span style="font-size:12px;font-weight:600">Months</span></div>`);

    content = content.replace(/<div style="font-size:22px;font-weight:800;color:#15803d">\$\{([^}]+)\}<\/div>/g,
        `<div style="font-size:18px;font-weight:800;color:#15803d">\${\$1} <span style="font-size:12px;font-weight:600">Months</span></div>`);

    content = content.replace(/<div style="font-size:22px;font-weight:800;color:#c2410c">\$\{([^}]+)\}<\/div>/g,
        `<div style="font-size:18px;font-weight:800;color:#c2410c">\${\$1} <span style="font-size:12px;font-weight:600">Months</span></div>`);

    fs.writeFileSync(file, content, 'utf8');
});

console.log("Updated email numbers to include 'Months'.");
