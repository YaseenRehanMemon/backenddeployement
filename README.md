# 🎓 Govt. Degree College Hingorja - AI Test Digitalization System

## 📋 Overview
Automated system for converting handwritten/printed test papers into professional A4 PDFs using AI.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file:
```
GEMINI_API_KEY=your_api_key_here
PORT=3000
```

### 3. Add College Logo
Place your college logo as `logo.png` in the `assets/` folder.

### 4. Start Server
```bash
npm start
```

## 📁 API Endpoints

### POST /upload_test
Upload test images or PDFs for processing.

**Form Data:**
- `files`: Image/PDF files (multiple allowed)
- `instructor`: Teacher name
- `subject`: Subject name
- `class`: Class/Grade
- `date`: Test date
- `time`: Test duration
- `maxMarks`: Maximum marks
- `minMarks`: Minimum passing marks

**Response:**
```json
{
  "success": true,
  "files": {
    "pdf": "output/final_test.pdf",
    "json": "output/extracted_data.json"
  },
  "stats": {
    "totalQuestions": 50,
    "pagesProcessed": 3
  }
}
```

## 🧩 Features
- ✅ Multi-page PDF support
- ✅ Batch image processing
- ✅ LaTeX math rendering
- ✅ Automatic layout optimization
- ✅ Professional A4 formatting
- ✅ College branding header
- ✅ Smart option layout (inline/grid/vertical)
- ✅ 2-page limit with auto-scaling

## 📄 Output Format
- **Page 1**: Header with college branding + questions
- **Page 2**: Continuation of questions + footer
- Font auto-scales to fit all content in exactly 2 pages

## 🛠️ Technology Stack
- Node.js + Express
- Gemini 2.5 Flash AI
- PDFKit for generation
- KaTeX for math rendering
- Sharp for image processing

## 📝 License
Govt. Degree College Hingorja - Internal Use