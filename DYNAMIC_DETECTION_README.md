# Dynamic MRN & Template Detection System

## Overview
This system provides **fully dynamic** MRN and template detection from voice transcription. NO hardcoded values are used - everything is loaded from your database/API at runtime.

## Files Changed

### New Files Created
1. **`/frontend/public/js/mrn-template-detector.js`** - Standalone MRN/Template detection utility
2. **`/frontend/public/js/scribe-storage.js`** - Local storage persistence
3. **`/frontend/views/voice-test.html`** - Interactive testing interface

### Modified Files
1. **`/frontend/public/js/voice.js`** - Added dynamic detection
2. **`/frontend/public/js/scribe-cockpit.js`** - Auto-detection integration
3. **`/frontend/views/scribe-cockpit.html`** - Voice controller setup

## Dynamic Features (NO Hardcoding)

### 1. MRN Detection (100% Dynamic)
The system uses **regex patterns** to detect ANY MRN format:

```javascript
// Pattern 1: MRN followed by ANY alphanumeric characters
/\b(MRN[-\s]?[A-Z0-9]+)\b/gi

// Matches:
// - MRNAB123
// - MRN-ABA121
// - MRN-0001ABC
// - MRN-0178HGR
// - MRNXYZ999
// - MRN 12345
// - Any other format starting with "MRN"
```

**Examples it handles:**
- `MRNAB123` ✓
- `MRN-ABA121` ✓
- `MRN-0001ABC` ✓
- `MRN-0178HGR` ✓
- `MRN123456789` ✓
- `MRNTEST001` ✓
- Any MRN in your database ✓

**NO MRN values are hardcoded!**

### 2. Template Detection (100% Dynamic)
Templates are loaded from your database at runtime:

```javascript
// Voice.js loads templates from:
1. API endpoint: /api/templates
2. DOM template dropdown
3. window.getAvailableTemplates()

// NO templates are hardcoded in the code!
```

**How templates are loaded:**
1. When page loads, `scribe-cockpit.js` fetches templates from `/api/templates`
2. Templates are populated in the dropdown
3. Voice controller automatically syncs with these templates
4. Detection works for ANY template in your database

**Examples it handles:**
- SOAP Note ✓
- Admission Note ✓
- Consultation Note ✓
- Diagnostic Report ✓
- Discharge Summary ✓
- **ANY custom template you add to the database** ✓

### 3. Database Integration

```
User Database
    ↓
/api/templates endpoint
    ↓
scribe-cockpit.js (initTemplateDropdown)
    ↓
Template Dropdown populated
    ↓
syncTemplatesWithVoiceController()
    ↓
Voice Controller updated with latest templates
    ↓
Detection works for ALL templates
```

## How to Add New Templates

Simply add templates to your database - **NO CODE CHANGES NEEDED!**

```sql
-- Example: Add new template to database
INSERT INTO templates (name, short_name)
VALUES ('Emergency Room Visit', 'ER Visit');

-- The system will automatically:
-- 1. Load it from /api/templates
-- 2. Show it in dropdown
-- 3. Enable voice detection for it
-- 4. Allow auto-selection when spoken
```

## How It Works

### Startup Flow
1. Page loads `scribe-cockpit.html`
2. `scribe-cockpit.js` runs `initTemplateDropdown()`
3. Fetches templates from `/api/templates` (your database)
4. Populates dropdown dynamically
5. Calls `syncTemplatesWithVoiceController()`
6. Voice controller receives template list
7. Ready to detect ANY template from database

### Detection Flow
1. User speaks: "This is patient MRN-XYZ789 for a consultation note"
2. Voice controller captures speech continuously
3. When user stops speaking, final transcript is processed
4. MRN detection: Uses regex to find "MRN-XYZ789" ✓
5. Template detection: Matches "consultation note" against database templates ✓
6. Auto-opens EHR with MRN-XYZ789 ✓
7. Auto-selects "Consultation Note" template ✓
8. Auto-generates note ✓

## Configuration

### Adding More MRN Formats
If you need to support additional MRN formats, modify the regex in `voice.js`:

```javascript
// Current patterns support:
// - MRN + alphanumeric (MRN123, MRNAB123, MRN-XYZ)
// - MRN + space + numbers (MRN 123)

// To add new pattern (e.g., "Patient ID 123"):
const customPattern = /\bPatient\s+ID\s+(\w+)\b/gi;
```

### Template Matching
Templates are matched using:
1. **Exact match**: "SOAP Note" matches "soap note"
2. **Fuzzy match**: "History And Physical" matches if user says "history" and "physical" close together

## API Requirements

Your backend must provide:

```javascript
// GET /api/templates
{
  "templates": [
    {
      "id": "1",
      "name": "SOAP Note",
      "short_name": "SOAP"
    },
    {
      "id": "2",
      "name": "Admission Note",
      "short_name": "Admission"
    }
    // ... all templates from database
  ]
}
```

## Testing

Visit `/views/voice-test.html` to test:
1. Start listening
2. Speak test phrases
3. See real-time MRN/template detection
4. Verify detection works for YOUR templates

## Summary

✅ **MRN Detection**: 100% dynamic using regex patterns
✅ **Template Detection**: 100% dynamic from database
✅ **NO hardcoded values**: Everything loaded at runtime
✅ **Easy to extend**: Just add to database, no code changes
✅ **Fully automatic**: Detection, EHR opening, template selection all automatic
✅ **Persistent**: Data saved in localStorage across sessions
✅ **Clean on close**: Data cleared when EHR slider closes

## Verification

To verify nothing is hardcoded, search the codebase:

```bash
# Should find NO hardcoded MRN values (only in comments/examples)
grep -r "MRNAB123" frontend/public/js/*.js

# Should find NO hardcoded template lists (only dynamic loading)
grep -r "const templates = \[" frontend/public/js/*.js
```

All MRN and template data comes from your database dynamically!
