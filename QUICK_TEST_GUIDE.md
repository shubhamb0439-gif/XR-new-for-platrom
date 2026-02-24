# 🎤 Quick Voice Recognition Test Guide

## 🚀 Start Testing in 3 Steps

### 1️⃣ Start Server
```bash
npm start
```
Open: `http://localhost:8080/scribe-cockpit.html`

### 2️⃣ Check Green Badge
Look for: **🎤 Listening** (top right, animated)

If not visible → Check browser console for errors

### 3️⃣ Speak Test Phrases

## 📝 Test Phrases (Copy & Speak)

### MRN Detection Tests

✅ **Simple format:**
```
"Patient MRN AB123"
```
Expected: MRN field shows `MRNAB123`

✅ **Number only:**
```
"MRN 456"
```
Expected: Auto-converts to `MRNAB456`

✅ **Full sentence:**
```
"The patient's MRN is ABA121 for today's visit"
```
Expected: Extracts `MRNABA121`

✅ **Spelled out:**
```
"M R N A B one two three"
```
Expected: Converts to `MRNAB123`

---

### Template Detection Tests

✅ **Exact match:**
```
"Consultation note form"
```
Expected: Dropdown auto-selects "Consultation Note Form"

✅ **Partial match:**
```
"Let's use a consultation template"
```
Expected: Matches "Consultation Note Form" (70%+ match)

✅ **SOAP note:**
```
"Start a SOAP note"
```
Expected: Selects "SOAP Note"

---

### Combined Detection Test

✅ **Real-world scenario:**
```
"Patient MRN AB789 needs a consultation note form for today's appointment"
```

**Expected Results:**
- ✅ MRN field: `AB789` or `MRNAB789`
- ✅ Template: Auto-selected "Consultation Note Form"
- ✅ Toast notification shows both
- ✅ Console logs detection

---

## ✅ Success Checklist

- [ ] Green "🎤 Listening" badge visible
- [ ] Badge is animated/pulsing
- [ ] MRN auto-fills when spoken
- [ ] Template auto-selects when mentioned
- [ ] Toast notification appears
- [ ] Console shows detection logs
- [ ] Text is in correct order (not jumbled)

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| No green badge | Refresh page, check mic permissions |
| Badge not pulsing | CSS not loaded, hard refresh (Ctrl+Shift+R) |
| MRN not detected | Say "MRN" clearly before the code |
| Template not detected | Use dropdown names or similar words |
| Jumbled text | **SHOULD BE FIXED** - If still occurs, check console |
| No microphone access | Browser settings → Allow microphone |

---

## 🔍 Console Commands

Open browser console (F12) and try:

```javascript
// Check if loaded
window.voiceController

// Check detected data
window.voiceController.getDetectedData()

// Reset detection
window.resetVoiceDetection()

// Restart listening
window.voiceController.start()

// Get available templates
window.getAvailableTemplates()
```

---

## 📊 What Should Happen

**When you speak: "Patient MRN AB123 consultation note form"**

1. **Immediate:** Green badge pulses
2. **During speech:** Partial transcripts in console
3. **After speech:** Final transcript logged
4. **Detection:** MRN and template identified
5. **Auto-fill:** Both fields populate
6. **Notification:** Toast appears with values
7. **Console logs:**
   ```
   [MRN DETECTED] MRNAB123 from: MRN AB123
   [TEMPLATE DETECTED] Consultation Note Form (100%)
   [VOICE] ✅ MRN/Template Auto-Detected
   [VOICE] Auto-filled MRN: MRNAB123
   [VOICE] Auto-selected template: Consultation Note Form
   ```

---

## 🎯 Key Improvements

| Feature | Status |
|---------|--------|
| Sentence order | ✅ Fixed - Sequential processing |
| MRN detection | ✅ 5 pattern matching |
| Template detection | ✅ Fuzzy 70% matching |
| Word accuracy | ✅ Enhanced with grammar hints |
| Visual feedback | ✅ Animated green badge |
| Auto-fill | ✅ Both fields populate |

---

## 📞 Support

If issues persist:
1. Check `VOICE_RECOGNITION_TESTING_GUIDE.md` for detailed info
2. Check `VOICE_FIX_SUMMARY.md` for technical details
3. Check browser console for error messages
4. Test in Chrome/Edge (best support)

---

**Quick test:** Just say **"MRN AB123 consultation note"** and watch the magic! ✨
