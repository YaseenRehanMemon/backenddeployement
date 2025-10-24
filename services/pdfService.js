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
   * @param {number} pageCount - Number of pages to generate.
   * @returns {Promise<Object>} Object containing paths to the generated PDF and JSON data.
   */
  async generateTestPDF(mcqs, metadata, pageCount = 2) {
    const outputDir = config.outputDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `final_test_${mcqs.length}.pdf`);
    const jsonPath = path.join(outputDir, `extracted_data_${mcqs.length}.json`);

    await fs.promises.writeFile(jsonPath, JSON.stringify(mcqs, null, 2));

    const html = this.generateHTML(mcqs, metadata, pageCount);
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
    const LOGO_URL = "https://i.ibb.co/chR3Nx6X/test.jpg";
    // Use the provided logo URL
    return {
      path: LOGO_URL,
      exists: true
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

  // Calculate dynamic scaling based on total MCQ count and page count
  calculateDynamicScaling(mcqs, pageCount) {
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

    // Determine layout mode based on content density and page count
    let layoutMode, fontSize, lineHeight, spacing, optionsLayout;

    // Adjust density based on page count - more pages allow larger fonts
    const densityFactor = Math.max(0.5, 1 - (pageCount - 2) * 0.1); // Reduce density as pages increase

    if (totalMcqs <= 15 * pageCount) {
      // SPARSE MODE: Spread out, larger fonts
      layoutMode = 'sparse';
      fontSize = Math.min(15, 13 + (pageCount - 2) * 0.5);
      lineHeight = 1.6;
      spacing = Math.max(8, 12 * densityFactor);
      optionsLayout = 'vertical'; // 2 columns
    } else if (totalMcqs <= 30 * pageCount) {
      // NORMAL MODE: Standard layout
      layoutMode = 'normal';
      fontSize = Math.min(13.5, 12 + (pageCount - 2) * 0.5);
      lineHeight = 1.4;
      spacing = Math.max(5, 8 * densityFactor);
      optionsLayout = 'vertical'; // 2 columns
    } else if (totalMcqs <= 50 * pageCount) {
      // COMPACT MODE: Tighter spacing
      layoutMode = 'compact';
      fontSize = Math.min(12, 11 + (pageCount - 2) * 0.5);
      lineHeight = 1.2;
      spacing = Math.max(3, 5 * densityFactor);
      optionsLayout = avgCharsPerMcq > 50 ? 'vertical' : 'horizontal';
    } else {
      // ULTRA-COMPACT MODE: Maximum density
      layoutMode = 'ultra-compact';
      fontSize = Math.min(10.5, 10 + (pageCount - 2) * 0.5);
      lineHeight = 1.1;
      spacing = Math.max(2, 3 * densityFactor);
      optionsLayout = 'horizontal'; // All in one line
    }

    // Calculate page break points for multiple pages
    const breakIndices = [];
    for (let i = 1; i < pageCount; i++) {
      breakIndices.push(Math.floor((totalMcqs * i) / pageCount) - 1);
    }

    return {
      layoutMode,
      fontSize,
      lineHeight,
      spacing,
      optionsLayout,
      breakIndices,
      totalMcqs,
      pageCount
    };
  }

  generateHTML(mcqs, metadata, pageCount = 2) {
    const { path: logoPath, exists: hasLogo } = this.processLogoPath();
    const scaling = this.calculateDynamicScaling(mcqs, pageCount);

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
            font-size: ${Math.min(22, scaling.fontSize + 8)}px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 2px;
            line-height: 1.1;
            color: #1a365d;
            font-family: 'Arial Black', Arial, sans-serif;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
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
                <div class="college-name">SCIENCE EDUCATION ACADEMY HINGORJA</div>
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

    // QUESTIONS - Distribute across pages
    let currentPage = 0;
    for (let i = 0; i < mcqs.length; i++) {
      const mcq = mcqs[i];
      const cleanedQuestion = mcq.question.replace(/^\s*\d+\.?\s*/, '');

      const isPageBreak = scaling.breakIndices.includes(i);

      html += `
    <div class="question${isPageBreak ? ' page-break' : ''}">
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
