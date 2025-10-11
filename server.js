const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

// Import custom modules
const uploadMiddleware = require('./middleware/uploadMiddleware');
const aiService = require('./services/aiService');
const PDFService = require('./services/pdfService');
const fileService = require('./services/fileService');
const config = require('./config');

const app = express();

// =======================================
// In-Memory Error Logging
// =======================================
const errorLog = [];
const MAX_LOG_SIZE = 100;

const logError = (error, context = 'General') => {
    const errorEntry = {
        timestamp: new Date().toISOString(),
        context,
        message: error.message,
        stack: error.stack,
        name: error.name
    };
    // Add to the beginning of the array
    errorLog.unshift(errorEntry);
    // Keep the log size manageable
    if (errorLog.length > MAX_LOG_SIZE) {
        errorLog.pop();
    }
    // Also log to the standard console
    console.error(`[${errorEntry.timestamp}] [${context}]`, error);
};

// Endpoint to view errors
app.get('/errors', (req, res) => {
    res.status(200).json(errorLog);
});
const PORT = process.env.PORT || 3000;

// Middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all origins for now to fix the immediate issue
    return callback(null, true);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from output directory
app.use('/output', express.static(path.join(config.outputDir)));

// Ensure required directories exist
const ensureDirectories = async () => {
    await fs.ensureDir(config.uploadDir);
    await fs.ensureDir(config.outputDir);
};
ensureDirectories();

// ========================================
// MAIN ENDPOINT: Upload and Process Test
// ========================================
app.post('/upload_test', uploadMiddleware.array('files', 10), async (req, res) => {
    console.log('📥 Received upload request');
    
    try {
        // Extract metadata from form
        const metadata = {
            instructor: req.body.instructor || 'Prof. Ahmed Khan',
            subject: req.body.subject || 'Mathematics',
            date: req.body.date || new Date().toLocaleDateString(),
            time: req.body.time || '10:00 AM - 11:30 AM',
            class: req.body.class || 'XI',
            maxMarks: req.body.maxMarks || '50',
            minMarks: req.body.minMarks || '25'
        };

        console.log('📋 Metadata:', metadata);

        // Validate uploaded files
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        console.log(`📁 Processing ${req.files.length} file(s)`);

        // Step 1: Process all uploaded files
        const processedFiles = await fileService.processUploadedFiles(req.files);
        
        // Step 2: Extract MCQs from each page using AI
        console.log('🧠 Extracting MCQs with Gemini...');
        let allMCQs = [];
        
        for (const [index, fileData] of processedFiles.entries()) {
            console.log(`  Processing page ${index + 1}/${processedFiles.length}`);
            const mcqs = await aiService.extractMCQsFromImage(fileData);
            allMCQs = allMCQs.concat(mcqs);
        }

        console.log(`✅ Extracted ${allMCQs.length} total MCQs`);

        // Step 3: Clean and format LaTeX
        console.log('🔧 Cleaning LaTeX...');
        const cleanedMCQs = await aiService.cleanupLatex(allMCQs);

        // Step 4: Generate PDF
        console.log('📄 Generating PDF...');
        const pdfService = new PDFService();
        const outputPaths = await pdfService.generateTestPDF(cleanedMCQs, metadata);

        // Step 5: Cleanup temporary files
        await fileService.cleanupTempFiles(req.files);

        // Return success response
        res.json({
            success: true,
            message: 'Test paper generated successfully',
            files: {
                pdf: `/output/${outputPaths.pdf}`,
                json: `/output/${outputPaths.json}`
            },
            stats: {
                totalQuestions: cleanedMCQs.length,
                pagesProcessed: processedFiles.length
            }
        });

    } catch (error) {
        logError(error, 'upload_test');
        
        // Cleanup on error
        if (req.files) {
            try {
                await fileService.cleanupTempFiles(req.files);
            } catch (cleanupError) {
                logError(cleanupError, 'upload_test_cleanup');
            }
        }
        
        res.status(500).json({
            error: 'Failed to process test paper',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// ========================================
// REGENERATE PDF ENDPOINT: Regenerate PDF with updated MCQs
// ========================================
app.post('/regenerate_pdf', async (req, res) => {
    console.log('🔄 Received regenerate PDF request');

    try {
        const { mcqs, metadata } = req.body;

        // Validate input
        if (!mcqs || !Array.isArray(mcqs) || mcqs.length === 0) {
            return res.status(400).json({ error: 'No MCQs provided' });
        }

        if (!metadata) {
            return res.status(400).json({ error: 'No metadata provided' });
        }

        console.log(`📄 Regenerating PDF with ${mcqs.length} MCQs`);

        // Generate PDF
        const pdfService = new PDFService();
        const outputPaths = await pdfService.generateTestPDF(mcqs, metadata);

        // Return success response
        res.json({
            success: true,
            message: 'PDF regenerated successfully',
            files: {
                pdf: `/output/${outputPaths.pdf}`,
                json: `/output/${outputPaths.json}`
            },
            stats: {
                totalQuestions: mcqs.length
            }
        });

    } catch (error) {
        logError(error, 'regenerate_pdf');
        res.status(500).json({
            error: 'Failed to regenerate PDF',
            details: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'AI Test Digitalization System',
        college: 'Govt. Degree College Hingorja'
    });
});

// For Vercel serverless functions, export the app
if (process.env.VERCEL_ENV) {
    // In Vercel environment
    module.exports = app;
} else {
    // Running locally
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log('📚 Govt. Degree College Hingorja - AI Test System Ready');
    });
}