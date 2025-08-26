# Audio Interface Module Documentation

## Overview
This document provides comprehensive information about the `interface/audio.py` module, which implements speech recognition, text-to-speech, and AI-powered voice interaction capabilities. This module can be exported and integrated into React/FastAPI projects.

## Python Libraries Required

### Core Dependencies
```bash
pip install speech_recognition
pip install faster-whisper
pip install gtts
pip install edge-tts
pip install pydub
```

### Import Analysis
The `interface/audio.py` module uses the following imports:

```python
import asyncio

import speech_recognition as sr
import speech_recognition.recognizers.whisper_local.faster_whisper as whisper_r
from speech_recognition.recognizers.whisper_local.faster_whisper import InitOptionalParameters
from gtts import gTTS
import edge_tts
from pydub import AudioSegment
from pydub.playback import play
from io import BytesIO
```

### Import Details

#### 1. `asyncio`
- **Purpose**: Asynchronous programming support
- **Usage**: Enables async/await functionality for TTS operations
- **Key Functions**: `asyncio.run()` for running async functions from sync context
- **Version**: Built-in Python module (3.7+)

#### 2. `speech_recognition as sr`
- **Package**: `speech_recognition`
- **Purpose**: Core speech recognition functionality
- **Key Classes**:
  - `sr.Recognizer()`: Main recognition engine
  - `sr.Microphone()`: Audio input device interface
- **Usage**: Audio capture and processing pipeline

#### 3. `speech_recognition.recognizers.whisper_local.faster_whisper as whisper_r`
- **Package**: `faster-whisper` (via speech_recognition extension)
- **Purpose**: Local Whisper model integration
- **Key Functions**: `whisper_r.recognize()` for transcription
- **Advantages**: Offline processing, faster than cloud APIs

#### 4. `InitOptionalParameters`
- **Source**: `speech_recognition.recognizers.whisper_local.faster_whisper`
- **Purpose**: Type hints for Whisper initialization parameters
- **Usage**: Configuration dictionary for model setup
- **Example**:
  ```python
  params: InitOptionalParameters = {
      "device": "cpu",
      "compute_type": "float32",
  }
  ```

#### 5. `gTTS` (Google Text-to-Speech)
- **Package**: `gtts`
- **Purpose**: Google's text-to-speech service
- **Key Features**:
  - Multiple language support
  - High-quality voices
  - Internet connection required
- **Usage**: Legacy TTS fallback option

#### 6. `edge_tts`
- **Package**: `edge-tts`
- **Purpose**: Microsoft Edge's text-to-speech service
- **Key Features**:
  - Neural voice quality
  - Configurable speech rate
  - Multiple voice options
- **Usage**: Primary TTS solution

#### 7. `AudioSegment` from `pydub`
- **Package**: `pydub`
- **Purpose**: Audio file manipulation and processing
- **Key Features**:
  - Multiple audio format support
  - Audio effects and transformations
  - Speed control and playback
- **Usage**: Audio processing pipeline

#### 8. `play` from `pydub.playback`
- **Package**: `pydub`
- **Purpose**: Audio playback functionality
- **Usage**: Plays processed audio segments
- **Dependencies**: Requires system audio drivers

#### 9. `BytesIO` from `io`
- **Purpose**: In-memory file-like objects
- **Usage**: Temporary storage for audio data
- **Key Methods**:
  - `write()`: Store audio chunks
  - `seek(0)`: Reset to beginning
  - `read()`: Retrieve stored data

### Import Integration Patterns

#### Audio Processing Pipeline
```python
# 1. Audio Capture (speech_recognition)
mic = sr.Microphone()
with mic as source:
    audio = r.listen(source)

# 2. Transcription (faster_whisper)
text = whisper_r.recognize(recognizer=r, audio_data=audio, 
                          language="en", model="base",
                          init_options=params)

# 3. TTS Generation (edge_tts + BytesIO)
mp3_fp = BytesIO()
communicate = edge_tts.Communicate(text, voice="en-US-AriaNeural")
async for chunk in communicate.stream():
    if chunk["type"] == "audio":
        mp3_fp.write(chunk["data"])

# 4. Audio Playback (pydub)
mp3_fp.seek(0)
sound = AudioSegment.from_file(mp3_fp, format="mp3")
play(sound)
```

