# Audio Module Setup Guide

This guide explains how to set up and use the audio module for speech recognition and text-to-speech functionality.

## Prerequisites

- Python 3.8 or higher
- Microphone access
- Internet connection (for Edge TTS)
- Node.js and npm (for frontend)

## Backend Setup

### 1. Install Python Dependencies

Navigate to the backend directory and install the required packages:

```bash
cd backend
pip install -r requirements.txt
```

### 2. Install Additional Audio Dependencies

The audio module requires several additional packages:

```bash
pip install speech_recognition==3.10.0
pip install faster-whisper==0.9.0
pip install gtts==2.4.0
pip install edge-tts==6.1.9
pip install pydub==0.25.1
```

### 3. System Dependencies

#### macOS
```bash
# Install ffmpeg for audio processing
brew install ffmpeg

# Install portaudio for microphone access
brew install portaudio
```

#### Ubuntu/Debian
```bash
# Install system dependencies
sudo apt-get update
sudo apt-get install -y ffmpeg portaudio19-dev python3-pyaudio
```

#### Windows
- Download and install ffmpeg from https://ffmpeg.org/download.html
- Install PyAudio: `pip install pyaudio`

### 4. Test the Audio Module

Run the test script to verify everything is working:

```bash
cd backend
python test_audio.py
```

You should see output like:
```
Starting audio module tests...

--- Testing Audio Imports ---
✓ speech_recognition imported successfully
✓ faster_whisper imported successfully
✓ gTTS imported successfully
✓ edge_tts imported successfully
✓ pydub imported successfully
✓ Audio Imports passed

--- Testing Audio Module ---
✓ Audio module imported successfully
✓ All audio functions are callable
✓ Audio Module passed

--- Testing Whisper Models ---
✓ Whisper configuration created successfully
  Device: cpu
  Compute type: float32
✓ Whisper Models passed

--- Testing TTS Functionality ---
✓ Edge TTS generated 12345 bytes of audio data
✓ TTS Functionality passed

--- Test Results ---
Passed: 4/4
🎉 All tests passed! Audio module is ready to use.
```

## Frontend Setup

### 1. Install Node.js Dependencies

```bash
npm install form-data @types/form-data
```

### 2. Environment Variables

Create or update your `.env.local` file:

```env
BACKEND_URL=http://localhost:8000
```

## Usage

### Backend API Endpoints

The audio module provides the following endpoints:

#### 1. Transcribe Microphone Input
```http
POST /api/audio/transcribe-microphone
```

#### 2. Transcribe Audio File
```http
POST /api/audio/transcribe-file
Content-Type: multipart/form-data

Form data:
- audio_file: Audio file (WAV, MP3, M4A)
```

#### 3. Text-to-Speech
```http
POST /api/audio/tts
Content-Type: application/json

{
  "text": "Hello, world!",
  "speed": "+25%"
}
```

#### 4. Health Check
```http
GET /api/audio/health
```

### Frontend Integration

The audio functionality is integrated into the claim properties modal. Users can:

1. Click the microphone button in the claim text area
2. Speak their claim
3. Click the button again to stop recording
4. The transcribed text will be appended to the existing claim text

### AudioRecorder Component

The `AudioRecorder` component handles:
- Microphone access and permissions
- Audio recording and playback
- File upload to backend
- Transcription display
- Error handling

## Troubleshooting

### Common Issues

#### 1. Microphone Access Denied
- Check browser permissions
- Ensure microphone is not being used by another application
- Try refreshing the page

#### 2. Whisper Model Download Issues
- The first run will download the Whisper model (~1GB)
- Ensure stable internet connection
- Check available disk space

#### 3. Audio Playback Issues
- Check system audio settings
- Ensure audio drivers are installed
- Try different audio formats

#### 4. Backend Connection Issues
- Verify backend server is running
- Check `BACKEND_URL` environment variable
- Ensure CORS is properly configured

### Debug Mode

Enable debug logging by setting the log level:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Performance Optimization

#### 1. Whisper Model Size
- Use smaller models for faster processing
- Available models: `tiny`, `base`, `small`, `medium`, `large`

#### 2. Audio Quality
- Optimize sample rate and format
- Use WAV format for best compatibility

#### 3. Caching
- Cache TTS audio for repeated phrases
- Consider pre-loading common responses

## Security Considerations

### Audio Data
- Implement file size limits (default: 50MB)
- Validate audio formats
- Consider data retention policies
- Use HTTPS for secure transmission

### API Security
- Implement rate limiting
- Add authentication for sensitive operations
- Validate and sanitize input
- Configure CORS properly

## Development

### Testing

Run the test suite:
```bash
cd backend
python test_audio.py
```

### Manual Testing

Test microphone transcription:
```bash
cd backend
python -c "from audio import transcribe_audio; print(transcribe_audio())"
```

Test text-to-speech:
```bash
cd backend
python -c "from audio import say; say('Hello, this is a test')"
```

### Adding New Features

1. Update the audio module (`audio.py`)
2. Add corresponding API endpoints (`audio_api.py`)
3. Update frontend components if needed
4. Add tests to `test_audio.py`
5. Update documentation

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the test output
3. Check browser console for frontend errors
4. Review backend logs for server errors
