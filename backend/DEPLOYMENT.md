# Backend Deployment on Vercel

## Environment Variables Required

Set these in your Vercel dashboard:

```bash
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here
JWT_SECRET_KEY=your_jwt_secret_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

## Deployment Steps

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Connect your GitHub repository
4. **Important**: Set Root Directory to `backend`
5. Add environment variables
6. Deploy

## API Endpoints

Once deployed, your API will be available at:
- `https://your-backend.vercel.app/api/signup`
- `https://your-backend.vercel.app/api/signin`
- `https://your-backend.vercel.app/api/ai/get-claim-credibility`
- etc.

## CORS Configuration

Currently set to allow all origins (`*`) for development.
Update in `main.py` for production security. 