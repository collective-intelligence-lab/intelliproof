from fastapi import FastAPI, HTTPException, status, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from httpx import request
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from dotenv import load_dotenv
import os
from supabase import create_client, Client
import ai_api
from models import SignupRequest, SignupResponse, SigninRequest, SigninResponse, SignoutResponse, UserData
import sys
from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel
from rag_ingestion import ingest_document

# Local AI implementations go into this file. API calls go to ai_api.py.

# Load environment variables
load_dotenv()

# Check required environment variables
required_env_vars = ["SUPABASE_URL", "SUPABASE_KEY"]
missing_vars = [var for var in required_env_vars if not os.getenv(var)]
if missing_vars:
    print(f"Warning: Missing required environment variables: {missing_vars}")
    print("Some features may not work properly")

# Initialize FastAPI app
app = FastAPI()


class RAGIngestionRequest(BaseModel):
    document_id: str
    document_url: str
    document_name: str
    document_type: str

# Initialize the Whisper model once at startup (you can choose the model size based on your needs)

audio_model = WhisperModel(
    "base", 
    device = "cpu", # Change to "cuda" if you have a compatible GPU and the necessary drivers installed
    cpu_threads = 4, # Adjust based on your CPU capabilities
    compute_type="float32", # This should work on our Threadripper without needing to worry about GPU
)

# CORS middleware configuration - Open access for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=False,  # Set to False when using allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/audio/transcribe-file")
async def transcribe_audio(audio_file: UploadFile = File(...)):
    print(f"🎤 Received audio file: {audio_file.filename}")
    
    try:
        # 1. Read the incoming audio bytes from the JavaScript
        contents = await audio_file.read()
        
        # 2. Save it to a temporary file so your ML model can read it
        temp_file_path = f"temp_{audio_file.filename}"
        with open(temp_file_path, "wb") as f:
            f.write(contents)
            
        # 3. ---> YOUR AI MAGIC GOES HERE <---

        segments, info = audio_model.transcribe(temp_file_path, beam_size=5) # You can adjust the beam_size for better accuracy at the cost of speed

        
        # (Dummy text for testing the connection)
        transcribed_text = " ".join([segment.text for segment in segments])
        print(f"✅ Transcription successful: {transcribed_text}")
        
        # 4. Clean up the temporary file
        os.remove(temp_file_path)
        
        # 5. Send the exact JSON format the JavaScript is waiting for
        return {
            "success": True, 
            "text": transcribed_text.strip() # Remove any leading/trailing whitespace just in case
        }
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return JSONResponse(
            status_code=500, 
            content={"success": False, "error": str(e)}
        )

# Add explicit CORS preflight handler
@app.options("/{full_path:path}")
async def preflight_handler():
    return {"message": "CORS preflight successful"}

# Include AI API router with error handling
try:
    import ai_api
    app.include_router(ai_api.router)
    print("AI API router loaded successfully")
except ImportError as e:
    print(f"Warning: Could not import AI API router: {e}")
    print("AI endpoints will not be available")
except Exception as e:
    print(f"Warning: Error loading AI API router: {e}")
    print("AI endpoints will not be available")

# Include Audio API router with error handling
# try:
#     import audio_api
#     app.include_router(audio_api.router)
#     print("Audio API router loaded successfully")
# except ImportError as e:
#     print(f"Warning: Could not import Audio API router: {e}")
#     print("Audio endpoints will not be available")
# except Exception as e:
#     print(f"Warning: Error loading Audio API router: {e}")
#     print("Audio endpoints will not be available")
# If you want to use this, import with 
# Audio processing libraries
# SpeechRecognition==3.14.3
# faster-whisper==1.2.0
# gtts==2.5.4
# edge-tts==7.2.1
# pydub==0.25.1 

# Supabase configuration
try:
    supabase: Client = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_KEY")
    )
    print("Supabase client initialized successfully")
except Exception as e:
    print(f"Warning: Could not initialize Supabase client: {e}")
    supabase = None

# Health check endpoint
@app.get("/")
async def health_check():
    return {"status": "healthy", "message": "Intelliproof Backend API is running"}


