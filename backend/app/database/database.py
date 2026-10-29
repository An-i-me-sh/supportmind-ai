import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

logger = logging.getLogger(__name__)

# Default to Postgres if DATABASE_URL is set, otherwise fallback to local SQLite for instant running
RAW_DB_URL = os.getenv("DATABASE_URL", "sqlite:///./supportmind.db")

# Standardize URL
if RAW_DB_URL.startswith("postgres://"):
    RAW_DB_URL = RAW_DB_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif RAW_DB_URL.startswith("postgresql://") and not RAW_DB_URL.startswith("postgresql+"):
    RAW_DB_URL = RAW_DB_URL.replace("postgresql://", "postgresql+psycopg://", 1)

DATABASE_URL = RAW_DB_URL

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    try:
        from sqlalchemy import event
        from pgvector.psycopg import register_vector

        @event.listens_for(engine, "connect")
        def on_connect(dbapi_connection, connection_record):
            try:
                register_vector(dbapi_connection)
            except Exception as e:
                logger.warning(f"Note on pgvector registration: {e}")
    except Exception as e:
        logger.warning(f"pgvector event setup note: {e}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
