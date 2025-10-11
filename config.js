// Serverless configuration
const config = {
  // Timeout settings for serverless functions
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 30000, // 30 seconds
  
  // File upload settings
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  maxFiles: parseInt(process.env.MAX_FILES) || 10,
  
  // Temporary directory settings
  uploadDir: process.env.UPLOAD_DIR || '/tmp/uploads',
  outputDir: process.env.OUTPUT_DIR || '/tmp/output',
  
  // API endpoints
  maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
  
  // Serverless specific settings
  serverlessMode: process.env.SERVERLESS_MODE === 'true' || true, // Always true for Vercel
  
  // PDF generation settings
  pdfGenerationTimeout: parseInt(process.env.PDF_GENERATION_TIMEOUT) || 45000, // 45 seconds
};

module.exports = config;