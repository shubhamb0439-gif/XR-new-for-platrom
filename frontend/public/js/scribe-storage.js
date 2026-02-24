// scribe-storage.js
// Local storage management for MRN and template persistence

const STORAGE_KEYS = {
  CURRENT_MRN: 'scribe_current_mrn',
  CURRENT_TEMPLATE: 'scribe_current_template',
  CURRENT_TRANSCRIPT: 'scribe_current_transcript',
  SESSION_DATA: 'scribe_session_data'
};

export class ScribeStorage {
  static saveMRN(mrn) {
    if (!mrn) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_MRN, mrn);
      this._updateSessionData({ mrn });
    } catch (e) {
      console.error('Failed to save MRN:', e);
    }
  }

  static getMRN() {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_MRN) || null;
    } catch (e) {
      console.error('Failed to get MRN:', e);
      return null;
    }
  }

  static saveTemplate(template) {
    if (!template) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_TEMPLATE, template);
      this._updateSessionData({ template });
    } catch (e) {
      console.error('Failed to save template:', e);
    }
  }

  static getTemplate() {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_TEMPLATE) || null;
    } catch (e) {
      console.error('Failed to get template:', e);
      return null;
    }
  }

  static saveTranscript(transcript) {
    if (!transcript) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_TRANSCRIPT, transcript);
      this._updateSessionData({ transcript });
    } catch (e) {
      console.error('Failed to save transcript:', e);
    }
  }

  static getTranscript() {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_TRANSCRIPT) || null;
    } catch (e) {
      console.error('Failed to get transcript:', e);
      return null;
    }
  }

  static saveSessionData(data) {
    try {
      const existing = this.getSessionData();
      const updated = { ...existing, ...data, timestamp: Date.now() };
      localStorage.setItem(STORAGE_KEYS.SESSION_DATA, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save session data:', e);
    }
  }

  static getSessionData() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSION_DATA);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('Failed to get session data:', e);
      return {};
    }
  }

  static clearAll() {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
  }

  static clearMRN() {
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_MRN);
      const session = this.getSessionData();
      delete session.mrn;
      localStorage.setItem(STORAGE_KEYS.SESSION_DATA, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to clear MRN:', e);
    }
  }

  static clearTemplate() {
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_TEMPLATE);
      const session = this.getSessionData();
      delete session.template;
      localStorage.setItem(STORAGE_KEYS.SESSION_DATA, JSON.stringify(session));
    } catch (e) {
      console.error('Failed to clear template:', e);
    }
  }

  static _updateSessionData(data) {
    const existing = this.getSessionData();
    this.saveSessionData({ ...existing, ...data });
  }

  static hasActiveSession() {
    const session = this.getSessionData();
    return !!(session.mrn || session.template);
  }

  static getActiveSession() {
    return {
      mrn: this.getMRN(),
      template: this.getTemplate(),
      transcript: this.getTranscript(),
      ...this.getSessionData()
    };
  }
}

export default ScribeStorage;
