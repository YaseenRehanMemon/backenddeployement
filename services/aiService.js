const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;

class AIService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  // Extract MCQs from image/PDF page
  async extractMCQsFromImage(imageData) {
    try {
      const prompt = `Extract all multiple-choice questions (MCQs) from this test page.
For each question, return a JSON object with:
- "question": full question text
- "options": object with keys A, B, C, D containing option text
- "correct_answer": if visible or inferable (otherwise null)

Important:
- Replace all mathematical expressions, equations, symbols, and formulas with LaTeX syntax
- Use \\\\( ... \\\\) for inline math
- Use \\\\[ ... \\\\] for display math equations
- Preserve all subscripts, superscripts, fractions, roots, integrals, etc. in LaTeX
- Examples:
  - 'v = u + at' becomes \\\\( v = u + at \\\\)
  - 'E = mc²' becomes \\\\( E = mc^2 \\\\)
  - 'F = ma' becomes \\\\( F = ma \\\\)
  - Fractions: 'a/b' becomes \\\\( \\\\frac{a}{b} \\\\)
  - Superscripts: 'x²' becomes \\\\( x^2 \\\\)
  - Subscripts: 'H₂O' becomes \\\\( H_2O \\\\)

Return ONLY valid JSON array, no markdown or code blocks.`;

      const imagePart = {
        inlineData: {
          data: imageData.toString('base64'),
          mimeType: 'image/jpeg'
        }
      };

      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      let text = response.text();

      console.log('Raw Gemini response:', text);

      // Clean response - remove markdown code blocks if present
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      console.log('Cleaned text:', text);

      // Parse and validate JSON
      let mcqs;
      try {
        mcqs = JSON.parse(text);
        if (!Array.isArray(mcqs)) {
          mcqs = [mcqs];
        }
        // Validate structure - allow for questions with A-E options
        mcqs = mcqs.filter(mcq =>
          mcq && typeof mcq === 'object' &&
          mcq.question && mcq.options &&
          typeof mcq.options === 'object' &&
          Object.keys(mcq.options).length >= 2 // At least 2 options must exist
        );
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
        console.error('Problematic text snippet:', text.length > 300 ? text.substring(0, 300) + '...' : text);
        return [];
      }
      return mcqs;

    } catch (error) {
      console.error('Error extracting MCQs:', error);
      return [];
    }
  }

  // Clean up and validate LaTeX formatting
  async cleanupLatex(mcqs) {
    if (!mcqs || mcqs.length === 0) return mcqs;
    try {
      const prompt = `Review this JSON array of MCQs and ensure all mathematical expressions are in correct LaTeX formatting.
Rules:
1. Convert any plain text math expressions to LaTeX if not already in delimiters
2. All math must use valid LaTeX syntax
3. Inline math: \\\\( ... \\\\)
4. Display math: \\\\[ ... \\\\]
5. Short options (≤15 chars) can be inline
6. Complex equations should be properly formatted
7. Fix any LaTeX syntax errors
8. Ensure consistent formatting
9. Examples of conversions:
   - 'v = u + at' -> \\\\( v = u + at \\\\)
   - 'E = mc²' -> \\\\( E = mc^2 \\\\)
   - '1/2' -> \\\\( \\\\frac{1}{2} \\\\)

Return the cleaned JSON array only, no markdown or explanations.`;

      const mcqsString = JSON.stringify(mcqs, null, 2);
      console.log('Input to cleanup:', mcqsString.substring(0, 200) + '...');
      const result = await this.model.generateContent([prompt, mcqsString]);
      const response = await result.response;
      let text = response.text();

      console.log('Raw cleanup response:', text.substring(0, 200) + '...');

      // Clean response
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      console.log('Cleaned cleanup text:', text.substring(0, 200) + '...');

      // Parse and validate JSON
      try {
        const cleanedMcqs = JSON.parse(text);
        if (!Array.isArray(cleanedMcqs)) {
          return mcqs; // Return original if not array
        }
        // Basic validation
        return cleanedMcqs.filter(mcq =>
          mcq && typeof mcq === 'object' && mcq.question && mcq.options
        );
      } catch (parseError) {
        console.error('Cleanup JSON parsing failed:', parseError);
        return mcqs; // Return original on failure
      }

    } catch (error) {
      console.error('Error cleaning LaTeX:', error);
      return mcqs; // Return original if cleanup fails
    }
  }
}

module.exports = new AIService();