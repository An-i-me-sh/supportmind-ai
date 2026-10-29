import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.main import app
from backend.app.database.database import Base, get_db
from backend.app.models.models import User

# In-memory SQLite for isolated tests
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Setup schemas
Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    # Drop and recreate tables before each test to guarantee test isolation
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield

def test_user_registration_and_login():
    # 1. Register user
    reg_response = client.post(
        "/register",
        json={
            "email": "testadmin@company.com",
            "password": "strongpassword123",
            "full_name": "Test Admin",
            "role": "admin"
        }
    )
    assert reg_response.status_code == 201
    data = reg_response.json()
    assert data["email"] == "testadmin@company.com"
    assert data["role"] == "admin"

    # 2. Login
    login_response = client.post(
        "/login",
        json={
            "email": "testadmin@company.com",
            "password": "strongpassword123"
        }
    )
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert "access_token" in login_data
    token = login_data["access_token"]

    # 3. Retrieve Profile
    profile_response = client.get(
        "/profile",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert profile_response.status_code == 200
    profile_data = profile_response.json()
    assert profile_data["email"] == "testadmin@company.com"

def test_document_listing_unauthenticated():
    response = client.get("/documents")
    assert response.status_code == 401

def test_ticket_creation_and_retrieval():
    # Register customer
    client.post(
        "/register",
        json={
            "email": "customer@company.com",
            "password": "customerpass123",
            "full_name": "Test Customer",
            "role": "customer"
        }
    )
    # Login customer
    login_resp = client.post(
        "/login",
        json={
            "email": "customer@company.com",
            "password": "customerpass123"
        }
    )
    token = login_resp.json()["access_token"]

    # Create ticket
    ticket_resp = client.post(
        "/tickets",
        json={
            "subject": "Missing documentation context",
            "description": "I need help with my enterprise account API endpoints."
        },
        headers={"Authorization": f"Bearer {token}"}
      )
    assert ticket_resp.status_code == 201
    ticket_data = ticket_resp.json()
    assert ticket_data["subject"] == "Missing documentation context"
    assert ticket_data["status"] == "Open"

    # List tickets
    list_resp = client.get(
        "/tickets",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1
