// mrn-template-detector.js
// Utility for detecting MRN numbers and templates from speech transcription

export class MRNTemplateDetector {
  constructor() {
    this.templates = [];
    this._loadTemplates();
  }

  async _loadTemplates() {
    try {
      // Try to get templates from window (injected by scribe-cockpit)
      if (window.getAvailableTemplates && typeof window.getAvailableTemplates === 'function') {
        const templates = await window.getAvailableTemplates();
        if (templates && templates.length > 0) {
          this.templates = templates;
          console.log('[MRN-DETECTOR] Loaded templates dynamically:', templates.length);
          return;
        }
      }

      // Fallback: try to get from DOM
      const templateSelect = document.getElementById('templateSelect');
      if (templateSelect) {
        const options = Array.from(templateSelect.options);
        this.templates = options
          .filter(opt => opt.value && !opt.disabled)
          .map(opt => opt.textContent.trim());
        console.log('[MRN-DETECTOR] Loaded templates from DOM:', this.templates.length);
      }
    } catch (e) {
      console.warn('[MRN-DETECTOR] Could not load templates:', e);
    }
  }

  /**
   * Detect MRN from text
   * Supports formats: MRNAB123, MRN-ABA121, MRN-0001ABC, MRN 123, etc.
   * @param {string} text - The transcription text
   * @returns {string|null} - Detected MRN or null
   */
  detectMRN(text) {
    if (!text) return null;

    // Pattern 1: MRN followed by alphanumeric (MRNAB123, MRN-ABA121, MRN-0001ABC)
    const mrnPattern1 = /\b(MRN[-\s]?[A-Z0-9]+)\b/gi;
    const match1 = text.match(mrnPattern1);

    if (match1 && match1.length > 0) {
      // Clean up the MRN (remove spaces, normalize)
      return match1[0].replace(/\s+/g, '').toUpperCase();
    }

    // Pattern 2: Spoken format "MRN 123" -> convert to MRNAB123
    const mrnPattern2 = /\bMRN\s+(\d+)\b/gi;
    const match2 = text.match(mrnPattern2);

    if (match2 && match2.length > 0) {
      const numbers = match2[0].match(/\d+/)[0];
      return `MRNAB${numbers}`;
    }

    return null;
  }

  /**
   * Detect template from text
   * @param {string} text - The transcription text
   * @returns {string|null} - Detected template name or null
   */
  detectTemplate(text) {
    if (!text) return null;

    const lowerText = text.toLowerCase();

    // Check each template
    for (const template of this.templates) {
      const templateLower = template.toLowerCase();

      // Exact match or fuzzy match
      if (lowerText.includes(templateLower)) {
        return template;
      }

      // Handle variations (e.g., "soap note" vs "soap")
      const templateWords = templateLower.split(' ');
      const allWordsPresent = templateWords.every(word =>
        lowerText.includes(word)
      );

      if (allWordsPresent && templateWords.length > 1) {
        // Check if words appear in close proximity (within 5 words)
        const positions = templateWords.map(word => {
          const idx = lowerText.indexOf(word);
          return idx >= 0 ? idx : Infinity;
        });

        const maxDistance = Math.max(...positions) - Math.min(...positions);
        const avgWordLength = 6; // average word length + space

        if (maxDistance < templateWords.length * avgWordLength * 3) {
          return template;
        }
      }
    }

    return null;
  }

  /**
   * Extract both MRN and template from text
   * @param {string} text - The transcription text
   * @returns {{mrn: string|null, template: string|null}}
   */
  extract(text) {
    return {
      mrn: this.detectMRN(text),
      template: this.detectTemplate(text)
    };
  }

  /**
   * Add custom template to the list
   * @param {string} templateName
   */
  addTemplate(templateName) {
    if (templateName && !this.templates.includes(templateName)) {
      this.templates.push(templateName);
    }
  }

  /**
   * Load templates from database or API
   * @param {Array<string>} templates
   */
  setTemplates(templates) {
    if (Array.isArray(templates)) {
      this.templates = templates;
    }
  }

  /**
   * Get all available templates
   * @returns {Array<string>}
   */
  getTemplates() {
    return [...this.templates];
  }
}

// Singleton instance
export const mrnTemplateDetector = new MRNTemplateDetector();

export default MRNTemplateDetector;
