// This script replaces the old "Your Global Donation Account Status" grid in email HTML
// with a new professional compact design across collections and requests pages.
const fs = require('fs');

// New compact style builder - used inline in templates
// The new design: summary row of 3 stat pills, then a clean year-wise list of months
// Format: a bordered card with a teal header, 3 stat pills, then a clean per-year list

// The compact account status HTML template (used as a JS string in the source)
// We'll construct it so it reads clearly in the code

// === Check what's in requests/page.tsx around yearGridRows ===
const reqFile = fs.readFileSync('src/app/admin/requests/page.tsx', 'utf8');
const indices = [];
let idx = reqFile.indexOf('yearGridRows');
while (idx !== -1) {
    indices.push(idx);
    idx = reqFile.indexOf('yearGridRows', idx + 1);
}
console.log('yearGridRows occurrences in requests/page.tsx at char positions:', indices);
console.log('Context around first:', reqFile.substring(indices[0] - 50, indices[0] + 200));
