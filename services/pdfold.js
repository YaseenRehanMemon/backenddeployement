const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const katex = require('katex');

class PDFService {
  /**
   * Generates a test paper PDF from MCQs and metadata.
   * @param {Array<Object>} mcqs - Array of MCQ objects.
   * @param {Object} metadata - Test metadata (instructor, subject, class, etc.).
   * @returns {Promise<Object>} Object containing paths to the generated PDF and JSON data.
   */
  async generateTestPDF(mcqs, metadata) {
    // Ensure output directory exists
    const outputDir = './output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const outputPath = path.join(outputDir, `final_test_${mcqs.length}.pdf`);
    const jsonPath = path.join(outputDir, `extracted_data_${mcqs.length}.json`);

    // Save JSON data (kept from original implementation)
    await fs.promises.writeFile(jsonPath, JSON.stringify(mcqs, null, 2));

    // Generate HTML with the new design and strict page break logic
    const html = this.generateHTML(mcqs, metadata);

    // Launch puppeteer and generate PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Use A4 format and minimal margins to maximize content space
    const pdfOptions = {
      path: outputPath,
      format: 'A4',
      margin: {
        top: '10px',    // Minimal margins
        bottom: '10px', // Minimal margins
        left: '20px',   // Minimal margins
        right: '20px'   // Minimal margins
      }
    };

    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf(pdfOptions);
    await browser.close();

    return {
      pdf: outputPath,
      json: jsonPath
    };
  }

  processLogoPath() {
    const LOGO_URL = "https://i.ibb.co/chR3Nx6X/test.jpg";
    // Use the provided logo URL
    return {
      path: LOGO_URL,
      exists: true
    };
  }

  // Render LaTeX to HTML using KaTeX
  processLatexForHTML(text) {
    if (!text) return text;

    try {
      // Replace display math: \[ ... \]
      text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, latex) => {
        try {
          return katex.renderToString(latex.trim(), { displayMode: true });
        } catch (err) {
          console.warn('KaTeX display render failed:', err.message);
          return match; // Return original on error
        }
      });

