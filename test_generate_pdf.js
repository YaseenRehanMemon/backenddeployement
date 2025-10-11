require('dotenv').config();
const PDFService = require('./services/pdfService');
const fs = require('fs');

async function testGeneratePDF() {
  try {
    console.log('Loading extracted data...');
    const data = JSON.parse(fs.readFileSync('./output/extracted_data_36.json', 'utf8'));

    const metadata = {
      instructor: 'Test Instructor',
      subject: 'Test Subject',
      date: new Date().toLocaleDateString(),
      time: '10:00 AM - 11:30 AM',
      class: 'Test Class',
      maxMarks: '50',
      minMarks: '25'
    };

    console.log(`Generating PDF for ${data.length} MCQs...`);
    const pdfService = new PDFService();
    const result = await pdfService.generateTestPDF(data, metadata);

    console.log('PDF generated successfully!');
    console.log('PDF path:', result.pdf);
    console.log('JSON path:', result.json);

  } catch (error) {
    console.error('Error generating PDF:', error);
  }
}

testGeneratePDF();