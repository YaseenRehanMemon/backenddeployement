# 🧾 Product Requirements Document (PRD)
## Project Name: Government Degree College Hingorja – Test Maker

---

## 🏫 1. Overview

**Goal:**  
To create a simple, AI-assisted web app that converts handwritten college test papers (MCQs, short, or long questions) from **images or PDFs** into a **clean, two-page, printable A4 PDF** — ready for printing and distribution.

**Problem:**  
Teachers at Government Degree College Hingorja prepare handwritten tests which must be manually typed before printing. This is time-consuming and error-prone, especially for subjects like Physics, Chemistry, and Math, where equations are complex.

**Solution:**  
The Test Maker app automates this by allowing the operator to upload handwritten test images or PDFs. The app uses **Gemini 2.5 Flash** for AI-based text and equation extraction, automatically formatting everything neatly into a **two-page, double-sided A4 layout**.

---

## 🎯 2. Objectives & Goals

### **Main Goal**
> Upload handwritten test (images or PDF) → AI converts → Get final, printable, two-page PDF.

### **Sub-Goals**
- Automatically detect and format text + equations.
- Fit all questions neatly within **two A4 pages**.
- Maintain subject-specific formatting consistency.
- Allow quick manual corrections before final output.

---

## 🧑‍💻 3. Users & Use Cases

### **Primary User**
- **College Computer Operator**
  - Receives handwritten tests from teachers.
  - Uploads them to the Test Maker web app.
  - Previews, corrects, and prints the final test paper.

### **Access**
- **No login or authentication** required.
- Deployed publicly on **Vercel** for instant use.
- Works on both desktop and mobile browsers.

### **Use Flow**
1. Open the web app link.  
2. Upload a single image, two images, or a PDF.  
3. Gemini 2.5 Flash extracts text + equations.  
4. Preview and edit extracted content.  
5. Apply changes and generate the final A4 PDF.  
6. Print and distribute.

### **Data Storage**
- **No data storage**.  
- Files and generated PDFs are processed in-memory only.  
- Deleted immediately after session ends.

---

## ⚙️ 4. Features & Scope

### **Included in Version 1 (MVP)**
- ✅ Upload images (JPG, PNG) or PDFs.
- ✅ AI text extraction (Gemini 2.5 Flash).
- ✅ LaTeX detection & rendering (KaTeX).
- ✅ PDF auto-layout (fit all questions into 2 pages A4).
- ✅ Preview window with live edits.
- ✅ Apply per-question/per-option corrections.
- ✅ Download or Print final PDF.
- ✅ Dark theme interface.
- ✅ Support for test headers:
  - College Logo
  - College Name
  - Subject
  - Subject Teacher
  - Class
  - Date
  - Max Marks
  - Min Marks
  - Duration
  - Student Name & Section field

### **Excluded (Out of Scope)**
- ❌ User login / authentication  
- ❌ Data storage or history  
- ❌ Multi-language OCR  
- ❌ Diagram or image extraction  
- ❌ Answer key generation  
- ❌ Analytics or tracking

### **Future (Nice to Have)**
- 🔹 Teacher login & test history  
- 🔹 Auto answer key detection  
- 🔹 Multi-language support  
- 🔹 Handwritten diagram extraction  
- 🔹 Cloud sync or Google Drive export  

---

## 🧠 5. Technical Approach

### **Frontend Stack**
- **Next.js (React Framework)** – for serverless web app
- **TailwindCSS + Shadcn UI** – minimal dark mode UI using pre-built components
- **React Dropzone / FilePond** – drag-and-drop upload field
- **KaTeX** – render LaTeX equations cleanly
- **React PDF / PDFKit / Puppeteer** – to create two-page printable PDF layout

### **AI Integration**
- **Gemini 2.5 Flash**  
  - Extracts handwritten text and equations.
  - Outputs structured text blocks, recognized equations, and section markers (e.g., MCQs, short, long).

### **PDF Layout Rules**
- Final PDF = **2 pages (A4)**  
- Each test fits **within two sides** (front & back).  
- Auto-adjust font size and spacing to maintain balance.  
- All headers and footers consistent (college branding).

### **LaTeX Handling Strategy**
- Extract math regions separately.
- Use KaTeX to render equations.
- If parsing fails → fallback to plain text.
- Inline math uses `$ ... $`; display math uses `$$ ... $$`.

---

## 📊 6. Success Metrics

| Metric | Target |
|--------|--------|
| **AI Text Accuracy** | ≥ 90% for typed equations & text |
| **Final Test Creation Time** | < 10 minutes |
| **Manual Edits Needed** | ≤ 2 per test (avg) |
| **Print Quality** | Perfect alignment on 2 A4 pages |
| **User Effort** | No technical knowledge required |

---

## 🚧 7. Risks & Dependencies

### **Major Risks**
| Risk | Description | Mitigation |
|------|--------------|-------------|
| **LaTeX Handling** | AI may misdetect handwritten equations. | Use KaTeX with fallback; allow quick edit UI. |
| **Page Fitting** | Variable question lengths may exceed 2 pages. | Dynamic scaling and margin compression. |
| **OCR Accuracy** | Handwriting differences may reduce accuracy. | Manual preview editing before finalization. |
| **File Size Limits** | Large PDFs/images slow AI extraction. | Restrict upload size ≤ 10 MB. |
| **Print Layout Shift** | Printers may scale pages. | Fixed CSS print settings and margin locks. |

### **Dependencies**
| Dependency | Purpose |
|-------------|----------|
| **Gemini 2.5 Flash** | OCR + LaTeX extraction |
| **KaTeX** | Render equations |
| **Next.js** | Framework |
| **Tailwind + Shadcn** | Styling & components |
| **React PDF / PDFKit** | PDF generation |
| **College Logo (provided path)** | Branding for header |

---

## ✅ 8. MVP Definition

The **Minimum Viable Product (MVP)** will:
- Convert handwritten test → AI text → PDF  
- Auto-handle equations  
- Fit everything on 2 A4 pages  
- Allow quick edits before final PDF  
- Be deployable via Vercel  
- Require **no login, no setup, no storage**

**Goal:** Create a test paper ready for print in **under 10 minutes**, fully verified through step-by-step tests in Cursor AI after each module build.

---

## 💬 9. Notes for Development in Cursor AI

- Each feature (upload, AI extract, LaTeX render, PDF preview, print) should be tested independently.  
- After every implementation step, **run automatic test** in Cursor to confirm:  
  - Output correctness  
  - Error handling  
  - Layout fit within 2 pages  
  - Compatibility with both image & PDF uploads  
- Use **component-based libraries** to reduce code size and complexity.  
- Keep the app stateless (no local or cloud storage).

---

### ✅ Final Statement
> The “Government Degree College Hingorja Test Maker” is a focused, single-purpose, AI-assisted web app designed for ease of use, zero setup, and maximum productivity. It empowers the college operator to create printable, double-sided tests directly from handwritten input — fast, accurate, and beautifully formatted.
