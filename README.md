# Intelliproof

A React-based web application built with TypeScript and Vite.

## Prerequisites

Before running this project, make sure you have the following installed on your system:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

## Getting Started

Follow these steps to run the project locally:

1. Clone the repository:

   ```bash
   git clone https://github.com/collective-intelligence-lab/intelliproof.git
   cd intelliproof
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a .env.local file in the root directory and add the following to it: 

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# API Configuration (optional - defaults to localhost:8000 for development)
# NEXT_PUBLIC_API_URL=http://localhost:8000
```
            

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

The application should now be running in development mode with hot-reload enabled, meaning any changes you make to the code will automatically update in the browser.

## Project Structure

```
intelliproof/
├── src/               # Source code
├── public/           # Static assets
├── index.html        # Entry HTML file
├── package.json      # Project dependencies and scripts
├── tsconfig.json     # TypeScript configuration
├── vite.config.ts    # Vite configuration
└── README.md         # Project documentation
```

## Available Scripts

- `npm run dev` - Starts the development server
- `npm run build` - Builds the app for production
- `npm run preview` - Locally preview the production build

## Technologies Used

- React 18
- TypeScript
- Vite
- Tailwind CSS

## API Configuration

The application uses a centralized configuration for API endpoints located in `src/lib/config.ts`. This allows for easy switching between development and production environments.

### Environment Variables

- `NEXT_PUBLIC_API_URL`: Set this to your production API URL when deploying. If not set, it defaults to `http://localhost:8000` for development.

### Usage

All API calls now use the centralized configuration:

```typescript
import { API_URLS } from '../lib/config';

// Instead of hardcoded URLs like:
// fetch('http://localhost:8000/api/signup')

// Use the centralized configuration:
fetch(API_URLS.SIGNUP)
```

This makes it easy to switch between environments without modifying individual files.



CURRENT SQL 

create type account_type_enum as enum ('basic', 'premium', 'admin'); -- Adjust as needed

create table profiles (
    email varchar(50) primary key,
    user_id uuid unique,
    account_type account_type_enum,
    country varchar(50) ,
    created_at timestamptz default now(),
    first_name text,
    last_name text
);

  
create table graphs (
    id uuid primary key default gen_random_uuid(),
    owner_email text references profiles(email) on delete cascade,
    graph_data jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    graph_name varchar(50)
);


CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE profiles
ALTER COLUMN user_id SET DEFAULT gen_random_uuid();


-- Supporting documents table
create table supporting_documents (
    id uuid primary key default gen_random_uuid(),
    graph_id uuid references graphs(id) on delete cascade,
    name text not null,
    type text not null,
    url text not null,
    size float,
    upload_date timestamptz default now(),
    uploader_email text references profiles(email) on delete set null,
    metadata jsonb default '{}'::jsonb
);

-- Create index for faster queries
CREATE INDEX idx_supporting_documents_graph_id ON supporting_documents(graph_id);
CREATE INDEX idx_supporting_documents_uploader ON supporting_documents(uploader_email);

-- Created a storage bucket named "supporting-document-storage" With a 10mb file limite size


-- Enable RLS on the supporting_documents table
ALTER TABLE supporting_documents ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to insert documents
CREATE POLICY "Allow authenticated users to insert documents"
ON supporting_documents
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy to allow all authenticated users to read documents
CREATE POLICY "Allow authenticated users to read documents"
ON supporting_documents
FOR SELECT
TO authenticated
USING (true);

Backend Server 

Create a file named .env in the backend directory with the following content:

SUPABASE_URL = your_supabase_url
SUPABASE_KEY = your_supabase_anon_key
JWT_SECRET_KEY = your_jwt_secret_key

cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

TODO

1) Ensure that session data is stored to local storage on signup                         ( DONE ) 
2) Add team members section and photos to the lib
3) Secure access to the post-login pages (about, home, graph_editor)
4) Reseach DS and Algos needed to incorporate multi-user graph editors
5) Research policies and required triggers to secure the DB from unauthorized access

npm install @supabase/supabase-js formidable
npm install --save-dev @types/formidable

## Deployment

### Live Applications

