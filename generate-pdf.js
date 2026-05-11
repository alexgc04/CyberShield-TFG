/**
 * CyberShield — Generador de PDF desde Markdown
 * Convierte los informes .md en PDF profesionales
 * 
 * Uso: node generate-pdf.js [archivo.md]
 * Ejemplo: node generate-pdf.js docs/reports/CS-RPT-2026-05-08-FINAL_MAC-Flooding-eth0.md
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const inputFile = process.argv[2];

if (!inputFile) {
    console.error('❌ Uso: node generate-pdf.js <archivo.md>');
    console.error('   Ejemplo: node generate-pdf.js docs/reports/CS-RPT-2026-05-08-FINAL_MAC-Flooding-eth0.md');
    process.exit(1);
}

if (!fs.existsSync(inputFile)) {
    console.error(`❌ Archivo no encontrado: ${inputFile}`);
    process.exit(1);
}

const outputFile = inputFile.replace('.md', '.pdf');
const baseName = path.basename(inputFile, '.md');

console.log('🛡️  CyberShield PDF Generator');
console.log('━'.repeat(50));
console.log(`📄 Input:  ${inputFile}`);
console.log(`📋 Output: ${outputFile}`);
console.log('');

// Check if md-to-pdf is available
try {
    execSync('npx --yes md-to-pdf --version', { stdio: 'pipe' });
} catch (e) {
    console.log('📦 Instalando md-to-pdf...');
}

// Add CSS styling for professional output
const cssOverride = `
body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 11px; color: #1a1a2e; }
h1 { color: #16213e; border-bottom: 3px solid #e94560; padding-bottom: 10px; }
h2 { color: #0f3460; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px; margin-top: 30px; }
h3 { color: #533483; }
table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 10px; }
th { background-color: #16213e; color: white; padding: 8px; text-align: left; }
td { padding: 6px 8px; border: 1px solid #ddd; }
tr:nth-child(even) { background-color: #f8f9fa; }
code { background-color: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 10px; }
pre { background-color: #1a1a2e; color: #e0e0e0; padding: 12px; border-radius: 6px; font-size: 9px; overflow-x: auto; }
blockquote { border-left: 4px solid #e94560; padding-left: 12px; color: #555; background: #fff5f5; padding: 8px 12px; }
.page-break { page-break-after: always; }
@page { margin: 2cm; }
@page:first { margin-top: 3cm; }
`;

// Create temp config
const configPath = path.join(path.dirname(inputFile), '.md-to-pdf-config.json');
const config = {
    stylesheet: [],
    css: cssOverride,
    body_class: 'cybershield-report',
    pdf_options: {
        format: 'A4',
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `<div style="font-size:8px;color:#999;width:100%;text-align:center;margin-top:5mm;">CyberShield AI Agency — Confidencial</div>`,
        footerTemplate: `<div style="font-size:8px;color:#999;width:100%;text-align:center;margin-bottom:5mm;">Página <span class="pageNumber"></span> de <span class="totalPages"></span> | ${baseName}</div>`
    }
};

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

try {
    console.log('🔄 Generando PDF...');
    execSync(`npx --yes md-to-pdf --config-file "${configPath}" "${inputFile}"`, {
        stdio: 'inherit',
        timeout: 60000
    });
    
    console.log('');
    console.log('✅ PDF generado exitosamente!');
    console.log(`📋 Archivo: ${outputFile}`);
    console.log('━'.repeat(50));
} catch (error) {
    console.error('');
    console.error('⚠️  md-to-pdf falló. Intentando método alternativo con pandoc...');
    
    try {
        execSync(`pandoc "${inputFile}" -o "${outputFile}" --pdf-engine=xelatex -V geometry:margin=2cm -V colorlinks=true`, {
            stdio: 'inherit'
        });
        console.log(`✅ PDF generado con pandoc: ${outputFile}`);
    } catch (e2) {
        console.error('');
        console.error('❌ No se pudo generar el PDF automáticamente.');
        console.error('');
        console.error('Opciones manuales:');
        console.error('  1. Instalar md-to-pdf:  npm install -g md-to-pdf');
        console.error('  2. Instalar pandoc:     choco install pandoc');
        console.error('  3. Usar VS Code:        Extensión "Markdown PDF" → Ctrl+Shift+P → "Markdown PDF: Export (pdf)"');
        console.error('  4. Usar grip + Chrome:  pip install grip → grip archivo.md → Imprimir como PDF');
    }
} finally {
    // Cleanup temp config
    if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
    }
}
