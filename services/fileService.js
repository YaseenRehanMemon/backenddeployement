const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const pdfParse = require('pdf-parse');
const config = require('../config');

class FileService {
    async processUploadedFiles(files) {
        const processedFiles = [];
        
        for (const file of files) {
            const ext = path.extname(file.filename).toLowerCase();
            
            if (ext === '.pdf') {
                // Extract pages from PDF
                const pdfBuffer = await fs.readFile(file.path);
                const pdfData = await pdfParse(pdfBuffer);
                
                // For simplicity, treating entire PDF as one page
                // In production, you'd extract individual pages as images
                processedFiles.push(pdfBuffer);
                
            } else {
                // Process image files
                const imageBuffer = await sharp(file.path)
                    .jpeg({ quality: 90 })
                    .toBuffer();
                    
                processedFiles.push(imageBuffer);
            }
        }
        
        return processedFiles;
    }

    async cleanupTempFiles(files) {
        if (!files) return;
        
        for (const file of files) {
            try {
                // Only try to clean up files that are in our configured upload directory
                if (file.path && file.path.startsWith(config.uploadDir)) {
                    await fs.unlink(file.path);
                    console.log(`🗑️ Cleaned up: ${file.filename}`);
                }
            } catch (error) {
                console.error(`Failed to delete ${file.filename}:`, error.message);
            }
        }
    }

    async ensureDirectory(dirPath) {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }
}

module.exports = new FileService();