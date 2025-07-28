#!/usr/bin/env python3
"""
Test script to verify that all imports work correctly
"""

import sys
import os

def test_imports():
    """Test all the imports used in the application"""
    print("Testing imports...")
    
    try:
        import fastapi
        print("✓ FastAPI imported successfully")
    except ImportError as e:
        print(f"✗ FastAPI import failed: {e}")
        return False
    
    try:
        import uvicorn
        print("✓ Uvicorn imported successfully")
    except ImportError as e:
        print(f"✗ Uvicorn import failed: {e}")
        return False
    
    try:
        import pydantic
        print("✓ Pydantic imported successfully")
    except ImportError as e:
        print(f"✗ Pydantic import failed: {e}")
        return False
    
    try:
        import openai
        print("✓ OpenAI imported successfully")
    except ImportError as e:
        print(f"✗ OpenAI import failed: {e}")
        return False
    
    try:
        import supabase
        print("✓ Supabase imported successfully")
    except ImportError as e:
        print(f"✗ Supabase import failed: {e}")
        return False
    
    try:
        from dotenv import load_dotenv
        print("✓ python-dotenv imported successfully")
    except ImportError as e:
        print(f"✗ python-dotenv import failed: {e}")
        return False
    
    # Test our custom modules
    try:
        import ai_models
        print("✓ ai_models imported successfully")
    except ImportError as e:
        print(f"✗ ai_models import failed: {e}")
        return False
    
    try:
        import llm_manager
        print("✓ llm_manager imported successfully")
    except ImportError as e:
        print(f"✗ llm_manager import failed: {e}")
        return False
    
    try:
        import models
        print("✓ models imported successfully")
    except ImportError as e:
        print(f"✗ models import failed: {e}")
        return False
    
    try:
        import ai_api
        print("✓ ai_api imported successfully")
    except ImportError as e:
        print(f"✗ ai_api import failed: {e}")
        return False
    
    try:
        import main
        print("✓ main imported successfully")
    except ImportError as e:
        print(f"✗ main import failed: {e}")
        return False
    
    print("\nAll imports successful!")
    return True

if __name__ == "__main__":
    success = test_imports()
    sys.exit(0 if success else 1) 