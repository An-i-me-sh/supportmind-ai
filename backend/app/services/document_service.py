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
        doc_id_str = str(document_id)
        logger.info(f"Background worker started for document ID: {doc_id_str}")

        try:
            text = cls.extract_text(file_path, file_type)
            if not text or not text.strip():
                raise ValueError("No readable text could be extracted from this document.")

            chunks = cls.chunk_text(text)
            logger.info(f"Extracted {len(chunks)} chunks from {file_path}. Generating embeddings...")

            with db_session_factory() as db:
                document = db.query(Document).filter(Document.id == doc_id_str).first()
                if not document:
                    logger.error(f"Document {doc_id_str} not found in database.")
                    return

                for idx, chunk_content in enumerate(chunks):
                    try:
                        embedding = AIService.get_embedding(chunk_content)
                    except Exception as emb_err:
                        logger.warning(f"Embedding failed for chunk {idx}: {emb_err}. Using fallback.")
                        embedding = AIService.fallback_embedding(chunk_content)

                    if hasattr(embedding, "tolist"):
                        embedding = embedding.tolist()

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
                logger.info(f"Successfully indexed document {document.filename} with {len(chunks)} chunks.")

        except Exception as e:
            logger.exception(f"Fatal error processing document {doc_id_str}: {e}")
            try:
                with db_session_factory() as err_db:
                    err_doc = err_db.query(Document).filter(Document.id == doc_id_str).first()
                    if err_doc:
                        err_doc.status = "error"
                        err_db.commit()
                        logger.info(f"Marked document {doc_id_str} as error in database.")
            except Exception as update_err:
                logger.error(f"Could not update document status to error: {update_err}")