#### Async/Sync Integration
```python
# Sync wrapper for async TTS
def say(txt: str):
    asyncio.run(_say(txt))  # asyncio.run() bridges sync/async

async def _say(txt: str):
    # Async TTS processing
    communicate = edge_tts.Communicate(txt)
    # ... async processing
```

### Library Details

#### 1. Speech Recognition
- **Package**: `speech_recognition`
- **Purpose**: Audio capture and recognition
- **Key Features**: Microphone input, audio processing
- **Version**: Latest stable

#### 2. Faster Whisper
- **Package**: `faster-whisper` (via speech_recognition.recognizers.whisper_local)
- **Purpose**: Local speech-to-text transcription
- **Model**: Uses "base" model for English
- **Hardware**: CPU-based processing
- **Performance**: Optimized for speed and accuracy

#### 3. Text-to-Speech
- **Primary**: `edge-tts` (Microsoft Edge TTS)
  - Voice: "en-US-AriaNeural"
  - Speed: Configurable (default: +25%)
  - Quality: High-quality neural voice
- **Legacy**: `gtts` (Google Text-to-Speech)
  - Language: English
  - Speed: 2x playback speed

#### 4. Audio Processing
- **Package**: `pydub`
- **Purpose**: Audio file manipulation and playback
- **Features**: MP3 handling, audio playback, speed control

## AI Modules and Dependencies

### LLM Integration
- **Global Variable**: `_llm` (set via `set_llm()`)
- **Purpose**: Fuzzy matching for voice commands
- **Interface**: Requires `.invoke(prompt).text()` method
- **Usage**: Command disambiguation and intent recognition

### Whisper Configuration
```python
params: InitOptionalParameters = {
    "device": "cpu",
    "compute_type": "float32",
}
```

## Module Functions

### Core Functions

#### 1. `set_llm(llm_instance)`
- **Purpose**: Configure LLM instance for fuzzy matching
- **Parameters**: LLM instance with `.invoke()` method
- **Usage**: Must be called before using `ask_question()`

#### 2. `transcribe_audio() -> str`
- **Purpose**: Capture and transcribe microphone audio
- **Returns**: Lowercase transcribed text
- **Process**: 
  1. Activates microphone
  2. Listens for audio input
  3. Transcribes using Whisper
  4. Returns lowercase result

#### 3. `ask_question(q: str, options: list = None)`
- **Purpose**: Interactive voice Q&A with optional choices
- **Parameters**:
  - `q`: Question to ask (spoken via TTS)
  - `options`: List of valid answers (optional)
- **Returns**: User's answer (transcribed or fuzzy-matched)
- **Process**:
  1. Speaks the question
  2. Listens for answer
  3. Validates against options (if provided)
  4. Uses LLM fuzzy matching if needed

#### 4. `llm_fuzzy_match(raw, options)`
- **Purpose**: AI-powered command disambiguation
- **Parameters**:
  - `raw`: Raw transcribed text
  - `options`: List of valid options
- **Returns**: Best match from options or None
- **Prompt**: Structured prompt for LLM decision-making

### Text-to-Speech Functions

#### 5. `say(txt: str)`
- **Purpose**: Synchronous text-to-speech
- **Implementation**: Wrapper for async `_say()`
- **Usage**: Main TTS function for most use cases

#### 6. `_say(txt: str, speed: str = "+25%")`
- **Purpose**: Async text-to-speech with Edge TTS
- **Parameters**:
  - `txt`: Text to speak
  - `speed`: Speech rate (default: +25%)
- **Voice**: "en-US-AriaNeural"
- **Process**:
  1. Creates Edge TTS communication
  2. Streams audio chunks
  3. Converts to AudioSegment
  4. Plays audio

#### 7. `say_legacy(txt: str)`
- **Purpose**: Legacy Google TTS implementation
- **Features**: 2x speed playback
- **Usage**: Fallback option

## FastAPI Integration

