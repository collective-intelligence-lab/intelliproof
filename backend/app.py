"""
Vercel Deployment Entry Point

This file serves as the entry point for deploying the FastAPI application on Vercel.
Vercel's Python runtime looks for an 'app' object to serve HTTP requests.

Purpose:
- Import the main FastAPI application instance from main.py
- Expose it as 'app' for Vercel's serverless function handler
- Enable seamless deployment without modifying the main application code

Deployment Flow:
1. Vercel reads vercel.json configuration
2. Builds Python runtime environment
3. Looks for this app.py file  
4. Imports and serves the FastAPI app instance
5. Routes all HTTP requests to the FastAPI application

Note: This is a common pattern for deploying FastAPI applications
on serverless platforms that expect a specific entry point structure.
"""

from main import app

# The 'app' variable is automatically detected by Vercel's Python runtime
# No additional configuration needed - Vercel will handle HTTP routing 