#!/usr/bin/env python3
"""
Startup script for Intelliproof Backend
Provides better error handling and debugging information
"""

import os
import sys
import traceback
from dotenv import load_dotenv

def main():
    """Main startup function with error handling"""
    print("Starting Intelliproof Backend...")
    
    # Load environment variables
    load_dotenv()
    print("✓ Environment variables loaded")
    
    # Check required environment variables
    required_env_vars = ["SUPABASE_URL", "SUPABASE_KEY"]
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    if missing_vars:
        print(f"⚠ Warning: Missing environment variables: {missing_vars}")
        print("Some features may not work properly")
    else:
        print("✓ All required environment variables found")
    
    # Test imports
    try:
        import fastapi
        import uvicorn
        import pydantic
        import openai
        import supabase
        print("✓ All core dependencies imported successfully")
    except ImportError as e:
        print(f"✗ Import error: {e}")
        print("Please check your requirements.txt and install dependencies")
        return 1
    
    # Test custom modules
    try:
        import ai_models
        import llm_manager
        import models
        import ai_api
        print("✓ All custom modules imported successfully")
    except ImportError as e:
        print(f"✗ Custom module import error: {e}")
        print("Please check your Python files for syntax errors")
        return 1
    
    # Try to start the application
    try:
        import main
        print("✓ Main application module loaded successfully")
        
        # Start the server
        print("Starting server...")
        import uvicorn
        uvicorn.run(main.app, host="0.0.0.0", port=8000)
        
    except Exception as e:
        print(f"✗ Application startup error: {e}")
        print("Full traceback:")
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 