def _run_document_ingestion(request: RAGIngestionRequest, user_id: str) -> None:
    email = None
    try:
        print(f"[rag] Worker started for document {request.document_id}")
        email = _user_email_for_id(user_id)
        processing_payload = {"indexing_status": "processing", "indexing_progress": 0, "indexing_error": None}
        processing_result = supabase.table("supporting_documents").update(processing_payload).eq(
            "id", request.document_id
        ).eq("uploader_email", email).execute()
        if getattr(processing_result, "error", None):
            print(f"[rag] Progress column unavailable; continuing without progress persistence: {processing_result.error}")
            processing_result = supabase.table("supporting_documents").update(
                {"indexing_status": "processing", "indexing_error": None}
            ).eq("id", request.document_id).eq("uploader_email", email).execute()
            if getattr(processing_result, "error", None):
                raise RuntimeError(f"Could not mark document as processing: {processing_result.error}")
        print(f"[rag] Document {request.document_id} marked as processing")

        def update_progress(progress: int, stage: str) -> None:
            try:
                result = supabase.table("supporting_documents").update(
                    {"indexing_progress": progress, "indexing_status": "processing"}
                ).eq("id", request.document_id).eq("uploader_email", email).execute()
                if getattr(result, "error", None):
                    print(f"[rag] Progress update failed at {progress}%: {result.error}")
            except Exception as progress_error:
                print(f"[rag] Progress update failed at {progress}% ({stage}): {progress_error}")

        ingest_document(
            document_id=request.document_id,
            user_id=user_id,
            document_url=request.document_url,
            document_name=request.document_name,
            document_type=request.document_type,
            supabase=supabase,
            progress_callback=update_progress,
        )
        print(f"[rag] Persist complete; marking document {request.document_id} ready")
        ready_payload = {"indexing_status": "ready", "indexing_progress": 100, "indexed_at": datetime.now().astimezone().isoformat(), "indexing_error": None}
        ready_result = supabase.table("supporting_documents").update(ready_payload).eq(
            "id", request.document_id
        ).eq("uploader_email", email).execute()
        if getattr(ready_result, "error", None):
            print(f"[rag] Progress column unavailable during completion; marking ready without progress: {ready_result.error}")
            ready_result = supabase.table("supporting_documents").update(
                {"indexing_status": "ready", "indexed_at": datetime.now().astimezone().isoformat(), "indexing_error": None}
            ).eq("id", request.document_id).eq("uploader_email", email).execute()
            if getattr(ready_result, "error", None):
                raise RuntimeError(f"Could not mark document as ready: {ready_result.error}")
        print(f"[rag] Document {request.document_id} is ready for retrieval")
    except Exception as error:
        print(f"RAG ingestion failed for {request.document_id}: {error}")
        if supabase and email:
            try:
                failure_result = supabase.table("supporting_documents").update(
                    {"indexing_status": "failed", "indexing_error": str(error)[:1000]}
                ).eq("id", request.document_id).eq("uploader_email", email).execute()
                if getattr(failure_result, "error", None):
                    print(f"[rag] Could not mark document as failed: {failure_result.error}")
            except Exception as failure_error:
                print(f"[rag] Failure status update failed: {failure_error}")


def _user_email_for_id(user_id: str) -> str:
    profile = supabase.table("profiles").select("email").eq("user_id", user_id).single().execute()
    if not profile.data:
        raise HTTPException(status_code=404, detail="User profile not found")
    return profile.data["email"]


@app.post("/api/rag/ingest", status_code=202)
async def start_document_ingestion(
    request: RAGIngestionRequest,
    background_tasks: BackgroundTasks,
    authorization: str = Header(None),
):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database service not available")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization header missing or invalid")

    try:
        user = supabase.auth.get_user(authorization.removeprefix("Bearer "))
    except Exception as error:
        raise HTTPException(status_code=401, detail="Invalid or expired session") from error
    if not user or not user.user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    user_id = str(user.user.id)
    email = _user_email_for_id(user_id)
    document = (
        supabase.table("supporting_documents")
        .select("id, url, name, type")
        .eq("id", request.document_id)
        .eq("uploader_email", email)
        .single()
        .execute()
    )
    if not document.data:
        raise HTTPException(status_code=404, detail="Document not found")

    ingestion_request = RAGIngestionRequest(
        document_id=request.document_id,
        document_url=document.data["url"],
        document_name=document.data["name"],
        document_type=document.data["type"],
    )
    background_tasks.add_task(_run_document_ingestion, ingestion_request, user_id)
    return {"document_id": request.document_id, "indexing_status": "pending"}

