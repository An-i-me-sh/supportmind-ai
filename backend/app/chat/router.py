import os
import re
import json
import uuid
import logging
import numpy as np
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.models.models import ChatSession, ChatMessage, DocumentChunk, SupportTicket, User
from backend.app.schemas.schemas import MessageCreate, MessageResponse, ChatSessionResponse
from backend.app.auth.utils import get_current_user
from backend.app.services.ai_service import AIService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Chat"])

SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.3"))

def parse_structured_ai_response(raw_text: str):
    """
    Parses JSON output from LLM:
    {"has_information": true | false, "answer": "..."}
    """
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned).strip()

    # 1. Direct JSON parse
    try:
        data = json.loads(cleaned)
        if isinstance(data, dict) and "has_information" in data:
            has_info = bool(data["has_information"])
            answer = str(data.get("answer", "")).strip()
            return has_info, answer
    except Exception:
        pass

    # 2. Search for embedded JSON
    json_match = re.search(r'\{\s*"has_information"\s*:\s*(true|false)\s*,\s*"answer"\s*:\s*"(.*?)"\s*\}', cleaned, re.DOTALL)
    if json_match:
        has_info = json_match.group(1).lower() == "true"
        answer = json_match.group(2).strip()
        return has_info, answer

    # 3. Fallback: only if the text is explicitly an empty refusal
    t = cleaned.lower()
    refusal_starts = (
        "the information regarding", "the requested information is not",
        "i cannot find information", "i could not find information",
        "there is no information", "no information is available",
        "the documents do not contain information", "the available knowledge base does not contain"
    )
    if any(t.startswith(start) for start in refusal_starts):
        return False, cleaned

    return True, cleaned



def compute_cosine_similarity(v1: list, v2: list) -> float:
    a = np.array(v1, dtype=float)
    b = np.array(v2, dtype=float)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))

def compute_hybrid_score(query: str, chunk_text: str, vector_sim: float) -> float:
    # Extract query keywords (>3 chars)
    q_words = set(w.lower().strip("?,.!") for w in query.split() if len(w) > 3)
    if not q_words:
        return vector_sim
    c_words = set(w.lower().strip("?,.!") for w in chunk_text.split() if len(w) > 3)
    overlap = len(q_words.intersection(c_words)) / float(len(q_words))
    # Hybrid score combines 75% vector embedding + 25% keyword overlap
    return float(0.75 * vector_sim + 0.25 * overlap)

def compute_keyword_similarity(query: str, text: str) -> float:
    stopwords = {"a", "an", "the", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "to", "from", "in", "out", "on", "off", "what", "which", "who", "whom", "this", "that", "these", "those", "or", "and", "if", "of", "at", "by", "for", "with", "about"}
    query_words = set(query.lower().replace("?", " ").replace(".", " ").split())
    q_words = {w for w in query_words if w not in stopwords and len(w) > 1}
    if not q_words:
        return 0.0
    text_lower = text.lower()
    matches = sum(1 for w in q_words if w in text_lower)
    return matches / len(q_words)

