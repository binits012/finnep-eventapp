#!/usr/bin/env node

/**
 * Generate PDF from User Manual Markdown for all languages
 *
 * This script converts the USER_MANUAL.md file to PDF format for all supported languages.
 *
 * Requirements:
 * - npm install -g md-to-pdf (or use npx)
 * - Or install pandoc: brew install pandoc (macOS) / apt-get install pandoc (Linux)
 *
 * Usage:
 *   npm run generate-pdf
 *   or
 *   node scripts/generate-pdf.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Supported languages
const LANGUAGES = [
  { code: 'en-US', name: 'English', file: 'USER_MANUAL.md' },
  { code: 'fi-FI', name: 'Finnish', file: 'USER_MANUAL_fi-FI.md' },
  { code: 'sv-SE', name: 'Swedish', file: 'USER_MANUAL_sv-SE.md' },
  { code: 'da-DK', name: 'Danish', file: 'USER_MANUAL_da-DK.md' },
  { code: 'no-NO', name: 'Norwegian', file: 'USER_MANUAL_no-NO.md' }
];

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'docs', 'pdf');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Generate PDF for a single language
 */
function generatePDFForLanguage(language) {
  const outputFile = path.join(OUTPUT_DIR, `USER_MANUAL_${language.code}.pdf`);

  // Determine which manual file to use (locale-specific or English fallback)
  const localeSpecificPath = path.join(DOCS_DIR, language.file);
  const englishFallbackPath = path.join(DOCS_DIR, 'USER_MANUAL.md');

  let manualPath;
  let usingFallback = false;

  if (fs.existsSync(localeSpecificPath)) {
    manualPath = localeSpecificPath;
  } else if (language.code !== 'en-US' && fs.existsSync(englishFallbackPath)) {
    // Use English as fallback for non-English languages
    manualPath = englishFallbackPath;
    usingFallback = true;
  } else if (language.code === 'en-US' && fs.existsSync(englishFallbackPath)) {
    manualPath = englishFallbackPath;
  } else {
    console.log(`⚠️  Skipping ${language.name} (${language.code}): No manual file found (tried ${language.file} and USER_MANUAL.md)`);
    return false;
  }

  console.log(`\n📄 Generating PDF for ${language.name} (${language.code})...`);
  if (usingFallback) {
    console.log(`   ⚠️  Using English manual as fallback (translated version not found)`);
  }
  console.log(`   Input: ${manualPath}`);
  console.log(`   Output: ${outputFile}`);

  try {
    // Check if md-to-pdf is available
    try {
      execSync('npx --yes md-to-pdf --version', { stdio: 'ignore' });
      console.log('   Using md-to-pdf...');

      // Create a temporary markdown file with corrected image paths for PDF generation
      // Web paths: /docs/images/screenshots/ -> Relative paths: ../public/docs/images/screenshots/
      const tempMdPath = path.join(DOCS_DIR, `USER_MANUAL_TEMP_${language.code}.md`);
      let markdownContent = fs.readFileSync(manualPath, 'utf8');
      // Replace web paths with relative paths for PDF generation
      markdownContent = markdownContent.replace(/\/docs\/images\/screenshots\//g, '../public/docs/images/screenshots/');
      fs.writeFileSync(tempMdPath, markdownContent);

      // Create a config file for md-to-pdf
      const configPath = path.join(__dirname, '..', `md-to-pdf.config.${language.code}.js`);
      const configContent = `module.exports = {
        pdf_options: {
          format: 'A4',
          margin: {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm'
          },
          printBackground: true
        },
        stylesheet: \`
          img {
            max-width: 100%;
            height: auto;
            page-break-inside: avoid;
          }
        \`
      };`;
      fs.writeFileSync(configPath, configContent);

      // Generate PDF using temporary markdown file (md-to-pdf creates file in same directory as input)
      const tempPdfFromTemp = path.join(path.dirname(tempMdPath), path.basename(tempMdPath, '.md') + '.pdf');
      execSync(
        `npx --yes md-to-pdf "${tempMdPath}"`,
        { stdio: 'inherit' }
      );

      // Move generated PDF to output location
      if (fs.existsSync(tempPdfFromTemp)) {
        fs.renameSync(tempPdfFromTemp, outputFile);
      } else {
        throw new Error('PDF file was not generated');
      }

      // Clean up temporary files
      if (fs.existsSync(tempMdPath)) {
        fs.unlinkSync(tempMdPath);
      }
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }

      console.log(`✅ PDF generated successfully for ${language.name}!`);
      console.log(`   Location: ${outputFile}`);
      return true;
    } catch (error) {
      // Try pandoc as fallback
      try {
        execSync('pandoc --version', { stdio: 'ignore' });
        console.log('   Using pandoc...');

        execSync(
          `pandoc "${manualPath}" -o "${outputFile}" --pdf-engine=wkhtmltopdf -V geometry:margin=20mm`,
          { stdio: 'inherit' }
        );

        console.log(`✅ PDF generated successfully for ${language.name}!`);
        console.log(`   Location: ${outputFile}`);
        return true;
      } catch (pandocError) {
        console.error(`❌ Error: Neither md-to-pdf nor pandoc is available for ${language.name}.`);
        return false;
      }
    }
  } catch (error) {
    console.error(`❌ Error generating PDF for ${language.name}:`, error.message);
    return false;
  }
}

// Main execution
console.log('🚀 Starting PDF generation for all languages...\n');

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

for (const language of LANGUAGES) {
  const result = generatePDFForLanguage(language);
  if (result === true) {
    successCount++;
  } else if (result === false && fs.existsSync(path.join(DOCS_DIR, language.file))) {
    errorCount++;
  } else {
    skipCount++;
  }
}

console.log('\n' + '='.repeat(60));
console.log('📊 Summary:');
console.log(`   ✅ Successfully generated: ${successCount}`);
console.log(`   ⚠️  Skipped (file not found): ${skipCount}`);
console.log(`   ❌ Errors: ${errorCount}`);
console.log('='.repeat(60));

if (errorCount > 0) {
  console.error('\n❌ Some PDFs failed to generate. Please check the errors above.');
  process.exit(1);
} else if (successCount === 0) {
  console.error('\n❌ No PDFs were generated. Please check if manual files exist.');
  process.exit(1);
} else {
  console.log('\n✅ PDF generation completed!');
}
