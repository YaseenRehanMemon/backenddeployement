# AI Test Digitization Project - Issue Summary

## Project Structure
- **Frontend**: Located in `frontend/` directory, separate Git repo at [frontend Git URL]
- **Backend**: Root directory, Git repo at https://github.com/YaseenRehanMemon/backenddeployement.git
- **Deployment**: Backend deployed on Vercel at https://backenddeployement.vercel.app

## Technologies Used
- **Backend**: Node.js, Express, Multer, Sharp, Puppeteer (replaced with pdfbolt API), Google Gemini AI
- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **APIs**: pdfbolt for PDF generation, Google Gemini for MCQ extraction

## Current Issues
- **500 Internal Server Error on Vercel**: Upload endpoint fails with HTML error page instead of JSON. Likely due to file system writes in serverless (fixed by changing paths to /tmp). Previous issues: axios module not found, API keys missing.
- **File System in Serverless**: Changed paths to /tmp/uploads and /tmp/output for Vercel compatibility.
- **API Keys**: Hardcoded pdfbolt and Gemini keys in code for deployment.
- **Static File Serving**: /tmp files are ephemeral; downloads must occur within request.

## Steps Taken
- Replaced Puppeteer with pdfbolt API for easier deployment.
- Added vercel.json for backend configuration.
- Changed file paths to /tmp.
- Hardcoded API keys.
- Committed and pushed changes; awaiting redeploy.

## Next Steps
- Test upload after redeploy.
- If still failing, check Vercel logs, add timeouts, or debug with console.logs.
- Ensure frontend can download PDFs from /output paths.

## Code Locations
- Backend entry: server.js
- PDF service: services/pdfService.js
- AI service: services/aiService.js
- Upload middleware: middleware/uploadMiddleware.js