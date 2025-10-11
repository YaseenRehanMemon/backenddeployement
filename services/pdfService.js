const axios = require('axios');
const fs = require('fs');
const path = require('path');
const katex = require('katex');
const config = require('../config');

class PDFService {
  /**
   * Generates a test paper PDF from MCQs and metadata.
   * @param {Array<Object>} mcqs - Array of MCQ objects.
   * @param {Object} metadata - Test metadata (instructor, subject, class, etc.).
   * @returns {Promise<Object>} Object containing paths to the generated PDF and JSON data.
   */
  async generateTestPDF(mcqs, metadata) {
    const outputDir = config.outputDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `final_test_${mcqs.length}.pdf`);
    const jsonPath = path.join(outputDir, `extracted_data_${mcqs.length}.json`);

    await fs.promises.writeFile(jsonPath, JSON.stringify(mcqs, null, 2));

    const html = this.generateHTML(mcqs, metadata);
    const encodedHtml = Buffer.from(html).toString('base64');

    const pdfboltApiKey = process.env.PDFBOLT_API_KEY;
    if (!pdfboltApiKey) {
      throw new Error('PDFBOLT_API_KEY environment variable is required');
    }
    
    try {
      const response = await axios.post('https://api.pdfbolt.com/v1/direct', {
        html: encodedHtml,
        printBackground: true,
        waitUntil: 'networkidle'
      }, {
        headers: {
          'API-KEY': pdfboltApiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: config.pdfGenerationTimeout
      });

      fs.writeFileSync(outputPath, response.data);

      return {
        pdf: path.basename(outputPath),
        json: path.basename(jsonPath)
      };
    } catch (error) {
      console.error('Error in PDF generation:', error.message, error.response?.data);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  processLogoPath() {
    const LOGO_PLACEHOLDER = "https://placehold.co/60x60/333333/FFFFFF?text=LOGO";
    // In serverless environments, only use remote images as local files may not be available
    return {
      path: LOGO_PLACEHOLDER,
      exists: false
    };
  }

  processLatexForHTML(text) {
    if (!text) return text;

    try {
      // Replace display math: \[ ... \] or $$ ... $$
      text = text.replace(/\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/g, (match, latex1, latex2) => {
        const latex = latex1 || latex2;
        try {
          return katex.renderToString(latex.trim(), {
            displayMode: true,
            throwOnError: false
          });
        } catch (err) {
          console.warn('KaTeX display render failed:', err.message);
          return match;
        }
      });

      // Replace inline math: \( ... \) or $ ... $
      text = text.replace(/\\\(([\s\S]*?)\\\)|\$([^\$]+?)\$/g, (match, latex1, latex2) => {
        const latex = latex1 || latex2;
        try {
          return katex.renderToString(latex.trim(), {
            displayMode: false,
            throwOnError: false
          });
        } catch (err) {
          console.warn('KaTeX inline render failed:', err.message);
          return match;
        }
      });

      return text;
    } catch (error) {
      console.error('LaTeX processing failed:', error);
      return text;
    }
  }

  // Calculate dynamic scaling based on total MCQ count
  calculateDynamicScaling(mcqs) {
    const totalMcqs = mcqs.length;

    // Calculate average content length
    const totalChars = mcqs.reduce((sum, mcq) => {
      return sum + mcq.question.length +
        (mcq.options.A?.length || 0) +
        (mcq.options.B?.length || 0) +
        (mcq.options.C?.length || 0) +
        (mcq.options.D?.length || 0);
    }, 0);

    const avgCharsPerMcq = totalChars / totalMcqs;

    // Determine layout mode based on content density
    let layoutMode, fontSize, lineHeight, spacing, optionsLayout;

    if (totalMcqs <= 15) {
      // SPARSE MODE: Spread out, larger fonts
      layoutMode = 'sparse';
      fontSize = 15;
      lineHeight = 1.6;
      spacing = 12;
      optionsLayout = 'vertical'; // 2 columns
    } else if (totalMcqs <= 30) {
      // NORMAL MODE: Standard layout
      layoutMode = 'normal';
      fontSize = 13.5;
      lineHeight = 1.4;
      spacing = 8;
      optionsLayout = 'vertical'; // 2 columns
    } else if (totalMcqs <= 50) {
      // COMPACT MODE: Tighter spacing
      layoutMode = 'compact';
      fontSize = 12;
      lineHeight = 1.2;
      spacing = 5;
      optionsLayout = avgCharsPerMcq > 50 ? 'vertical' : 'horizontal';
    } else {
      // ULTRA-COMPACT MODE: Maximum density
      layoutMode = 'ultra-compact';
      fontSize = 10.5;
      lineHeight = 1.1;
      spacing = 3;
      optionsLayout = 'horizontal'; // All in one line
    }

    // Calculate page break point (aim for 50-50 split)
    const breakIndex = Math.floor(totalMcqs / 2) - 1;

    return {
      layoutMode,
      fontSize,
      lineHeight,
      spacing,
      optionsLayout,
      breakIndex,
      totalMcqs
    };
  }

  generateHTML(mcqs, metadata) {
    const { path: logoPath, exists: hasLogo } = this.processLogoPath();
    const scaling = this.calculateDynamicScaling(mcqs);

    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test Paper</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    
    <style>
        @page {
            size: A4;
            margin: 10mm 15mm;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Times New Roman', Times, serif;
            line-height: ${scaling.lineHeight};
            font-size: ${scaling.fontSize}px;
            color: #000;
            background: white;
        }
        
        /* HEADER */
        .header {
            text-align: center;
            margin-bottom: ${Math.max(8, scaling.spacing)}px;
            page-break-inside: avoid;
        }
        
        .main-title-area {
            display: flex;
            align-items: center;
            justify-content: center;
            border-bottom: 2px solid black;
            padding-bottom: 6px;
            margin-bottom: 6px;
        }
        
        .header-logo {
            width: 45px;
            height: 45px;
            border: 1px solid black;
            padding: 2px;
            margin-right: 12px;
            object-fit: contain;
        }
        
        .header-text-container {
            flex-grow: 1;
            text-align: left;
        }
        
        .college-name {
            font-size: ${Math.min(20, scaling.fontSize + 6)}px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            line-height: 1.2;
        }
        
        .test-subject-line {
            font-size: ${Math.max(10, scaling.fontSize - 3)}px;
            margin-top: 2px;
        }
        
        .subject-underline {
            border-bottom: 1px solid black;
            font-weight: bold;
            padding: 0 4px;
        }
        
        /* METADATA TABLE */
        .metadata-table-wrapper {
            margin-top: ${Math.max(4, scaling.spacing - 2)}px;
            border: 2px solid black;
        }
        
        .metadata-table {
            width: 100%;
            border-collapse: collapse;
            font-size: ${Math.max(9, scaling.fontSize - 3)}px;
        }
        
        .metadata-table tr {
            border-bottom: 1px solid black;
        }
        
        .metadata-table tr:last-child {
            border-bottom: none;
        }
        
        .metadata-table td {
            padding: 2px 6px;
            border-right: 1px solid black;
            text-align: left;
        }
        
        .metadata-table td:last-child {
            border-right: none;
        }
        
        .metadata-table .label {
            width: 25%;
            font-weight: bold;
        }
        
        .metadata-table .value {
            width: 25%;
        }
        
        .blank-field {
            border-bottom: 1px solid black;
            display: inline-block;
            min-height: 1em;
            width: 80%;
        }
        
        /* STUDENT INFO */
        .student-info-print-fields {
            margin-top: ${Math.max(4, scaling.spacing - 1)}px;
            margin-bottom: ${Math.max(6, scaling.spacing)}px;
            display: flex;
            justify-content: space-between;
            font-size: ${Math.max(10, scaling.fontSize - 2)}px;
            font-weight: bold;
        }
        
        .student-field-item {
            flex: 1;
        }
        
        .student-underline {
            display: inline-block;
            border-bottom: 1px solid black;
            min-width: 100px;
            margin-left: 5px;
        }
        
        /* QUESTIONS */
        .question {
            margin-bottom: ${scaling.spacing}px;
            page-break-inside: avoid;
        }
        
        .question-text {
            margin-bottom: ${Math.max(2, scaling.spacing / 2)}px;
            font-weight: 500;
        }
        
        .options {
            margin-left: ${scaling.layoutMode === 'ultra-compact' ? '15px' : '20px'};
            ${scaling.optionsLayout === 'horizontal'
        ? 'display: flex; flex-wrap: wrap; gap: 8px;'
        : 'display: grid; grid-template-columns: 1fr 1fr; column-gap: 10px; row-gap: 2px;'}
        }
        
        .option {
            ${scaling.optionsLayout === 'horizontal' ? 'display: inline;' : ''}
            font-size: ${Math.max(9, scaling.fontSize - 1)}px;
        }
        
        ${scaling.optionsLayout === 'horizontal' ? `
        .option:not(:last-child)::after {
            content: ' | ';
            margin: 0 4px;
        }
        ` : ''}
        
        /* PAGE BREAK */
        .page-break {
            page-break-after: always;
        }
        
        /* FOOTER */
        .footer {
            margin-top: ${scaling.spacing * 2}px;
            text-align: center;
            border-top: 2px solid black;
            padding-top: 8px;
            page-break-inside: avoid;
        }
        
        .end-message {
            font-size: ${Math.max(12, scaling.fontSize)}px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        /* PRINT OPTIMIZATIONS */
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>`;

    // HEADER
    html += `
    <div class="header">
        <div class="main-title-area">
            ${hasLogo ? `<img src="${logoPath}" class="header-logo" alt="Logo">` : ''}
            <div class="header-text-container">
                <div class="college-name">GOVT. DEGREE COLLEGE HINGORJA</div>
                <div class="test-subject-line">
                    Test Paper - Subject: <span class="subject-underline">${metadata.subject}</span> (${metadata.class})
                </div>
            </div>
        </div>

        <div class="metadata-table-wrapper">
            <table class="metadata-table">
                <tr>
                    <td class="label">Date:</td>
                    <td class="value"><span class="blank-field"></span></td>
                </tr>
                <tr>
                    <td class="label">Instructor:</td>
                    <td class="value">${metadata.instructor}</td>
                </tr>
                <tr>
                    <td class="label">Max Marks:</td>
                    <td class="value">${metadata.maxMarks}</td>
                </tr>
                <tr>
                    <td class="label">Min Marks:</td>
                    <td class="value">${metadata.minMarks}</td>
                </tr>
                <tr>
                    <td class="label">Class:</td>
                    <td class="value">${metadata.class}</td>
                </tr>
            </table>
        </div>
        
        <div class="student-info-print-fields">
            <span class="student-field-item">
                STUDENT NAME: <span class="student-underline"></span>
            </span>
            <span class="student-field-item">
                SECTION: <span class="student-underline"></span>
            </span>
        </div>
    </div>`;

    // QUESTIONS - First Page
    for (let i = 0; i <= scaling.breakIndex && i < mcqs.length; i++) {
      const mcq = mcqs[i];
      const cleanedQuestion = mcq.question.replace(/^\s*\d+\.?\s*/, '');

      html += `
    <div class="question${i === scaling.breakIndex ? ' page-break' : ''}">
        <div class="question-text">${i + 1}. ${this.processLatexForHTML(cleanedQuestion)}</div>
        <div class="options">`;

      ['A', 'B', 'C', 'D'].forEach(key => {
        if (mcq.options[key]) {
          html += `<div class="option">${key}) ${this.processLatexForHTML(mcq.options[key])}</div>`;
        }
      });

      html += `</div></div>`;
    }

    // QUESTIONS - Second Page
    for (let i = scaling.breakIndex + 1; i < mcqs.length; i++) {
      const mcq = mcqs[i];
      const cleanedQuestion = mcq.question.replace(/^\s*\d+\.?\s*/, '');

      html += `
    <div class="question">
        <div class="question-text">${i + 1}. ${this.processLatexForHTML(cleanedQuestion)}</div>
        <div class="options">`;

      ['A', 'B', 'C', 'D'].forEach(key => {
        if (mcq.options[key]) {
          html += `<div class="option">${key}) ${this.processLatexForHTML(mcq.options[key])}</div>`;
        }
      });

      html += `</div></div>`;
    }

    // FOOTER
    html += `
    <div class="footer">
        <div class="end-message">*** END OF PAPER *** BEST OF LUCK!</div>
    </div>
</body>
</html>`;

    return html;
  }
}

module.exports = PDFService;
