# Deploying SupportMind AI to Render

This repository is fully configured and ready for 1-click deployment on [Render](https://render.com).

---

## Deployment Option 1: Blueprint Deployment (Recommended - 1 Click)

Render will automatically configure the **FastAPI Web Service**, the **React SPA**, and the **PostgreSQL Database** using [`render.yaml`](./render.yaml).

### Step 1: Push your code to GitHub / GitLab
Open PowerShell or Terminal in this project folder and run:

```bash
git init
git add .
git commit -m "Prepare SupportMind AI for Render deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

*(Note: Secrets and local databases are safely ignored by `.gitignore`)*.

### Step 2: Create a Blueprint on Render
1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top right, then select **Blueprint**.
3. Connect your GitHub/GitLab account and select your repository.
4. Render will detect `render.yaml` and show:
   - **Web Service**: `supportmind-ai` (Unified FastAPI + React Frontend)
   - **PostgreSQL Database**: `supportmind-db` (Free Tier)
5. Under **Environment Variables**:
   - Provide your **`GROQ_API_KEY`** (get one free at [console.groq.com](https://console.groq.com/keys)).
6. Click **Apply**. Render will automatically build the frontend, install backend dependencies with CPU-optimized PyTorch, and launch your application!

---

## Deployment Option 2: Manual Web Service Setup

If you prefer to configure the Web Service manually in Render without using Blueprints:

1. In Render Dashboard, click **New +** > **Web Service**.
2. Connect your GitHub repository.
3. Configure the following fields:
   - **Name**: `supportmind-ai`
   - **Region**: Choose the closest region (e.g., Oregon, Frankfurt)
   - **Runtime**: `Python`
   - **Build Command**:
     ```bash
     pip install torch --index-url https://download.pytorch.org/whl/cpu && pip install -r backend/requirements.txt && (command -v npm >/dev/null && cd frontend && npm install && npm run build && cd .. || echo "Frontend ready")
     ```
   - **Start Command**:
     ```bash
     uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Plan**: `Free`

4. Add **Environment Variables**:
   | Variable | Recommended Value | Description |
   |---|---|---|
   | `GROQ_API_KEY` | `gsk_...` | Your Groq API key |
   | `GROQ_MODEL` | `qwen/qwen3.8-27b` | Accurate, cost-effective LLM |
   | `SIMILARITY_THRESHOLD` | `0.3` | Semantic threshold for RAG ticketing |
   | `JWT_SECRET` | *(Random 32+ char string)* | Secure token signing secret |
   | `EMBEDDING_MODEL_NAME` | `BAAI/bge-small-en-v1.5` | Fast, lightweight embedding model |
   | `DATABASE_URL` | *(Optional)* | Render PostgreSQL connection string or leave blank for SQLite |

5. Under **Advanced**, set **Health Check Path** to:
   ```
   /health
   ```
6. Click **Create Web Service**.

---

## Default Seeded Credentials

When the database is newly initialized on Render, default accounts are seeded automatically:

- **Admin Account**:
  - **Email**: `animesh@supportmind.ai`
  - **Password**: `Admin123!`
  - **Access**: Executive Dashboard, Documents Management, Company Tickets, Admin Creation
- **Customer Demo Account**:
  - **Email**: `demo@supportmind.ai`
  - **Password**: `Password123!`
  - **Access**: AI Chat Console, File Tickets, Track Personal Tickets

---

## Key Optimizations Included for Render Free Tier

1. **CPU PyTorch Footprint**: Uses `--index-url https://download.pytorch.org/whl/cpu` to keep the build image under 150MB (instead of >800MB CUDA wheel), preventing RAM exhaustion on Render's 512MB free tier.
2. **Single Unified Origin**: FastAPI serves both the API and the compiled React SPA on the exact same port/domain. Zero CORS problems, zero mixed HTTP/HTTPS content issues.
3. **Database Portability**: Dialect-agnostic vector storage automatically supports pgvector on PostgreSQL and fallback JSON vectors on SQLite.
