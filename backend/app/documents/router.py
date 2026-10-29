import os
import shutil
import uuid
import re
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.orm import Session

from backend.app.database.database import get_db, SessionLocal
from backend.app.models.models import Document, User
from backend.app.schemas.schemas import DocumentResponse
from backend.app.auth.utils import get_current_user, get_admin_user
from backend.app.services.document_service import DocumentService, UPLOAD_DIR

router = APIRouter(tags=["Documents"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}

def sanitize_filename(filename: str) -> str:
    filename = os.path.basename(filename)
    filename = re.sub(r'[^a-zA-Z0-9_\-\. ]', '', filename)
    return filename

@router.post("/documents/upload", response_model=DocumentResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Supported formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    safe_filename = sanitize_filename(file.filename)
    
    doc_id = str(uuid.uuid4())
    storage_filename = f"{doc_id}_{safe_filename}"
    file_path = os.path.join(UPLOAD_DIR, storage_filename)

    total_size = 0
    try:
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 64)
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > MAX_FILE_SIZE:
                    buffer.close()
                    if os.path.exists(file_path):
                        os.remove(file_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="File is too large. Maximum allowed size is 10MB."
                    )
                buffer.write(chunk)
    except Exception as e:
        if not isinstance(e, HTTPException):
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload file: {str(e)}"
            )
        raise e

    new_doc = Document(
        id=doc_id,
        filename=safe_filename,
        file_type=ext.upper(),
        file_size=total_size,
        storage_path=file_path,
        status="processing",
        created_by_id=str(current_user.id)
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    background_tasks.add_task(
        DocumentService.process_document_background,
        SessionLocal,
        new_doc.id,
        file_path,
        new_doc.file_type
    )

    return new_doc

@router.get("/documents", response_model=List[DocumentResponse])
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Document).order_by(Document.created_at.desc()).all()

@router.get("/documents/{doc_id}", response_model=DocumentResponse)
def get_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == str(doc_id)).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return doc

@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    doc_id: str,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == str(doc_id)).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if os.path.exists(doc.storage_path):
        try:
            os.remove(doc.storage_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()
    return
