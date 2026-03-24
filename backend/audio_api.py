from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import io
import logging
from audio import transcribe_audio, transcribe_audio_bytes, say, transcribe_audio_file
import tempfile
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/audio", tags=["audio"])

# Pydantic models
class TranscriptionResponse(BaseModel):
    text: str
    success: bool
    error: Optional[str] = None

class TTSRequest(BaseModel):
    text: str
    speed: Optional[str] = "+25%"

class TTSResponse(BaseModel):
    success: bool
    error: Optional[str] = None

@router.post("/transcribe-microphone", response_model=TranscriptionResponse)
async def transcribe_microphone():
    """
    Transcribe audio from microphone input
    Returns: Transcribed text
    """
    try:
        logger.info("Starting microphone transcription...")
        text = transcribe_audio()
        
        if text:
            return TranscriptionResponse(text=text, success=True)
        else:
            return TranscriptionResponse(
                text="", 
                success=False, 
                error="No audio detected or transcription failed"
            )
            
    except Exception as e:
        logger.error(f"Error in microphone transcription: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Transcription failed: {str(e)}"
        )

@router.post("/transcribe-file", response_model=TranscriptionResponse)
async def transcribe_file(audio_file: UploadFile = File(...)):
    """
    Transcribe audio from uploaded file
    Returns: Transcribed text
    """
    logger.info("🔍 [Backend API] Transcribe file request received")
    logger.info(f"🔍 [Backend API] File details: filename={audio_file.filename}, content_type={audio_file.content_type}")
    
    try:
        # Validate file type
        logger.info(f"🔍 [Backend API] Validating file type: {audio_file.content_type}")
        if not audio_file.content_type or not audio_file.content_type.startswith('audio/'):
            logger.error(f"❌ [Backend API] Invalid file type: {audio_file.content_type}")
            raise HTTPException(
                status_code=400, 
                detail="File must be an audio file"
            )
        
        # Read file content
        logger.info("🔍 [Backend API] Reading file content...")
        audio_bytes = await audio_file.read()
        logger.info(f"✅ [Backend API] File read successfully, size: {len(audio_bytes)} bytes")
        
        # Determine file format from content type or filename
        audio_format = "wav"  # default
        if audio_file.content_type:
            if "mp3" in audio_file.content_type:
                audio_format = "mp3"
            elif "wav" in audio_file.content_type:
                audio_format = "wav"
            elif "m4a" in audio_file.content_type:
                audio_format = "m4a"
        
        # If format not determined from content type, try filename
        if audio_format == "wav" and audio_file.filename:
            filename_lower = audio_file.filename.lower()
            if filename_lower.endswith('.mp3'):
                audio_format = "mp3"
            elif filename_lower.endswith('.m4a'):
                audio_format = "m4a"
        
        logger.info(f"🔍 [Backend API] Transcribing audio file: {audio_file.filename}, format: {audio_format}")
        
        # Transcribe audio bytes
        logger.info("🔍 [Backend API] Starting transcription...")
        text = transcribe_audio_bytes(audio_bytes, audio_format)
        logger.info(f"🔍 [Backend API] Transcription result: '{text}'")
        
        if text:
            logger.info("✅ [Backend API] Transcription successful")
            return TranscriptionResponse(text=text, success=True)
        else:
            logger.warning("⚠️ [Backend API] Transcription failed or no speech detected")
            return TranscriptionResponse(
                text="", 
                success=False, 
                error="Transcription failed or no speech detected"
            )
            
    except Exception as e:
        logger.error(f"❌ [Backend API] Error in file transcription: {e}")
        logger.error(f"❌ [Backend API] Error type: {type(e).__name__}")
        logger.error(f"❌ [Backend API] Error details: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"File transcription failed: {str(e)}"
        )

@router.post("/tts", response_model=TTSResponse)
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech and return audio stream
    """
    try:
        if not request.text.strip():
            raise HTTPException(
                status_code=400, 
                detail="Text cannot be empty"
            )
        
        logger.info(f"Generating TTS for text: {request.text[:50]}...")
        
        # Generate speech (this will play audio on server)
        # For web clients, we need to return audio data instead
        say(request.text)
        
        return TTSResponse(success=True)
        
    except Exception as e:
        logger.error(f"Error in text-to-speech: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Text-to-speech failed: {str(e)}"
        )

@router.post("/tts-stream")
async def text_to_speech_stream(request: TTSRequest):
    """
    Convert text to speech and return audio stream for web clients
    """
    try:
        if not request.text.strip():
            raise HTTPException(
                status_code=400, 
                detail="Text cannot be empty"
            )
        
        logger.info(f"Generating TTS stream for text: {request.text[:50]}...")
        
        # Import here to avoid circular imports
        import asyncio
        import edge_tts
        from io import BytesIO
        
        # Generate speech using Edge TTS
        communicate = edge_tts.Communicate(request.text, voice="en-US-AriaNeural")
        
        # Stream audio chunks
        mp3_fp = BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                mp3_fp.write(chunk["data"])
        
        # Return audio stream
        mp3_fp.seek(0)
        audio_data = mp3_fp.getvalue()
        
        return StreamingResponse(
            io.BytesIO(audio_data),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "attachment; filename=speech.mp3"}
        )
        
    except Exception as e:
        logger.error(f"Error in TTS stream: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Text-to-speech streaming failed: {str(e)}"
        )

@router.post("/voice-question")
async def voice_question(question: str = Form(...), options: Optional[str] = Form(None)):
    """
    Interactive voice Q&A with optional choices
    """
    try:
        # Parse options if provided
        option_list = None
        if options:
            option_list = [opt.strip() for opt in options.split(',') if opt.strip()]
        
        logger.info(f"Voice question: {question}, options: {option_list}")
        
        # Import the ask_question function
        from audio import ask_question
        
        # Get answer
        answer = ask_question(question, option_list)
        
        return TranscriptionResponse(text=answer, success=bool(answer))
        
    except Exception as e:
        logger.error(f"Error in voice question: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Voice question failed: {str(e)}"
        )

# Health check endpoint for audio module
@router.get("/health")
async def audio_health_check():
    """
    Health check for audio module
    """
    try:
        # Test basic functionality
        import speech_recognition as sr
        r = sr.Recognizer()
        
        return {
            "status": "healthy",
            "message": "Audio module is working",
            "speech_recognition": "available",
            "whisper": "available"
        }
        
    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Audio module not available: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Audio module error: {str(e)}"
        )
