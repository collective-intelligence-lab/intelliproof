import asyncio
import speech_recognition as sr
from faster_whisper import WhisperModel
import logging
from typing import Optional
import tempfile
import os
from gtts import gTTS
import edge_tts
from pydub import AudioSegment
from pydub.playback import play
from io import BytesIO
import logging
from typing import Optional
import tempfile
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global LLM instance for fuzzy matching (optional)
_llm = None

# Whisper model instance
_whisper_model = None

def get_whisper_model():
    """Get or create Whisper model instance"""
    global _whisper_model
    if _whisper_model is None:
        _whisper_model = WhisperModel("base", device="cpu", compute_type="float32")
    return _whisper_model

def set_llm(llm_instance):
    """Configure LLM instance for fuzzy matching"""
    global _llm
    _llm = llm_instance

def transcribe_audio() -> str:
    """
    Capture and transcribe microphone audio
    Returns: Lowercase transcribed text
    """
    try:
        # Initialize recognizer
        r = sr.Recognizer()
        
        # Use microphone as source
        with sr.Microphone() as source:
            logger.info("Listening for audio input...")
            
            # Adjust for ambient noise
            r.adjust_for_ambient_noise(source, duration=0.5)
            
            # Listen for audio input
            audio = r.listen(source, timeout=10, phrase_time_limit=30)
            
            logger.info("Audio captured, transcribing...")
            
            # Convert audio to WAV format for Whisper
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
                audio.export(temp_file.name, format="wav")
                temp_file_path = temp_file.name
            
            try:
                # Transcribe using Whisper
                model = get_whisper_model()
                segments, info = model.transcribe(temp_file_path, language="en")
                
                # Collect transcribed text
                text = " ".join([segment.text for segment in segments])
                
                logger.info(f"Transcription completed: {text}")
                return text.lower()
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
            
    except sr.WaitTimeoutError:
        logger.warning("No audio detected within timeout period")
        return ""
    except sr.UnknownValueError:
        logger.warning("Could not understand audio")
        return ""
    except Exception as e:
        logger.error(f"Error during transcription: {e}")
        return ""

def transcribe_audio_file(audio_file_path: str) -> str:
    """
    Transcribe audio from a file
    Args:
        audio_file_path: Path to the audio file
    Returns: Lowercase transcribed text
    """
    logger.info(f"🔍 [Audio Module] transcribe_audio_file called with path: {audio_file_path}")
    
    try:
        # Check if file exists
        if not os.path.exists(audio_file_path):
            logger.error(f"❌ [Audio Module] File does not exist: {audio_file_path}")
            return ""
        
        logger.info(f"✅ [Audio Module] File exists, size: {os.path.getsize(audio_file_path)} bytes")
        logger.info(f"🔍 [Audio Module] Processing audio file: {audio_file_path}")
        
        # Transcribe using Whisper
        logger.info("🔍 [Audio Module] Getting Whisper model...")
        model = get_whisper_model()
        logger.info("✅ [Audio Module] Whisper model loaded")
        
        logger.info("🔍 [Audio Module] Starting Whisper transcription...")
        segments, info = model.transcribe(audio_file_path, language="en")
        logger.info("✅ [Audio Module] Whisper transcription completed")
        
        # Collect transcribed text
        text = " ".join([segment.text for segment in segments])
        
        logger.info(f"✅ [Audio Module] File transcription completed: '{text}'")
        return text.lower()
        
    except Exception as e:
        logger.error(f"❌ [Audio Module] Error transcribing audio file: {e}")
        logger.error(f"❌ [Audio Module] Error type: {type(e).__name__}")
        logger.error(f"❌ [Audio Module] Error details: {str(e)}")
        return ""

