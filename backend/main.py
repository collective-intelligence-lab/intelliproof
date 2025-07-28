from fastapi import FastAPI, HTTPException, status, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from dotenv import load_dotenv
import os
from supabase import create_client, Client
import ai_api
from models import SignupRequest, SignupResponse, SigninRequest, SigninResponse, SignoutResponse, UserData

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# CORS middleware configuration - Open access for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=False,  # Set to False when using allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include AI API router
app.include_router(ai_api.router)

# Supabase configuration
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# Models


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

        # Get the session data
        session = auth_response.session
        if not session:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create session"
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
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 