- **Frontend**: [https://intelliproof.vercel.app](https://intelliproof.vercel.app)
- **Backend**: [https://intelliproofbackend.vercel.app](https://intelliproofbackend.vercel.app)

### Frontend Deployment (Vercel)

#### Prerequisites
- Vercel CLI installed: `npm install -g vercel`
- Vercel account connected

#### Environment Variables Required
Set these in your Vercel dashboard or via CLI:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=https://intelliproofbackend.vercel.app
```

#### Deploy Commands
```bash
# Login to Vercel (if not already logged in)
vercel login

# Deploy to production
vercel --prod

# Or deploy with environment variables inline
vercel --prod -e NEXT_PUBLIC_SUPABASE_URL=your_url -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key -e NEXT_PUBLIC_API_URL=https://intelliproofbackend.vercel.app
```

### Backend Deployment (Vercel)

#### Prerequisites
- Vercel CLI installed
- Navigate to the `backend/` directory

#### Environment Variables Required
Set these in your Vercel dashboard for the backend project:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
JWT_SECRET_KEY=your_jwt_secret_for_token_signing
```

#### Deploy Commands
```bash
# Navigate to backend directory
cd backend

# Login to Vercel (if not already logged in)
vercel login

# Deploy to production
vercel --prod

# Or deploy with environment variables inline
vercel --prod -e SUPABASE_URL=your_url -e SUPABASE_KEY=your_key -e JWT_SECRET_KEY=your_secret
```

#### Backend Configuration
Ensure your `backend/vercel.json` is properly configured:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "main.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "main.py"
    }
  ]
}
```

### Important Notes

1. **Environment Variables**: Always set environment variables in the Vercel dashboard for production deployments rather than committing them to your repository.

2. **CORS Configuration**: The backend is configured to accept requests from the frontend domain. If you change deployment URLs, update the CORS settings in the backend.

3. **Database**: Both frontend and backend connect to the same Supabase instance. Ensure your Supabase project is properly configured with the required tables and RLS policies.

4. **Redeploy**: Any changes to the codebase will require redeployment. Use `vercel --prod` in the respective directories to redeploy.



PUSH MONDAY 21 JULY 2025 BUG FIXES TO REMEMMBER

- automated check evidence and validate edge working reasonably well

    * need to test with actual arguments and see if output matches expected

* evidence scores after check_node_evidence and check_evidence are updating evidence scores
  appear amongst multiple nodes

* AI copilot buttons need to be parsed, remove redundant
    - remove "Validate Edge" as it is being run automatically after edge modification
    - Generate Assumptions not working 
    - Validate All Edges valid 🤗

* messages need to be sot


TO WORK ON: 

  * Report Generation

  QUESTIONS: 

  -- storage of messages neccessary?
  -- purpose and domain of chatbox (AI custom messages)
  -- broken record but ASSUMMPTIONS
  -- edge clarification with Kabir
  -- extra LLM keys to test with?
  -- WAITING ON ARGUMENT YAML CONFIMATION FROM KAVEH FOR critique_graph(G)
  -- WAITING ON propagation function      FROM KAVEH  


  BUGS:

  * critique graph -> yaml identification not showing
                   -> messages could display more node/yaml info

  * automated calls running when graph loaded?

    * I THink   --> trigger credibility modifies nodes (via score update)

                --> each modified node triggers a check_evidence(call)
                            and this might change evidence scores

                --> each modified node triggers credibility again and so circular loop

???? WHERE U TESTING YOUR CREDIBILITTY FUNCTION WITH intelliproof@gmail.com missing scientist graph becuase when i did i was getting an infinite loop of credibility and check_evidence calls running forever. might have been my bug but I dont think it was.


* check if propagation BFS has a seen data structure to avoid re-processing nodes.


FRONTEND BUGS

* Graph Canvas Navbars overlap when both Evidence Navbar and AI Copilot navbar active

    --> open graphcanvas, pin the AI copilot and Evidence Navbars
    --> observe the Intelliproof toolbar and the graph save/crititque/report toolbar

* Inability to change edge from attatcking and supporting

    --> when u add an edge, it is impossible to switch from attack or support
    --> NOT SERIOUS : easier way to change direction after adding edge

    * Do we actually need the arrows that change edge from attatcking/defending
        --> maybe the toggler can be added to edge edit modal 

* Unlink Evidence not working

    --> add evidence via the Edit Claim Modal, then try Unlink it
    --> Need to update Redux via useEffect or useState update

* Inability to delete evidence from evidence management section



BACKEND BUGS

  * (DONE) argument_patterns_bank.yaml missing from the vercel deployment

        --> run critique graph on vercel deployment and see AI Copilot error and console

    FIX --> copy .yaml file from ../spec to intelliproof/backend/upload
  * 

  * Report Generation 

          --> runs check_all, might be easier to collect info from console instead
          --> Executive Summary Header overlapping with into section

          --> graph information needs to be re-referenced with frontend to get 
              claim text, claim type, edge type, evidence text information