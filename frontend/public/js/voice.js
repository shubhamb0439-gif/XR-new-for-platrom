// public/js/voice.js
// VoiceController: Web Speech API wrapper matching your Android SpeechRecognizer flow.
// - Commands recognized (case-insensitive):
//   connect, disconnect
//   start stream, stop stream
//   mute (mic), unmute (mic)
//   hide video, show video
//   send urgent message / urgent message
//   note  -> starts note-taking mode (partial transcripts throttled)
//   create -> stops note-taking mode and emits final note
//
// Callbacks:
//   onCommand(action, rawText)       action ∈ ['connect','disconnect','start_stream','stop_stream','mute','unmute','hide_video','show_video','urgent','start_note','stop_note']
//   onTranscript(text, isFinal)      partial/final transcript text
//   onListenStateChange(isListening) true/false when recognition starts/stops
//   onError(error)                   string message/code
//
// Usage example:
//   import { VoiceController } from '/public/js/voice.js';
//   const voice = new VoiceController({
//     onCommand: (a, t) => console.log(a, t),
//     onTranscript: (txt, fin) => console.log(fin ? 'FINAL' : 'PART', txt),
//   });
//   voice.start(); // must be triggered from a user gesture in most browsers

export class VoiceController {
  /**
   * @param {Object} opts
   * @param {string} [opts.lang='en-US']
   * @param {boolean} [opts.continuous=true]
   * @param {boolean} [opts.interimResults=true]
   * @param {number} [opts.partialThrottleMs=800]
   * @param {(action:string, rawText:string)=>void} [opts.onCommand]
   * @param {(text:string, isFinal:boolean)=>void} [opts.onTranscript]
   * @param {(isListening:boolean)=>void} [opts.onListenStateChange]
   * @param {(err:string)=>void} [opts.onError]
   * @param {(data:{mrn:string, template:string, text:string})=>void} [opts.onMRNTemplateDetected]
   * @param {Array<{re:RegExp, action:string}>} [opts.customMap]  // optional extra phrases
   */
  constructor(opts = {}) {
    this.lang = opts.lang || 'en-US';
    this.continuous = opts.continuous !== false;
    this.interimResults = opts.interimResults !== false;
    this.partialThrottleMs = Number.isFinite(opts.partialThrottleMs)
      ? opts.partialThrottleMs : 800;

    this.onCommand = typeof opts.onCommand === 'function' ? opts.onCommand : () => { };
    this.onTranscript = typeof opts.onTranscript === 'function' ? opts.onTranscript : () => { };
    this.onListenStateChange = typeof opts.onListenStateChange === 'function' ? opts.onListenStateChange : () => { };
    this.onError = typeof opts.onError === 'function' ? opts.onError : () => { };
    this.onMRNTemplateDetected = typeof opts.onMRNTemplateDetected === 'function' ? opts.onMRNTemplateDetected : () => { };

    this._customMap = Array.isArray(opts.customMap) ? opts.customMap : [];

    this._SR = (typeof window !== 'undefined')
      ? (window.SpeechRecognition || window.webkitSpeechRecognition || null)
      : null;

    this._rec = null;
    this._listening = false;
    this._lastPartialAt = 0;

    this._noteMode = false;
    this._noteBuffer = '';

    this._fullTranscript = '';
    this._detectedMRN = null;
    this._detectedTemplate = null;

    this._bindHandlers();
  }

