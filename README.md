# SupportMind AI - Customer Support Platform using RAG

SupportMind AI is a production-ready, high-performance customer support platform powered by Retrieval-Augmented Generation (RAG). It enables businesses to index corporate documentation (PDF, DOCX, TXT) and answer customer questions using a secure, local embedding pipeline matched with Groq's high-speed LLMs.

If the similarity confidence score for an AI response falls below a set threshold, the platform automatically logs a support ticket for human agents to follow up.

---

## Key Features

- **JWT Authentication**: Secure login and self-registration with password hashing (bcrypt).
- **High-Fidelity UI**: Restored from Stitch AI design tokens (emerald themes, fully responsive dashboard, responsive chat feeds, and animated dark mode toggles).
- **Optimized RAG Pipeline**:
  - Word-level chunk splitting (approx. 500 tokens) with overlap.
  - Local embeddings generated via the `BAAI/bge-small-en-v1.5` SentenceTransformer.
  - Cosine similarity vector search inside PostgreSQL with `pgvector`.
  - Response generation using the latest Llama model on Groq.
- **Auto-Ticketing**: Automatic Support Ticket creation when similarity matching score falls below `0.4` (configurable).
- **Analytics & Dashboard**: Track document volumes, chat interaction frequency, ticket distribution rates, and recent client activity.

---

## Tech Stack

- **Backend**: FastAPI (Python 3.12+), SQLAlchemy ORM, PyMuPDF, python-docx
- **Frontend**: React + Vite, Tailwind CSS, Lucide icons, responsive HTML5 layout
- **Database**: PostgreSQL with `pgvector`
- **AI Models**:
  - LLM: `llama-3.1-70b-versatile` (via Groq API)
  - Embeddings: `BAAI/bge-small-en-v1.5` (running locally inside the server CPU/GPU)

---

## Folder Structure

```text
stitch_supportmind_ai_enterprise_platform/
├── backend/
│   ├── app/
│   │   ├── auth/            # JWT validation and user endpoint routers
│   │   ├── chat/            # RAG semantic matching and prompt generation
│   │   ├── database/        # Connection engines and sessions
│   │   ├── documents/       # File uploads, storage, and retrieval
│   │   ├── models/          # SQLAlchemy schemas
│   │   ├── schemas/         # Pydantic validation structures
│   │   ├── services/        # AI (Groq + local embeddings) and document splitting
│   │   ├── tickets/         # Support tickets CRUD and dashboard aggregation
│   │   └── main.py          # CORS middlewares, routers, and DB entry-points
│   ├── tests/               # pytest suites (isolated SQLite models)
│   ├── Dockerfile
│   ├── preload_models.py    # Warm-up caching for embedding models
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # Persistent Layout frames
│   │   ├── pages/           # Login, Dashboard, Documents, Chat, Tickets
│   │   ├── api.js           # API network helpers (JWT interceptors)
│   │   ├── App.jsx          # Route guards and URL paths
│   │   ├── index.css        # Tailwind configurations and font imports
│   │   └── main.jsx
│   ├── Dockerfile           # Production multi-stage Nginx build
│   ├── Dockerfile.dev       # Dev hot reload
│   ├── nginx.conf           # HTML5 routing re-writer
│   └── tailwind.config.js
├── docker-compose.yml       # Integrated local environment orchestrator
├── render.yaml              # Render single-click blueprint
└── README.md
```

---

## Environment Variables

Create a `.env` file at the root or specify them in your container configuration:

```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/supportmind
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.1-70b-versatile
SIMILARITY_THRESHOLD=0.4
JWT_SECRET=your_jwt_security_secret_string
```

---

## Getting Started (Local Setup)

### Option 1: Docker Compose (Recommended)

1. Make sure Docker is running on your machine.
2. In the project root, run:
   ```bash
   docker-compose up --build
   ```
3. Open the services:
   - **Frontend Console**: `http://localhost:5173`
   - **FastAPI OpenAPI Docs**: `http://localhost:8000/docs`

*Note: The backend image preloads the `BAAI/bge-small-en-v1.5` model during build, meaning first-run questions will resolve instantly.*

### Option 2: Manual Installation

#### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Launch Vite hot reload:
   ```bash
   npm run dev
   ```

---

## Testing

Ensure your backend virtual environment is active, then execute:

```bash
pytest backend/tests
```

This runs the automated tests in a fully isolated, in-memory SQLite state, ensuring user registration, login, route permissions, and ticket creation conform to standards.

---

## Deployment on Render

This project contains a standard blueprint config (`render.yaml`). To deploy:

1. Push this workspace to your private GitHub/GitLab repository.
2. Go to the **Render Dashboard** -> **Blueprints** -> **New Blueprint Instance**.
3. Link your repository. Render will auto-provision:
   - A PostgreSQL Database (which supports `vector` extension).
   - A Web Service hosting the FastAPI backend (and building local SentenceTransformers).
   - A Static Site hosting the compiled React Vite SPA.
4. Input your `GROQ_API_KEY` when prompted in the environment variable dashboard.