# Models


@app.post("/api/signup", response_model=SignupResponse)
async def signup(request: SignupRequest):
    try:
        if not supabase:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database service not available"
            )
        
        # First, sign up the user with Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": request.email.lower().strip(),
            "password": request.password,
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user account"
            )

        # Get the session data

        session = auth_response.session
        print(session)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create session"
            )
        

        # Then, insert into profiles table
        first_name = request.first_name.strip() if request.first_name else ""
        last_name = request.last_name.strip() if request.last_name else ""

        profile_data = {
            "email": request.email.lower().strip(),
            "user_id": auth_response.user.id,
            "first_name": first_name,
            "last_name": last_name,
            "account_type": "basic",  # Default account type
            "created_at": datetime.utcnow().isoformat()
        }

        profile_response = supabase.table("profiles").insert(profile_data).execute()
        # ADD THIS LINE FOR DEBUGGING
        print("DEBUG -- Supabase profile insert response:", profile_response)

        if not profile_response.data:
            # If profile creation fails, we should clean up the auth user
            try:
                await supabase.auth.admin.delete_user(auth_response.user.id)
            except Exception as e:
                print(f"Error cleaning up auth user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user profile"
            )

        return SignupResponse(
            message="Account created successfully! Please check your email to verify your account.",
            user_id=auth_response.user.id,
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            user=auth_response.user.dict()
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.post("/api/signin", response_model=SigninResponse)
async def signin(request: SigninRequest):
    try:
        if not supabase:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database service not available"
            )
        
        # Authenticate user with Supabase Auth
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email.lower().strip(),
            "password": request.password,
        })

        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Get the session data
        session = auth_response.session
        if not session:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create session"
            )

        return SigninResponse(
            message="Sign in successful",
            user_id=auth_response.user.id,
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            user=auth_response.user.dict()
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.post("/api/signout", response_model=SignoutResponse)
async def signout():
    try:
        if not supabase:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database service not available"
            )
        
        # Sign out from Supabase
        supabase.auth.sign_out()
        return SignoutResponse(message="Sign out successful")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.get("/api/user/data", response_model=UserData)
async def get_user_data(authorization: str = Header(None)):
    try:
        if not supabase:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database service not available"
            )
        
        print("DEBUG: Received authorization header:", authorization)
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header missing or invalid"
            )
        access_token = authorization.replace("Bearer ", "")
        print("DEBUG: Access token:", access_token)

        # Get the current user directly using the access token
        try:
            user = supabase.auth.get_user(access_token)
            print("DEBUG: User data:", user)
        except Exception as auth_error:
            print("DEBUG: Auth error:", str(auth_error))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session"
            )

        if not user or not user.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session"
            )

        # Get user's profile
        try:
            profile_response = supabase.table("profiles").select("*").eq("user_id", user.user.id).execute()
            print("DEBUG: Profile response:", profile_response)
        except Exception as profile_error:
            print("DEBUG: Profile error:", str(profile_error))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch user profile"
            )

        if not profile_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        profile = profile_response.data[0]
        print("DEBUG: Profile data:", profile)

        # Get user's graphs
        try:
            graphs_response = supabase.table("graphs").select("*").eq("owner_email", profile["email"]).execute()
            print("DEBUG: Graphs response:", graphs_response)
        except Exception as graphs_error:
            print("DEBUG: Graphs error:", str(graphs_error))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to fetch user graphs"
            )

        graphs = graphs_response.data if graphs_response.data else []
        print("DEBUG: Graphs data:", graphs)

        return UserData(
            profile=profile,
            graphs=graphs
        )

    except HTTPException as he:
        print("DEBUG: HTTP Exception:", str(he))
        raise he
    except Exception as e:
        print("DEBUG: Unexpected error:", str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

if __name__ == "__main__":
    try:
        import uvicorn
        print("Starting Intelliproof Backend...")
        uvicorn.run(app, host="0.0.0.0", port=8000)
    except Exception as e:
        print(f"Failed to start server: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1) 