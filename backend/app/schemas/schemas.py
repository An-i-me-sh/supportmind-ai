from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Any
from uuid import UUID
from datetime import datetime

# Auth Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    role: Optional[str] = "customer" # "admin", "customer"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

# Document Schemas
class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    file_type: str
    file_size: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Ticket Schemas
class TicketCreate(BaseModel):
    subject: str
    description: str

class TicketUpdate(BaseModel):
    status: str # Open, In Progress, Resolved, Closed

class TicketResponse(BaseModel):
    id: UUID
    user_id: UUID
    subject: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime
    user_email: Optional[str] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True

# Chat & Message Schemas
class MessageCreate(BaseModel):
    content: str
    session_id: Optional[UUID] = None # If None, creates a new session

class MessageResponse(BaseModel):
    id: UUID
    session_id: UUID
    sender: str # user, ai
    content: str
    citations: Optional[List[Any]] = None
    ticket_created_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionResponse(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True

# Dashboard & Analytics Schemas
class DashboardStats(BaseModel):
    total_documents: int
    total_chats: int
    open_tickets: int
    resolved_tickets: int

class RecentUpload(BaseModel):
    id: UUID
    filename: str
    created_at: datetime
    status: str

class RecentChat(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    user_email: str

class DashboardResponse(BaseModel):
    stats: DashboardStats
    recent_chats: List[RecentChat]
    recent_uploads: List[RecentUpload]

class AnalyticsResponse(BaseModel):
    ticket_distribution: dict # {"Open": 5, "Resolved": 10, ...}
    chat_volume_over_time: List[dict] # [{"date": "2026-08-01", "count": 12}, ...]
    document_type_distribution: dict # {"PDF": 4, "DOCX": 2, "TXT": 1}
