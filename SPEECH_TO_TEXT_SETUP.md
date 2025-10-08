# Speech-to-Text Setup Guide for Quran Project

## 🎯 Available Options

### 1. **Web Speech API (Recommended - Already Implemented)**
- ✅ **Free** - No API keys needed
- ✅ **Real-time** - Instant transcription
- ✅ **Browser Support** - Chrome, Edge, Safari
- ✅ **Multiple Languages** - Arabic, English, etc.

**Usage:**
```javascript
// Already implemented in your VoiceSearch component
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
```

### 2. **react-speech-recognition (Enhanced Web Speech API)**
- ✅ **Better Error Handling**
- ✅ **React Hooks**
- ✅ **Cross-browser Support**

**Installation:**
```bash
npm install react-speech-recognition
```

**Usage:**
```javascript
import { useSpeechRecognition } from 'react-speech-recognition';

const {
  transcript,
  listening,
  resetTranscript,
  browserSupportsSpeechRecognition
} = useSpeechRecognition();
```

### 3. **Google Cloud Speech-to-Text**
- ✅ **High Accuracy** (95%+)
- ✅ **Arabic Support**
- ✅ **Server-side Processing**
- ❌ **Requires API Key**
- ❌ **Costs Money**

**Setup:**
1. Create Google Cloud account
2. Enable Speech-to-Text API
3. Create service account key
4. Set environment variable: `GOOGLE_APPLICATION_CREDENTIALS`

### 4. **AssemblyAI**
- ✅ **High Accuracy** (95%+)
- ✅ **Arabic Support**
- ✅ **Easy Integration**
- ❌ **Requires API Key**
- ❌ **Costs Money**

**Setup:**
1. Sign up at assemblyai.com
2. Get API key
3. Set environment variable: `ASSEMBLYAI_API_KEY`

## 🚀 Implementation Examples

### Basic Voice Search (Current Implementation)
```javascript
// Your current VoiceSearch.tsx already works great!
// Uses Web Speech API with fallback to server processing
```

### Enhanced Voice Search with react-speech-recognition
```javascript
import { useSpeechRecognition } from 'react-speech-recognition';

function EnhancedVoiceSearch() {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Auto-search when speech ends
  useEffect(() => {
    if (transcript && !listening) {
      performSearch(transcript);
    }
  }, [transcript, listening]);
}
```

### Server-side Processing
```javascript
// For high accuracy, use server-side processing
const formData = new FormData();
formData.append('audio', audioBlob);

const response = await fetch('/api/speech-to-text', {
  method: 'POST',
  body: formData,
});
```

## 🔧 Configuration Options

### Language Settings
```javascript
// Arabic (Saudi Arabia) - Best for Quran
language: 'ar-SA'

// English (US)
language: 'en-US'

// Multiple languages
alternativeLanguageCodes: ['en-US', 'ar-SA']
```

### Audio Quality Settings
```javascript
// High quality audio
const audioConfig = {
  sampleRateHertz: 48000,
  encoding: 'WEBM_OPUS',
  enableAutomaticPunctuation: true,
  model: 'latest_long'
};
```

## 💡 Best Practices for Quran Project

### 1. **Language Detection**
```javascript
// Detect if user is speaking Arabic or English
const detectLanguage = (text) => {
  const arabicRegex = /[\u0600-\u06FF]/;
  return arabicRegex.test(text) ? 'ar' : 'en';
};
```

### 2. **Error Handling**
```javascript
// Handle common errors
const handleSpeechError = (error) => {
  switch(error) {
    case 'no-speech':
      return 'No speech detected. Please try again.';
    case 'audio-capture':
      return 'Microphone access denied. Please allow microphone access.';
    case 'not-allowed':
      return 'Microphone access blocked. Please check browser settings.';
    default:
      return 'Speech recognition failed. Please try again.';
  }
};
```

### 3. **Fallback Strategy**
```javascript
// Try browser first, then server
const speechToText = async (audioBlob) => {
  try {
    // Try browser speech recognition first
    return await browserSpeechRecognition(audioBlob);
  } catch (error) {
    // Fallback to server processing
    return await serverSpeechRecognition(audioBlob);
  }
};
```

## 🎯 Recommended Setup for Your Project

### **For Development (Free)**
1. ✅ Use Web Speech API (already implemented)
2. ✅ Add react-speech-recognition for better UX
3. ✅ Implement fallback to server processing

### **For Production (High Accuracy)**
1. ✅ Keep Web Speech API for real-time feedback
2. ✅ Add Google Cloud Speech-to-Text for accuracy
3. ✅ Implement hybrid approach

## 🔑 Environment Variables Needed

```bash
# For Google Cloud Speech-to-Text
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

# For AssemblyAI
ASSEMBLYAI_API_KEY=your_assemblyai_api_key

# For Azure Speech (alternative)
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=your_azure_region
```

## 📱 Browser Support

| Browser | Web Speech API | react-speech-recognition |
|---------|---------------|-------------------------|
| Chrome  | ✅ Yes        | ✅ Yes                  |
| Edge    | ✅ Yes        | ✅ Yes                  |
| Safari  | ✅ Yes        | ✅ Yes                  |
| Firefox | ❌ No         | ❌ No                   |

## 🚀 Next Steps

1. **Test Current Implementation**: Your VoiceSearch already works!
2. **Add react-speech-recognition**: For better error handling
3. **Add Server Processing**: For higher accuracy
4. **Implement Language Detection**: Arabic vs English
5. **Add Confidence Scoring**: Show accuracy levels

Your current implementation is already excellent for a Quran learning app! The Web Speech API provides good accuracy for Arabic text recognition.