  static isAvailable() {
    return !!(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition));
    // For broader coverage, consider swapping to Azure/Vosk when unavailable.
  }

  isListening() { return this._listening; }

  setLanguage(lang) {
    this.lang = lang || 'en-US';
    if (this._rec) this._rec.lang = this.lang;
  }

  start() {
    if (!this._SR) { this.onError('speech_api_unavailable'); return false; }
    if (this._listening) return true;

    if (!this._rec) this._setup();

    try {
      this._rec.start();
      this._listening = true;
      this.onListenStateChange(true);
      return true;
    } catch (e) {
      this._listening = false;
      this.onListenStateChange(false);
      this.onError(this._errString(e));
      return false;
    }
  }

  stop() {
    if (!this._rec) return;
    try { this._rec.stop(); } catch { }
    this._listening = false;
    this.onListenStateChange(false);
    // If we were in note mode, finalize
    if (this._noteMode) this._emitStopNote();
  }

  destroy() {
    try { this.stop(); } catch { }
    this._rec = null;
  }

  // ---------------------- internals ----------------------

  _bindHandlers() {
    this._onResult = this._onResult.bind(this);
    this._onError = this._onError.bind(this);
    this._onEnd = this._onEnd.bind(this);
  }

  _setup() {
    this._rec = new this._SR();
    this._rec.lang = this.lang;
    this._rec.continuous = this.continuous;
    this._rec.interimResults = this.interimResults;

    this._rec.onresult = this._onResult;
    this._rec.onerror = this._onError;
    this._rec.onend = this._onEnd;
  }

  _onResult(e) {
    // Aggregate interim + final across results block
    let interim = '';
    let finalTxt = '';

    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      const txt = (res[0]?.transcript || '').toLowerCase().trim();
      if (!txt) continue;

      if (res.isFinal) finalTxt += (finalTxt ? ' ' : '') + txt;
      else interim += (interim ? ' ' : '') + txt;
    }

    // Partial transcript throttling
    if (interim) {
      const now = Date.now();
      if (now - this._lastPartialAt >= this.partialThrottleMs) {
        this._lastPartialAt = now;
        if (this._noteMode) {
          // Note mode buffers partials locally, still notify UI
          this.onTranscript(interim, false);
        } else {
          this.onTranscript(interim, false);
        }
      }
    }

    if (finalTxt) {
      // Add to full transcript for MRN/template detection
      this._fullTranscript += (this._fullTranscript ? ' ' : '') + finalTxt;

      // Detect MRN and template from the accumulated transcript
      this._detectMRNAndTemplate(this._fullTranscript);

      // If in note mode, buffer AND do not treat as a command
      if (this._noteMode) {
        this._noteBuffer += (this._noteBuffer ? ' ' : '') + finalTxt;
        this.onTranscript(finalTxt, true);
        // "create" stops note mode
        if (/\bcreate\b/.test(finalTxt)) {
          this._emitStopNote(); // includes final note buffer
        }
        return;
      }

      // Normal command mode
      const action = this._parseCommand(finalTxt);
      if (action) {
        this.onCommand(action, finalTxt);
      } else {
        // Deliver final transcript even if no command matched
        this.onTranscript(finalTxt, true);
      }
    }
  }

  _onError(ev) {
    const code = ev?.error || ev?.message || 'speech_error';
    this.onError(String(code));

    // Auto-restart on recoverable errors
    const recoverable = ['no-speech', 'aborted', 'audio-capture', 'network'];
    if (this._listening && recoverable.includes(code)) {
      try { this._rec.start(); } catch { }
    }
  }

  _onEnd() {
    // Chrome fires onend frequently; auto-restart if we want to keep listening
    if (this._listening) {
      try { this._rec.start(); } catch { }
    } else {
      this.onListenStateChange(false);
    }
  }

  _errString(e) {
    if (!e) return 'speech_error';
    if (typeof e === 'string') return e;
    return e.message || e.name || 'speech_error';
  }

  _emitStartNote() {
    if (this._noteMode) return;
    this._noteMode = true;
    this._noteBuffer = '';
    this.onCommand('start_note', 'note');
  }

  _emitStopNote() {
    if (!this._noteMode) return;
    this._noteMode = false;
    const finalNote = this._noteBuffer.trim();
    this._noteBuffer = '';
    // Emit final transcript of the note and a stop_note command
    if (finalNote) this.onTranscript(finalNote, true);
    this.onCommand('stop_note', 'create');
  }

  // ------------------ MRN and Template Detection ------------------

  _detectMRNAndTemplate(text) {
    if (!text) return;

    // Detect MRN
    const mrnMatch = this._detectMRN(text);
    if (mrnMatch && mrnMatch !== this._detectedMRN) {
      this._detectedMRN = mrnMatch;
      console.log('MRN detected:', mrnMatch);
    }

    // Detect template
    const templateMatch = this._detectTemplate(text);
    if (templateMatch && templateMatch !== this._detectedTemplate) {
      this._detectedTemplate = templateMatch;
      console.log('Template detected:', templateMatch);
    }

    // If both detected, emit event
    if (this._detectedMRN && this._detectedTemplate) {
      this.onMRNTemplateDetected({
        mrn: this._detectedMRN,
        template: this._detectedTemplate,
        text: this._fullTranscript
      });
    }
  }

  _detectMRN(text) {
    if (!text) return null;

    // Pattern 1: MRN followed by alphanumeric (MRNAB123, MRN-ABA121, MRN-0001ABC)
    const mrnPattern1 = /\b(MRN[-\s]?[A-Z0-9]+)\b/gi;
    const match1 = text.match(mrnPattern1);

    if (match1 && match1.length > 0) {
      return match1[0].replace(/\s+/g, '').replace(/-/g, '').toUpperCase();
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

  _detectTemplate(text) {
    if (!text) return null;

    const templates = [
      'SOAP Note',
      'Admission Note',
      'Consultation Note',
      'Diagnostic Report',
      'Discharge Summary',
      'Follow Up Visit Note',
      'Followup Visit',
      'History And Physical',
      'Hospital Followup Visit',
      'New Patient Visit',
      'Operative Report',
      'Preop Visit',
      'Procedure Note',
      'Procedure-Note Abdominal Aortography',
      'Procedure-Note Right And Left Heart Catheterization',
      'Progress Note Soap',
      'Stress Test Exercise MPI',
      'Telehealth Visit',
      'Vein Consult',
      'Vein Followup'
    ];

    const lowerText = text.toLowerCase();

    for (const template of templates) {
      const templateLower = template.toLowerCase();

      // Exact match
      if (lowerText.includes(templateLower)) {
        return template;
      }

      // Fuzzy match for multi-word templates
      const templateWords = templateLower.split(' ').filter(w => w.length > 2);
      if (templateWords.length > 1) {
        const allWordsPresent = templateWords.every(word => lowerText.includes(word));
        if (allWordsPresent) {
          return template;
        }
      }
    }

    return null;
  }

  resetDetection() {
    this._fullTranscript = '';
    this._detectedMRN = null;
    this._detectedTemplate = null;
  }

  getDetectedData() {
    return {
      mrn: this._detectedMRN,
      template: this._detectedTemplate,
      text: this._fullTranscript
    };
  }

  // ------------------ command parsing ------------------

  _parseCommand(s) {
    const text = String(s || '').toLowerCase().trim();
    if (!text) return null;

    // Custom overrides first
    for (const { re, action } of this._customMap) {
      if (re.test(text)) return action;
    }

    // Note-taking first (so "note" doesn't hit other rules)
    if (/\bnote\b/.test(text)) return (this._emitStartNote(), 'start_note');
    if (/\bcreate\b/.test(text)) return (this._emitStopNote(), 'stop_note');

    // Connect / disconnect
    if (/\bdisconnect\b/.test(text)) return 'disconnect';
    if (/\bconnect\b/.test(text)) return 'connect';

    // Unmute before mute to avoid matching "unmute" as "mute"
    if (/\bunmute(\s+mic(rophone)?)?\b/.test(text)) return 'unmute';
    if (/\bmute(\s+mic(rophone)?)?\b/.test(text)) return 'mute';

    // Start/Stop stream
    if (/\bstart( the)? (stream|video|camera)\b/.test(text)) return 'start_stream';
    if (/\bstop( the)? (stream|video|camera)\b/.test(text)) return 'stop_stream';

    // Hide/Show video
    if (/\bhide( the)? (video|camera|preview)?\b/.test(text)) return 'hide_video';
    if (/\bshow( the)? (video|camera|preview)?\b/.test(text)) return 'show_video';

    // Urgent message
    if (/\bsend( an)? urgent (message|alert)\b/.test(text)) return 'urgent';
    if (/\burgent\b.*\bmessage\b/.test(text)) return 'urgent';

    return null;
  }
}

// ---- ASR control helpers for UI (safe, additive) ----
// Allow UI to start/stop recognition without needing a direct ref.
// We look for a globally stored instance: window.voiceController or window.voice.
export function startRecognition() {
  try {
    const inst = (typeof window !== 'undefined') && (window.voiceController || window.voice);
    if (inst && typeof inst.start === 'function') inst.start();
  } catch { }
}

export function stopRecognition() {
  try {
    const inst = (typeof window !== 'undefined') && (window.voiceController || window.voice);
    if (inst && typeof inst.stop === 'function') inst.stop();
  } catch { }
}

// Optional: if a voice instance already exists on window, add helpers onto it.
// This does not override existing start()/stop(); it just adds new methods.
try {
  if (typeof window !== 'undefined') {
    const inst = window.voiceController || window.voice;
    if (inst && typeof inst === 'object') {
      inst.startRecognition = startRecognition;
      inst.stopRecognition = stopRecognition;
    }
  }
} catch { }


export default VoiceController;
