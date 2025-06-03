from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from dotenv import load_dotenv
import os
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your Next.js frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase configuration
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# Models
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str

class SignupResponse(BaseModel):
    message: str
    user_id: Optional[str] = None

class SigninRequest(BaseModel):
    email: EmailStr
    password: str

class SigninResponse(BaseModel):
    message: str
    user_id: Optional[str] = None

@app.post("/api/signup", response_model=SignupResponse)
async def signup(request: SignupRequest):
    try:
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

        # Then, insert into profiles table
        profile_data = {
            "email": request.email.lower().strip(),
            "user_id": auth_response.user.id,
            "first_name": request.first_name.strip(),
            "last_name": request.last_name.strip(),
            "account_type": "basic",  # Default account type
            "created_at": datetime.utcnow().isoformat()
        }

        profile_response = supabase.table("profiles").insert(profile_data).execute()

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
            user_id=auth_response.user.id
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.post("/api/signin", response_model=SigninResponse)
async def signin(request: SigninRequest):
    try:
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

        return SigninResponse(
            message="Sign in successful",
            user_id=auth_response.user.id
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 