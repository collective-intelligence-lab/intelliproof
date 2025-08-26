#!/usr/bin/env python3
"""
Test script for the audio module
"""

import sys
import os
import logging

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_audio_imports():
    """Test that all audio dependencies can be imported"""
    try:
        import speech_recognition as sr
        logger.info("✓ speech_recognition imported successfully")
        
        from faster_whisper import WhisperModel
        logger.info("✓ faster_whisper imported successfully")
        
        from gtts import gTTS
        logger.info("✓ gTTS imported successfully")
        
        import edge_tts
        logger.info("✓ edge_tts imported successfully")
        
        from pydub import AudioSegment
        logger.info("✓ pydub imported successfully")
        
        return True
        
    except ImportError as e:
        logger.error(f"✗ Import error: {e}")
        return False

def test_audio_module():
    """Test the audio module functions"""
    try:
        from audio import transcribe_audio, say, transcribe_audio_bytes
        
        logger.info("✓ Audio module imported successfully")
        
        # Test basic functionality without requiring microphone
        logger.info("Testing audio module basic functionality...")
        
        # Test that the module can be imported and functions exist
        assert callable(transcribe_audio)
        assert callable(say)
        assert callable(transcribe_audio_bytes)
        
        logger.info("✓ All audio functions are callable")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Audio module test failed: {e}")
        return False

def test_whisper_models():
    """Test that Whisper models can be loaded"""
    try:
        from faster_whisper import WhisperModel
        
        # Test Whisper model creation
        model = WhisperModel("base", device="cpu", compute_type="float32")
        
        logger.info("✓ Whisper model created successfully")
        logger.info(f"  Model: base")
        logger.info(f"  Device: cpu")
        logger.info(f"  Compute type: float32")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Whisper model test failed: {e}")
        return False

def test_tts_functionality():
    """Test text-to-speech functionality"""
    try:
        import asyncio
        import edge_tts
        from io import BytesIO
        
        async def test_edge_tts():
            # Test Edge TTS communication
            communicate = edge_tts.Communicate("Hello, this is a test.", voice="en-US-AriaNeural")
            
            # Stream audio chunks
            mp3_fp = BytesIO()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    mp3_fp.write(chunk["data"])
            
            # Check if we got some audio data
            mp3_fp.seek(0)
            audio_data = mp3_fp.getvalue()
            
            if len(audio_data) > 0:
                logger.info(f"✓ Edge TTS generated {len(audio_data)} bytes of audio data")
                return True
            else:
                logger.error("✗ Edge TTS generated no audio data")
                return False
        
        # Run the async test
        result = asyncio.run(test_edge_tts())
        return result
        
    except Exception as e:
        logger.error(f"✗ TTS test failed: {e}")
        return False

def main():
    """Run all tests"""
    logger.info("Starting audio module tests...")
    
    tests = [
        ("Audio Imports", test_audio_imports),
        ("Audio Module", test_audio_module),
        ("Whisper Models", test_whisper_models),
        ("TTS Functionality", test_tts_functionality),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        logger.info(f"\n--- Testing {test_name} ---")
        try:
            if test_func():
                passed += 1
                logger.info(f"✓ {test_name} passed")
            else:
                logger.error(f"✗ {test_name} failed")
        except Exception as e:
            logger.error(f"✗ {test_name} failed with exception: {e}")
    
    logger.info(f"\n--- Test Results ---")
    logger.info(f"Passed: {passed}/{total}")
    
    if passed == total:
        logger.info("🎉 All tests passed! Audio module is ready to use.")
        return 0
    else:
        logger.error("❌ Some tests failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
