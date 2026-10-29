import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.database.database import engine, Base, get_db, SessionLocal
from backend.app.auth.router import router as auth_router
from backend.app.chat.router import router as chat_router
from backend.app.documents.router import router as doc_router
from backend.app.tickets.router import router as ticket_router
from backend.app.services.ai_service import AIService
from backend.app.models.models import User

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Initialize DB extension and tables
try:
    logger.info("Initializing database extension and schema...")
    if engine.dialect.name == "postgresql":
        try:
            with engine.connect() as connection:
                connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                connection.commit()
                logger.info("pgvector extension verified.")
        except Exception as ext_err:
            logger.warning(f"Note on vector extension: {ext_err}. Continuing with standard schema creation.")
    Base.metadata.create_all(bind=engine)
    logger.info(f"Database schema initialized successfully using {engine.dialect.name}.")
except Exception as e:
    logger.exception("Failed to initialize database tables or extension:")

# Seed initial default admin and customer accounts if database is empty
try:
    with SessionLocal() as db:
        if db.query(User).count() == 0:
            logger.info("Database is empty. Seeding default admin and customer accounts...")
            from backend.app.auth.utils import get_password_hash
            admin_user = User(
                email="animesh@supportmind.ai",
                hashed_password=get_password_hash("Admin123!"),
                full_name="Animesh Admin",
                role="admin"
            )
            demo_user = User(
                email="demo@supportmind.ai",
                hashed_password=get_password_hash("Password123!"),
                full_name="Demo User",
                role="customer"
            )
            db.add_all([admin_user, demo_user])
            db.commit()
            logger.info("Default accounts created: animesh@supportmind.ai (Admin) & demo@supportmind.ai (Customer)")
except Exception as e:
    logger.warning(f"Note on seeding default accounts: {e}")

app = FastAPI(
    title="SupportMind AI API",
    description="AI-powered Customer Support Platform with RAG and Auto-Ticketing",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(doc_router)
app.include_router(ticket_router)

@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.exception("Global uncaught exception occurred:")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"An unexpected system error occurred: {str(exc)}"}
    )

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Health check DB failure: {e}")
        db_status = "unhealthy"

    ai_status = await AIService.verify_health()

    overall_status = "healthy" if db_status == "healthy" and ai_status["status"] == "healthy" else "degraded"
    
    return {
        "status": overall_status,
        "database": db_status,
        "database_engine": engine.dialect.name,
        "ai_service": ai_status
    }

# Serve static frontend build if present for a single unified URL
import os
from starlette.requests import Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))

if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend_assets")

    @app.middleware("http")
    async def spa_middleware(request: Request, call_next):
        if request.method == "GET":
            # Check if file exists directly in frontend_dist (e.g. favicon.svg, icons.svg)
            rel_path = request.url.path.lstrip("/")
            if rel_path:
                static_candidate = os.path.join(frontend_dist, rel_path)
                if os.path.isfile(static_candidate):
                    return FileResponse(static_candidate)

            frontend_routes = {"/", "/login", "/documents", "/chat", "/tickets"}
            accept = request.headers.get("accept", "")
            # Intercept browser HTML navigations to SPA routes
            if (
                "text/html" in accept
                and "application/json" not in accept
                and (
                    request.url.path in frontend_routes
                    or (not request.url.path.startswith(("/docs", "/openapi.json", "/health", "/assets", "/register", "/profile", "/admin", "/chat/history", "/documents/upload")))
                )
            ):
                index_file = os.path.join(frontend_dist, "index.html")
                if os.path.exists(index_file):
                    return FileResponse(index_file)
        return await call_next(request)

    @app.get("/", include_in_schema=False)
    async def serve_root():
        index_file = os.path.join(frontend_dist, "index.html")
        return FileResponse(index_file)

