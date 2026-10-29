import uuid
from typing import List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.models.models import SupportTicket, User, Document, ChatSession, ChatMessage
from backend.app.schemas.schemas import TicketCreate, TicketUpdate, TicketResponse, DashboardResponse, AnalyticsResponse, DashboardStats, RecentChat, RecentUpload
from backend.app.auth.utils import get_current_user, get_admin_user

router = APIRouter(tags=["Tickets & Dashboard"])

@router.post("/tickets", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    ticket_in: TicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_ticket = SupportTicket(
        user_id=str(current_user.id),
        subject=ticket_in.subject,
        description=ticket_in.description,
        status="Open"
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    
    ticket_dict = TicketResponse.model_validate(new_ticket)
    ticket_dict.user_email = current_user.email
    ticket_dict.user_name = current_user.full_name
    return ticket_dict

@router.get("/tickets", response_model=List[TicketResponse])
def get_tickets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "admin":
        tickets = db.query(SupportTicket).order_by(SupportTicket.created_at.desc()).all()
    else:
        tickets = db.query(SupportTicket).filter(SupportTicket.user_id == str(current_user.id)).order_by(SupportTicket.created_at.desc()).all()
    
    response = []
    for t in tickets:
        user_obj = db.query(User).filter(User.id == str(t.user_id)).first()
        res = TicketResponse.model_validate(t)
        if user_obj:
            res.user_email = user_obj.email
            res.user_name = user_obj.full_name
        response.append(res)
    return response

@router.put("/tickets/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: str,
    ticket_in: TicketUpdate,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == str(ticket_id)).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    
    ticket.status = ticket_in.status
    db.commit()
    db.refresh(ticket)
    
    user_obj = db.query(User).filter(User.id == str(ticket.user_id)).first()
    res = TicketResponse.model_validate(ticket)
    if user_obj:
        res.user_email = user_obj.email
        res.user_name = user_obj.full_name
    return res

@router.delete("/tickets/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(
    ticket_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "admin":
        ticket = db.query(SupportTicket).filter(SupportTicket.id == str(ticket_id)).first()
    else:
        ticket = db.query(SupportTicket).filter(
            SupportTicket.id == str(ticket_id),
            SupportTicket.user_id == str(current_user.id)
        ).first()

    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    # Dissociate any chat messages that reference this ticket
    db.query(ChatMessage).filter(ChatMessage.ticket_created_id == str(ticket.id)).update(
        {"ticket_created_id": None}, synchronize_session=False
    )
    db.delete(ticket)
    db.commit()
    return


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard_summary(
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    total_docs = db.query(Document).count()
    total_chats = db.query(ChatSession).count()
    open_tickets = db.query(SupportTicket).filter(SupportTicket.status == "Open").count()
    resolved_tickets = db.query(SupportTicket).filter(SupportTicket.status == "Resolved").count()
    
    stats = DashboardStats(
        total_documents=total_docs,
        total_chats=total_chats,
        open_tickets=open_tickets,
        resolved_tickets=resolved_tickets
    )
    
    recent_sessions = db.query(ChatSession).order_by(ChatSession.created_at.desc()).limit(5).all()
    recent_chats_list = []
    for s in recent_sessions:
        user_obj = db.query(User).filter(User.id == str(s.user_id)).first()
        recent_chats_list.append(RecentChat(
            id=s.id,
            title=s.title,
            created_at=s.created_at,
            user_email=user_obj.email if user_obj else "unknown"
        ))
        
    recent_docs = db.query(Document).order_by(Document.created_at.desc()).limit(5).all()
    recent_uploads_list = []
    for d in recent_docs:
        recent_uploads_list.append(RecentUpload(
            id=d.id,
            filename=d.filename,
            created_at=d.created_at,
            status=d.status
        ))
        
    return DashboardResponse(
        stats=stats,
        recent_chats=recent_chats_list,
        recent_uploads=recent_uploads_list
    )

@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    status_counts = db.query(SupportTicket.status, func.count(SupportTicket.id))\
                      .group_by(SupportTicket.status).all()
    ticket_dist = {s: c for s, c in status_counts}
    for s in ["Open", "In Progress", "Resolved", "Closed"]:
        if s not in ticket_dist:
            ticket_dist[s] = 0
            
    today = datetime.utcnow().date()
    chat_volume = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        
        count = db.query(ChatSession).filter(
            ChatSession.created_at >= day_start,
            ChatSession.created_at <= day_end
        ).count()
        
        chat_volume.append({
            "date": day.strftime("%Y-%m-%d"),
            "count": count
        })
        
    type_counts = db.query(Document.file_type, func.count(Document.id))\
                    .group_by(Document.file_type).all()
    doc_dist = {t: c for t, c in type_counts}
    
    return AnalyticsResponse(
        ticket_distribution=ticket_dist,
        chat_volume_over_time=chat_volume,
        document_type_distribution=doc_dist
    )