def transcribe_audio_bytes(audio_bytes: bytes, audio_format: str = "wav") -> str:
    """
    Transcribe audio from bytes data
    Args:
        audio_bytes: Audio data as bytes
        audio_format: Format of the audio (wav, mp3, etc.)
    Returns: Lowercase transcribed text
    """
    logger.info(f"🔍 [Audio Module] transcribe_audio_bytes called with format: {audio_format}")
    logger.info(f"🔍 [Audio Module] Audio bytes size: {len(audio_bytes)}")
    
    try:
        # Create temporary file
        logger.info("🔍 [Audio Module] Creating temporary file...")
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{audio_format}") as temp_file:
            temp_file.write(audio_bytes)
            temp_file_path = temp_file.name
            logger.info(f"✅ [Audio Module] Temporary file created: {temp_file_path}")
        
        try:
            # Transcribe the temporary file
            logger.info("🔍 [Audio Module] Calling transcribe_audio_file...")
            result = transcribe_audio_file(temp_file_path)
            logger.info(f"✅ [Audio Module] transcribe_audio_file result: '{result}'")
            return result
        finally:
            # Clean up temporary file
            logger.info("🔍 [Audio Module] Cleaning up temporary file...")
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                logger.info("✅ [Audio Module] Temporary file deleted")
                
    except Exception as e:
        logger.error(f"❌ [Audio Module] Error transcribing audio bytes: {e}")
        logger.error(f"❌ [Audio Module] Error type: {type(e).__name__}")
        logger.error(f"❌ [Audio Module] Error details: {str(e)}")
        return ""

def say(txt: str):
    """Synchronous text-to-speech wrapper"""
    asyncio.run(_say(txt))

async def _say(txt: str, speed: str = "+25%"):
    """
    Async text-to-speech with Edge TTS
    Args:
        txt: Text to speak
        speed: Speech rate (default: +25%)
    """
    try:
        # Create Edge TTS communication
        communicate = edge_tts.Communicate(txt, voice="en-US-AriaNeural")
        
        # Stream audio chunks
        mp3_fp = BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                mp3_fp.write(chunk["data"])
        
        # Convert to AudioSegment and play
        mp3_fp.seek(0)
        sound = AudioSegment.from_file(mp3_fp, format="mp3")
        play(sound)
        
    except Exception as e:
        logger.error(f"Error in text-to-speech: {e}")

def say_legacy(txt: str):
    """
    Legacy Google TTS implementation
    Features: 2x speed playback
    """
    try:
        # Generate speech
        tts = gTTS(text=txt, lang='en', slow=False)
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_file:
            tts.save(temp_file.name)
            temp_file_path = temp_file.name
        
        try:
            # Load and play audio
            sound = AudioSegment.from_mp3(temp_file_path)
            # Speed up playback
            fast_sound = sound.speedup(playback_speed=2.0)
            play(fast_sound)
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        logger.error(f"Error in legacy TTS: {e}")

def ask_question(q: str, options: list = None) -> str:
    """
    Interactive voice Q&A with optional choices
    Args:
        q: Question to ask (spoken via TTS)
        options: List of valid answers (optional)
    Returns: User's answer (transcribed or fuzzy-matched)
    """
    try:
        # Speak the question
        say(q)
        
        # Listen for answer
        answer = transcribe_audio()
        
        if not answer:
            return ""
        
        # If options provided, validate against them
        if options:
            # Try exact match first
            if answer in options:
                return answer
            
            # Try fuzzy matching with LLM if available
            if _llm:
                matched = llm_fuzzy_match(answer, options)
                if matched:
                    return matched
            
            # If no match found, return original answer
            return answer
        
        return answer
        
    except Exception as e:
        logger.error(f"Error in voice Q&A: {e}")
        return ""

def llm_fuzzy_match(raw: str, options: list) -> Optional[str]:
    """
    AI-powered command disambiguation
    Args:
        raw: Raw transcribed text
        options: List of valid options
    Returns: Best match from options or None
    """
    if not _llm:
        return None
    
    try:
        prompt = f"""
        Given the transcribed text: "{raw}"
        And the valid options: {options}
        
        Please select the best matching option from the list. 
        Consider typos, similar words, and context.
        
        Return only the exact option text, or "none" if no good match exists.
        """
        
        response = _llm.invoke(prompt).text().strip().lower()
        
        # Check if response matches any option
        for option in options:
            if option.lower() == response:
                return option
        
        return None
        
    except Exception as e:
        logger.error(f"Error in fuzzy matching: {e}")
        return None

# Test function for development
def test_audio_module():
    """Test the audio module functionality"""
    print("Testing Audio Module...")
    
    # Test transcription
    print("Please speak something for transcription test...")
    result = transcribe_audio()
    print(f"Transcription result: {result}")
    
    # Test TTS
    if result:
        print("Testing text-to-speech...")
        say(f"You said: {result}")

if __name__ == "__main__":
    test_audio_module()