@router.post("/chat", response_model=MessageResponse)
async def chat_interaction(
    chat_in: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session_id = str(chat_in.session_id) if chat_in.session_id else None
    if not session_id:
        title = chat_in.content[:40] + ("..." if len(chat_in.content) > 40 else "")
        session = ChatSession(user_id=str(current_user.id), title=title)
        db.add(session)
        db.commit()
        db.refresh(session)
        session_id = str(session.id)
    else:
        session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == str(current_user.id)).first()
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")

    # Save User message
    user_message = ChatMessage(
        session_id=session_id,
        sender="user",
        content=chat_in.content
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    # Generate query embedding
    try:
        query_embedding = AIService.get_embedding(chat_in.content)
    except Exception as e:
        logger.exception("Error generating embedding for chat query:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize semantic search. Please try again."
        )

    # Semantic vector search
    dialect_name = db.bind.dialect.name
    results = []

    if dialect_name == "postgresql":
        try:
            raw_results = db.query(
                DocumentChunk,
                (1 - DocumentChunk.embedding.cosine_distance(query_embedding)).label("similarity")
            ).filter(DocumentChunk.embedding != None)\
             .order_by(DocumentChunk.embedding.cosine_distance(query_embedding))\
             .limit(5)\
             .all()
            results = [(chunk, float(score)) for chunk, score in raw_results]
        except Exception as pg_err:
            logger.warning(f"PostgreSQL native vector search failed ({pg_err}), falling back to hybrid scorer.")
            results = []

    if not results:
        # Fallback for SQLite or when native vector query falls back
        all_chunks = db.query(DocumentChunk).all()
        scored_chunks = []
        for chunk in all_chunks:
            if chunk.embedding:
                emb = chunk.embedding if isinstance(chunk.embedding, list) else list(chunk.embedding)
                vector_sim = compute_cosine_similarity(query_embedding, emb)
                sim = compute_hybrid_score(chat_in.content, chunk.content, vector_sim)
                scored_chunks.append((chunk, sim))
        scored_chunks.sort(key=lambda x: x[1], reverse=True)
        results = scored_chunks[:5]

    valid_results = [(chunk, score) for chunk, score in results if score >= SIMILARITY_THRESHOLD]
    
    ai_response_content = ""
    citations = []
    ticket_id = None

    if not valid_results:
        ticket_subject = f"Auto-Ticket: {chat_in.content[:50]}"
        new_ticket = SupportTicket(
            user_id=str(current_user.id),
            subject=ticket_subject,
            description=f"User asked: {chat_in.content}\n\nAI Assessment: No matching context chunks found in knowledge base.",
            status="Open"
        )
        db.add(new_ticket)
        db.commit()
        db.refresh(new_ticket)
        ticket_id = str(new_ticket.id)
        
        ai_response_content = (
            "I could not find information regarding your question in the uploaded documents. "
            f"I have automatically created a support ticket (ID: {ticket_id}) for you. "
            "Our support team has been notified and will review your request shortly."
        )
        citations = []
    else:
        context_parts = []
        for chunk, score in valid_results:
            filename = chunk.metadata_json.get("filename", "Unknown Document") if chunk.metadata_json else "Unknown Document"
            citations.append({
                "filename": filename,
                "chunk_index": chunk.chunk_index,
                "score": float(round(score, 4))
            })
            context_parts.append(f"[Source: {filename}, Chunk: {chunk.chunk_index}]\n{chunk.content}")
        
        context = "\n\n---\n\n".join(context_parts)
        
        system_prompt = (
            "You are SupportMind AI, an enterprise customer support assistant.\n"
            "Analyze the provided context documents to answer the user question accurately.\n"
            "Respond strictly with a JSON object in this exact schema:\n"
            "{\n"
            '  "has_information": true | false,\n'
            '  "answer": "Your clear, direct answer here without [Source: ...] brackets."\n'
            "}\n"
            "CRITICAL RULES:\n"
            "1. Set 'has_information': true whenever the context contains facts, policies, rules, or details to answer the question (including when a policy specifies conditions, exceptions, restrictions, or states that something is optional or not mandatory for certain users).\n"
            "2. Set 'has_information': false ONLY when the requested topic is completely missing, unmentioned, or unknown in the documentation.\n"
            "3. In the 'answer' field, do NOT include '[Source: ...]' or chunk markers.\n"
            "4. Respond strictly with raw JSON, no markdown fences."
        )
        
        prompt = (
            f"Context Information:\n{context}\n\n"
            f"User Question: {chat_in.content}\n\n"
            f"JSON Response:"
        )

        try:
            raw_response = await AIService.query_groq(prompt=prompt, system_prompt=system_prompt)
        except Exception as e:
            logger.exception("Error querying Groq LLM:")
            ticket_subject = f"System-Ticket: {chat_in.content[:50]}"
            new_ticket = SupportTicket(
                user_id=str(current_user.id),
                subject=ticket_subject,
                description=f"User asked: {chat_in.content}\n\nSystem Error: failed to contact Groq API ({str(e)})",
                status="Open"
            )
            db.add(new_ticket)
            db.commit()
            db.refresh(new_ticket)
            ticket_id = str(new_ticket.id)
            ai_response_content = (
                "Our AI model is currently experiencing high load. "
                f"I have automatically created a support ticket (ID: {ticket_id}) on your behalf, and our team will get back to you with the answer."
            )
            citations = []

        if not ticket_id:
            has_info, answer = parse_structured_ai_response(raw_response)
            clean_answer = re.sub(r'\[Source:[^\]]*\]', '', answer)
            clean_answer = re.sub(r'\[Chunk:[^\]]*\]', '', clean_answer)
            clean_answer = re.sub(r'\[NO_INFO\]', '', clean_answer, flags=re.IGNORECASE).strip()

            if not has_info:
                ticket_subject = f"Auto-Ticket: {chat_in.content[:50]}"
                new_ticket = SupportTicket(
                    user_id=str(current_user.id),
                    subject=ticket_subject,
                    description=f"User asked: {chat_in.content}\n\nAI Assessment: {clean_answer or 'Information not found in documentation.'}",
                    status="Open"
                )
                db.add(new_ticket)
                db.commit()
                db.refresh(new_ticket)
                ticket_id = str(new_ticket.id)

                ai_response_content = (
                    f"{clean_answer} "
                    f"I have automatically created a support ticket (ID: {ticket_id}) for you. "
                    "Our support team has been notified and will review your request shortly."
                )
                citations = []
            else:
                ai_response_content = clean_answer

    ai_message = ChatMessage(
        session_id=session_id,
        sender="ai",
        content=ai_response_content,
        citations=citations,
        ticket_created_id=ticket_id
    )
    db.add(ai_message)
    db.commit()
    db.refresh(ai_message)

    return ai_message

@router.get("/chat/history", response_model=List[ChatSessionResponse])
def get_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sessions = db.query(ChatSession).filter(ChatSession.user_id == str(current_user.id)).order_by(ChatSession.created_at.desc()).all()
    return sessions

@router.delete("/chat/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == str(session_id),
        ChatSession.user_id == str(current_user.id)
    ).first()
    if not session and current_user.role == "admin":
        session = db.query(ChatSession).filter(ChatSession.id == str(session_id)).first()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")

    # Collect any auto-created ticket IDs from this chat session's messages
    ticket_ids = [m.ticket_created_id for m in session.messages if m.ticket_created_id]

    # Nullify references in messages first
    for m in session.messages:
        m.ticket_created_id = None
    db.flush()

    db.delete(session)

    # Delete any associated support tickets that were created during this session
    if ticket_ids:
        db.query(SupportTicket).filter(SupportTicket.id.in_(ticket_ids)).delete(synchronize_session=False)

    db.commit()
    return

