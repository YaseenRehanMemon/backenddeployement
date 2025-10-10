const katex = require('katex');

class KatexRenderer {
    renderToSVG(latex) {
        try {
            // Render LaTeX to HTML/SVG
            const html = katex.renderToString(latex, {
                throwOnError: false,
                output: 'html',
                displayMode: false
            });
            
            // Extract SVG if present
            const svgMatch = html.match(/<svg[^>]*>.*?<\/svg>/s);
            return svgMatch ? svgMatch[0] : html;
            
        } catch (error) {
            console.error('LaTeX rendering error:', error);
            return latex; // Return original if rendering fails
        }
    }

    renderInline(latex) {
        return this.renderToSVG(latex);
    }

    renderDisplay(latex) {
        const html = katex.renderToString(latex, {
            throwOnError: false,
            output: 'html',
            displayMode: true
        });
        
        const svgMatch = html.match(/<svg[^>]*>.*?<\/svg>/s);
        return svgMatch ? svgMatch[0] : html;
    }
}

module.exports = new KatexRenderer();