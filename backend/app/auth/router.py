from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional

from backend.app.database.database import get_db
from backend.app.models.models import User
from backend.app.schemas.schemas import UserRegister, UserResponse, Token, UserLogin
from backend.app.auth.utils import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, get_admin_user
)

router = APIRouter(tags=["Authentication"])


# ─── Public Registration (customers only) ───────────────────────────────────
@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """
    Public sign-up endpoint.
    - Always creates a 'customer' account.
    - Only the very first account ever registered becomes 'admin' (bootstrap).
    - No role can be chosen or injected by the caller.
    """
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Bootstrap: first-ever account is admin, every subsequent one is customer
    user_count = db.query(User).count()
    role = "admin" if user_count == 0 else "customer"

    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


# ─── Admin-only: Create another admin account ────────────────────────────────
@router.post("/admin/create-admin", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_admin(
    user_in: UserRegister,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_admin_user)   # 🔒 must be logged-in admin
):
    """
    Protected endpoint — only an authenticated admin can call this.
    Creates a new admin account.
    """
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    new_admin = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role="admin"   # always admin — the caller cannot override this
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    return new_admin


# ─── Login (both customers and admins) ───────────────────────────────────────
@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}


# ─── Get current user profile ─────────────────────────────────────────────────
@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user
