# Script to fix Grid to Grid2 migration for MUI v7

$files = @(
    "src\pages\money\EarningsAdmin.tsx",
    "src\pages\money\EarningsMyPage.tsx",
    "src\pages\BusinessMetrics.tsx",
    "src\pages\inventory\StockAdjustment.tsx",
    "src\pages\Dashboard.tsx",
    "src\pages\currency\Currency.tsx",
    "src\pages\Orders.tsx",
    "src\components\orders\OrderDialog.tsx",
    "src\components\orders\OrderHeader.tsx",
    "src\components\ui\nav\NavBar.tsx",
    "src\components\ui\options\OptionsList.tsx"
)

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot $file
    if (Test-Path $fullPath) {
        Write-Host "Processing: $file"
        
        # Read file content
        $content = Get-Content $fullPath -Raw
        
        # Replace Grid with Grid2 in imports
        $content = $content -replace 'import Grid from [''"]@mui/material/Grid[''"]', 'import Grid2 from ''@mui/material/Grid2'''
        $content = $content -replace '([{,\s])Grid([,\s}])', '$1Grid2$2'
        
        # Replace <Grid with <Grid2 and </Grid> with </Grid2>
        $content = $content -replace '\<Grid ', '<Grid2 '
        $content = $content -replace '\</Grid\>', '</Grid2>'
        
        # Replace item prop and xs/md/lg props with size prop
        # Pattern: item xs={12} md={6} -> size={{ xs: 12, md: 6 }}
        $content = $content -replace 'item\s+xs=\{(\d+)\}\s+md=\{(\d+)\}\s+lg=\{(\d+)\}', 'size={{ xs: $1, md: $2, lg: $3 }}'
        $content = $content -replace 'item\s+xs=\{(\d+)\}\s+lg=\{(\d+)\}', 'size={{ xs: $1, lg: $2 }}'
        $content = $content -replace 'item\s+xs=\{(\d+)\}\s+md=\{(\d+)\}', 'size={{ xs: $1, md: $2 }}'
        $content = $content -replace 'item\s+xs=\{(\d+)\}', 'size={{ xs: $1 }}'
        
        # Save the modified content
        Set-Content -Path $fullPath -Value $content -NoNewline
        
        Write-Host "✓ Completed: $file"
    } else {
        Write-Host "✗ File not found: $fullPath"
    }
}

Write-Host "`nAll files processed!"
