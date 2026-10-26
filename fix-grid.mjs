import fs from 'fs';
import path from 'path';

const files = [
    "src/pages/money/EarningsAdmin.tsx",
    "src/pages/money/EarningsMyPage.tsx",
    "src/pages/BusinessMetrics.tsx",
    "src/pages/inventory/StockAdjustment.tsx",
    "src/pages/Dashboard.tsx",
    "src/pages/currency/Currency.tsx",
    "src/pages/Orders.tsx",
    "src/components/orders/OrderDialog.tsx",
    "src/components/orders/OrderHeader.tsx",
    "src/components/ui/nav/NavBar.tsx",
    "src/components/ui/options/OptionsList.tsx"
];

files.forEach(file => {
    const fullPath = path.join(process.cwd(), file);

    if (fs.existsSync(fullPath)) {
        console.log(`Processing: ${file}`);

        let content = fs.readFileSync(fullPath, 'utf8');

        // Replace item xs={12} md={6} lg={4} -> size={{ xs: 12, md: 6, lg: 4 }}
        content = content.replace(/item\s+xs=\{(\d+)\}\s+md=\{(\d+)\}\s+lg=\{(\d+)\}/g, 'size={{ xs: $1, md: $2, lg: $3 }}');

        // Replace item xs={12} lg={6} -> size={{ xs: 12, lg: 6 }}
        content = content.replace(/item\s+xs=\{(\d+)\}\s+lg=\{(\d+)\}/g, 'size={{ xs: $1, lg: $2 }}');

        // Replace item xs={12} md={6} -> size={{ xs: 12, md: 6 }}
        content = content.replace(/item\s+xs=\{(\d+)\}\s+md=\{(\d+)\}/g, 'size={{ xs: $1, md: $2 }}');

        // Replace item xs={12} -> size={{ xs: 12 }}
        content = content.replace(/item\s+xs=\{(\d+)\}/g, 'size={{ xs: $1 }}');

        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✓ Completed: ${file}`);
    } else {
        console.log(`✗ File not found: ${fullPath}`);
    }
});

console.log('\nAll files processed!');