### API Endpoints Structure
```python
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
import io

app = FastAPI()

@app.post("/transcribe")
async def transcribe_audio_endpoint(audio_file: UploadFile = File(...)):
    # Process uploaded audio file
    # Return transcribed text
    pass

@app.post("/tts")
async def text_to_speech_endpoint(text: str, speed: str = "+25%"):
    # Generate speech from text
    # Return audio stream
    pass

@app.post("/voice-question")
async def voice_question_endpoint(question: str, options: list = None):
    # Interactive voice Q&A
    # Return user response
    pass
```

### Audio File Handling
```python
# For file uploads instead of microphone
def transcribe_audio_file(audio_file_path: str) -> str:
    with sr.AudioFile(audio_file_path) as source:
        audio = r.record(source)
        return whisper_r.recognize(recognizer=r, audio_data=audio, 
                                 language="en", model="base",
                                 init_options=params).lower()
```

## React Integration

### Frontend Components

#### 1. Audio Recorder Component
```javascript
import React, { useState, useRef } from 'react';

const AudioRecorder = ({ onTranscription }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      chunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
      await uploadAudio(audioBlob);
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
    </div>
  );
};
```

#### 2. Text-to-Speech Player
```javascript
const TTSPlayer = ({ text, speed = "+25%" }) => {
  const playAudio = async () => {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, speed })
    });
    
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
  };

  return (
    <button onClick={playAudio}>
      Play Audio
    </button>
  );
};
```

## Environment Setup

### System Requirements
- **Python**: 3.8+
- **Audio**: Microphone access
- **Network**: Internet connection for Edge TTS
- **Memory**: Sufficient RAM for Whisper model

### Installation Commands
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install fastapi uvicorn
pip install speech_recognition
pip install faster-whisper
pip install gtts
pip install edge-tts
pip install pydub

# Additional for web interface
pip install python-multipart
pip install aiofiles
```

### Environment Variables
```bash
# Optional: Configure Whisper model path
WHISPER_MODEL_PATH=/path/to/whisper/models

# Optional: Configure TTS voice
TTS_VOICE=en-US-AriaNeural
TTS_SPEED=+25%
```

## Error Handling

### Common Issues
1. **Microphone Access**: Ensure proper permissions
2. **Whisper Model**: First run downloads model (~1GB)
3. **Audio Playback**: Check system audio settings
4. **Network**: Edge TTS requires internet connection

### Debugging
```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Test microphone
def test_microphone():
    try:
        mic = sr.Microphone()
        print("Microphone available")
    except Exception as e:
        print(f"Microphone error: {e}")
```

## Performance Considerations

### Optimization Tips
1. **Whisper Model**: Use smaller models for faster processing
2. **Audio Quality**: Optimize sample rate and format
3. **Caching**: Cache TTS audio for repeated phrases
4. **Async Processing**: Use background tasks for long operations

### Memory Management
- Whisper models load into memory
- Audio buffers should be cleared after processing
- Consider streaming for large audio files

## Security Considerations

### Audio Data
- Implement audio file size limits
- Validate audio formats
- Consider data retention policies
- Secure transmission (HTTPS)

### API Security
- Rate limiting for TTS endpoints
- Input validation and sanitization
- Authentication for sensitive operations
- CORS configuration for web clients

## Testing

### Unit Tests
```python
import unittest
from unittest.mock import Mock, patch

class TestAudioInterface(unittest.TestCase):
    def test_transcribe_audio(self):
        # Mock microphone and audio data
        pass
    
    def test_tts_generation(self):
        # Test text-to-speech functionality
        pass
    
    def test_fuzzy_matching(self):
        # Test LLM integration
        pass
```

### Integration Tests
- End-to-end voice interaction
- API endpoint testing
- Cross-platform compatibility
- Performance benchmarking

## Migration Checklist

### Pre-Migration
- [ ] Install all required Python packages
- [ ] Configure audio hardware
- [ ] Set up LLM instance
- [ ] Test microphone access
- [ ] Verify network connectivity

### Migration Steps
- [ ] Copy audio.py module
- [ ] Adapt for FastAPI endpoints
- [ ] Implement React components
- [ ] Configure CORS and security
- [ ] Test all functionality
- [ ] Optimize performance
- [ ] Deploy and monitor

### Post-Migration
- [ ] Monitor error logs
- [ ] Track performance metrics
- [ ] Gather user feedback
- [ ] Iterate and improve