      // Replace inline math: \( ... \)
      text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match, latex) => {
        try {
          return katex.renderToString(latex.trim(), { displayMode: false });
        } catch (err) {
          console.warn('KaTeX inline render failed:', err.message);
          return match; // Return original on error
        }
      });

      return text;
    } catch (error) {
      console.error('LaTeX processing failed:', error);
      return text; // Return original text on failure
    }
  }

  // Calculate dynamic font scale based on content volume
  calculateFontScale(mcqs) {
    const totalChars = mcqs.reduce((sum, mcq) => {
      return sum + mcq.question.length +
             (mcq.options.A?.length || 0) +
             (mcq.options.B?.length || 0) +
             (mcq.options.C?.length || 0) +
             (mcq.options.D?.length || 0);
    }, 0);

    // Base scale on content: reduce font for density
    const baseScale = Math.max(0.5, 1 - (totalChars - 500) / 10000);
    return baseScale;
  }

  generateHTML(mcqs, metadata) {
    const { path: logoPath, exists: hasLogo } = this.processLogoPath();
    const totalMcqs = mcqs.length;
    const fontScale = this.calculateFontScale(mcqs);

    // Calculate the index after which the page break must occur
    // Balanced break for 2 pages
    let breakRatio;
    if (totalMcqs < 20) {
      breakRatio = 1.0; // No break, all on page 1
    } else if (totalMcqs < 40) {
      breakRatio = 0.5;
    } else {
      breakRatio = 1.0; // No break for high counts to avoid empty pages
    }
    const adjustedBreak = Math.floor(totalMcqs * breakRatio);
    const breakIndex = Math.max(0, adjustedBreak - 1);

    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test Paper</title>
    <!-- Load KaTeX styles (essential for math rendering) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <!-- FIX: Missing KaTeX core script -->
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <!-- FIX: Missing KaTeX auto-render extension -->
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
    
    <style>
        /* BASE STYLES & DENSITY OPTIMIZATION FOR PRINT */
        body {
            font-family: Arial, sans-serif;
            line-height: 1.1; /* Tighter line height for space saving */
            font-size: ${14 * fontScale}px;
        }
        

        
        /* HEADER STYLING - RICH DESIGN */
        .header {
            text-align: center;
            margin-bottom: 5px; /* More reduced */
        }
        .main-title-area {
            display: flex;
            align-items: center;
            border-bottom: 2px solid black;
            padding-bottom: 5px;
            margin-bottom: 8px;
        }
        .header-logo {
            width: 50px; /* Slightly smaller logo */
            height: 50px;
            border: 1px solid black;
            padding: 2px;
            margin-right: 15px;
            flex-shrink: 0;
        }
        .header-text-container {
            flex-grow: 1;
            text-align: left;
        }
        .college-name {
            font-size: 22px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 2px;
            line-height: 1.1;
            color: #1a365d;
            font-family: 'Arial Black', Arial, sans-serif;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
            margin: 0;
        }
        .test-subject-line {
            font-size: 11px; /* Smaller */
            margin-top: 2px;
        }
        .subject-underline {
            border-bottom: 1px solid black;
            font-weight: bold;
            padding: 0 5px;
        }
        
        /* METADATA TABLE STYLING */
        .metadata-table-wrapper {
            margin-top: 5px; /* Reduced margin */
            border: 2px solid black;
        }
        .metadata-table {
            width: 100%;
            border-collapse: collapse;
            font-size: ${10 * fontScale}px; /* Smaller */
            table-layout: fixed;
        }
        .metadata-table tr {
            border-bottom: 1px solid black;
        }
        .metadata-table tr:last-child {
            border-bottom: none;
        }
        .metadata-table td {
            padding: 3px 6px; /* More reduced */
            border-right: 1px solid black;
            text-align: left;
            vertical-align: middle;
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
            font-weight: bold;
        }
        .blank-field {
            border-bottom: 1px solid black;
            display: block;
            min-height: 1.1em;
            width: 90%;
            margin-left: auto;
            margin-right: auto;
            text-align: center;
        }
        
        /* STUDENT FILL-IN FIELDS */
        .student-info-print-fields {
            margin-top: 5px; /* More reduced */
            display: flex;
            justify-content: space-between;
            font-size: ${11 * fontScale}px;
            font-weight: bold;
            padding-bottom: 5px;
        }
        .student-field-item {
            flex-grow: 1;
            text-align: left;
            padding-right: 15px;
        }
        .student-underline {
            display: inline-block;
            border-bottom: 1px solid black;
            min-width: 120px;
            margin-left: 3px;
        }

        /* QUESTIONS SECTION - DENSITY & BREAK PROTECTION */
        .question {
            margin-bottom: ${4 * fontScale}px; /* Tighter spacing for 60 MCQs */
            font-size: ${13.5 * fontScale}px;
            page-break-inside: avoid; /* CRITICAL: Prevents question from splitting across pages */
        }
        .options {
            margin-left: 20px;
            display: flex;
            flex-wrap: wrap;
            font-size: ${13 * fontScale}px;
        }
        .option {
            /* 50% width forces two options per row */
            width: 50%; 
            margin-bottom: 3px; 
        }
        

        /* FOOTER STYLING */
        .footer {
            margin-top: 10px;
            text-align: center;
            border-top: 2px solid black;
            padding-top: 10px; /* Reduced padding */
        }
        .end-message {
            font-size: ${14 * fontScale}px;
            font-weight: 900;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
`;

    // --- HEADER HTML (Final Design) ---
    html += `
            <div class="header">
                <div class="main-title-area">
                    ${hasLogo ? `<img src="${logoPath}" class="header-logo" alt="College Logo">` : ''}
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
                            <td class="label">Time:</td>
                            <td class="value"><span class="blank-field"></span></td>
                        </tr>
                        <tr>
                            <td class="label">Instructor:</td>
                            <td class="value">${metadata.instructor}</td>
                            <td class="label">Duration:</td>
                            <td class="value">${metadata.time}</td>
                        </tr>
                        <tr>
                            <td class="label">Max Marks:</td>
                            <td class="value">${metadata.maxMarks}</td>
                            <td class="label">Min Marks:</td>
                            <td class="value">${metadata.minMarks}</td>
                        </tr>
                        <tr>
                            <td class="label">Class:</td>
                            <td class="value">${metadata.class}</td>
                            <td class="label"></td> 
                            <td class="value"></td> 
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
            </div>
        `;

     // --- QUESTIONS LOOP with Page Break Logic ---
      // First part: questions up to breakIndex
      for (let i = 0; i <= breakIndex; i++) {
        const mcq = mcqs[i];
        const cleanedQuestion = mcq.question.replace(/^\s*\d+\.?\s*/, '');

        const optionsHtml = ['A', 'B', 'C', 'D'].map(key => `
                  <div class="option">${key}) ${this.processLatexForHTML(mcq.options[key] || '')}</div>
              `).join('');

        const breakStyle = i === breakIndex ? 'style="page-break-after: always;"' : '';

        html += `
                  <div class="question" ${breakStyle}>
                      <div>${i + 1}. ${this.processLatexForHTML(cleanedQuestion)}</div>
                      <div class="options">
                          ${optionsHtml}
                      </div>
                  </div>
              `;
      }

      // Second part: remaining questions
      for (let i = breakIndex + 1; i < mcqs.length; i++) {
        const mcq = mcqs[i];
        const cleanedQuestion = mcq.question.replace(/^\s*\d+\.?\s*/, '');

        const optionsHtml = ['A', 'B', 'C', 'D'].map(key => `
                  <div class="option">${key}) ${this.processLatexForHTML(mcq.options[key] || '')}</div>
              `).join('');

        html += `
                  <div class="question">
                      <div>${i + 1}. ${this.processLatexForHTML(cleanedQuestion)}</div>
                      <div class="options">
                          ${optionsHtml}
                      </div>
                  </div>
              `;
      }







    // --- FOOTER HTML (Final Design) ---
    html += `
            <div class="footer">
                <div class="end-message">*** END OF PAPER *** Best of Luck!</div>
            </div>
            
            <script>
                // Client-side KaTeX rendering script
                // This ensures KaTeX is loaded and renders math expressions
                function renderMathInElement(element, options) {
                    if (typeof katex === 'undefined' || typeof renderMathInElement === 'undefined') {
                        // console.error('KaTeX or auto-render script not loaded.');
                        return;
                    }
                    renderMathInElement(element, options);
                }

                // Call KaTeX rendering once the DOM is ready
                document.addEventListener("DOMContentLoaded", function() {
                    // KaTeX rendering options (using standard delimiters)
                    renderMathInElement(document.body, {
                        delimiters: [
                            {left: '$$', right: '$$', display: true},
                            {left: '$', right: '$', display: false},
                            // Delimiters for auto-render: \( \) and \[ \]
                            {left: '\\\\(', right: '\\\\)', display: false},
                            {left: '\\\\[', right: '\\\\]', display: true}
                        ]
                    });
                });
            </script>
        </body>
    </html>`;

    return html;
  }
}

module.exports = PDFService;
