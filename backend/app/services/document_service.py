import os
import logging
import uuid
import fitz # PyMuPDF
import docx
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from backend.app.models.models import Document, DocumentChunk
from backend.app.services.ai_service import AIService

logger = logging.getLogger(__name__)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class DocumentService:
    @staticmethod
    def extract_text_from_pdf(file_path: str) -> str:
        text = ""
        with fitz.open(file_path) as doc:
            for page in doc:
                text += page.get_text() + "\n"
        return text

    @staticmethod
    def extract_text_from_docx(file_path: str) -> str:
        doc = docx.Document(file_path)
        text = []
        for para in doc.paragraphs:
            text.append(para.text)
        return "\n".join(text)

    @staticmethod
    def extract_text_from_txt(file_path: str) -> str:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    @staticmethod
    def extract_text(file_path: str, file_type: str) -> str:
        file_type = file_type.upper()
        if file_type == "PDF":
            return DocumentService.extract_text_from_pdf(file_path)
        elif file_type in ("DOCX", "DOC"):
            return DocumentService.extract_text_from_docx(file_path)
        elif file_type == "TXT":
            return DocumentService.extract_text_from_txt(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

    @staticmethod
    def chunk_text(text: str, chunk_size_words: int = 380, overlap_words: int = 40) -> List[str]:
        words = text.split()
        if not words:
            return []
        
        chunks = []
        i = 0
        while i < len(words):
            chunk_words = words[i:i + chunk_size_words]
            chunks.append(" ".join(chunk_words))
            i += (chunk_size_words - overlap_words)
            if i >= len(words) or (chunk_size_words - overlap_words) <= 0:
                break
        return chunks

    @classmethod
    def process_document_background(cls, db_session_factory, document_id: str, file_path: str, file_type: str):
        db: Session = db_session_factory()
        doc_id_str = str(document_id)
        document = db.query(Document).filter(Document.id == doc_id_str).first()
        if not document:
            logger.error(f"Document {doc_id_str} not found in background processor.")
            db.close()
            return

        try:
            text = cls.extract_text(file_path, file_type)
            if not text.strip():
                raise ValueError("No text could be extracted from the file.")

            chunks = cls.chunk_text(text)
            
            for idx, chunk_content in enumerate(chunks):
                embedding = AIService.get_embedding(chunk_content)
                
                chunk_obj = DocumentChunk(
                    document_id=str(document.id),
                    content=chunk_content,
                    embedding=embedding,
                    chunk_index=idx,
                    metadata_json={"filename": document.filename, "chunk_index": idx}
                )
                db.add(chunk_obj)
            
            document.status = "completed"
            db.commit()
            logger.info(f"Successfully processed and embedded document {document.filename} ({len(chunks)} chunks)")

        except Exception as e:
            db.rollback()
            document.status = "error"
            db.commit()
            logger.exception(f"Error processing document {document.filename}: {e}")
        finally:
            db.close()
