import os
import time
import logging
import hashlib
import httpx
from typing import List, Optional, Dict, Any
from fastapi import HTTPException

logger = logging.getLogger(__name__)

_embedding_model: Optional[Any] = None
HAS_SENTENCE_TRANSFORMERS = False

try:
    import torch
    torch.set_num_threads(1)
except Exception:
    pass

try:
    from sentence_transformers import SentenceTransformer
    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False

def get_embedding_model():
    global _embedding_model
    if not HAS_SENTENCE_TRANSFORMERS:
        return None
    if _embedding_model is None:
        model_name = os.getenv("EMBEDDING_MODEL_NAME", "BAAI/bge-small-en-v1.5")
        logger.info(f"Loading sentence-transformer model: {model_name}...")
        try:
            _embedding_model = SentenceTransformer(model_name)
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer ({e}). Falling back to hash vectorizer.")
            _embedding_model = None
    return _embedding_model

import re

def generate_semantic_vector(text: str, dim: int = 384) -> List[float]:
    """
    Subword n-gram semantic vectorizer.
    Produces 384-dimensional dense vectors with L2 normalization.
    Uses < 15MB RAM and executes in milliseconds, eliminating OOM crashes
    on memory-constrained cloud environments like Render Free Tier.
    """
    clean = re.sub(r'[^a-zA-Z0-9\s]', ' ', text.lower())
    words = [w for w in clean.split() if len(w) > 1]
    if not words:
        return [0.0] * dim

    vec = [0.0] * dim

    # 1. Unigrams with frequency weighting
    for w in words:
        h = int(hashlib.md5(w.encode('utf-8')).hexdigest()[:8], 16)
        sign = 1.0 if (h & 1) else -1.0
        vec[h % dim] += sign * 1.5

    # 2. Bigrams (capturing contextual phrases)
    for i in range(len(words) - 1):
        bg = f"{words[i]}_{words[i+1]}"
        h = int(hashlib.md5(bg.encode('utf-8')).hexdigest()[:8], 16)
        sign = 1.0 if (h & 1) else -1.0
        vec[h % dim] += sign * 2.0

    # 3. Subword 3-grams (capturing morphology and root stems)
    for w in words:
        if len(w) >= 4:
            for i in range(len(w) - 2):
                tri = w[i:i+3]
                h = int(hashlib.md5(tri.encode('utf-8')).hexdigest()[:8], 16)
                sign = 1.0 if (h & 1) else -1.0
                vec[h % dim] += sign * 0.8

    # L2 Normalization
    norm = sum(x * x for x in vec) ** 0.5
    if norm > 0:
        vec = [x / norm for x in vec]
    return vec

fallback_embedding = generate_semantic_vector

class AIService:
    fallback_embedding = staticmethod(generate_semantic_vector)

    @staticmethod
    def get_embedding(text: str) -> List[float]:
        cleaned_text = text.replace("\n", " ").strip()
        if os.getenv("USE_HEAVY_EMBEDDINGS", "false").lower() == "true":
            model = get_embedding_model()
            if model is not None:
                try:
                    return model.encode(cleaned_text, normalize_embeddings=True).tolist()
                except Exception as e:
                    logger.warning(f"Heavy embedding failed: {e}. Falling back to semantic vectorizer.")
        return generate_semantic_vector(cleaned_text)

    @staticmethod
    async def query_groq(
        prompt: str,
        system_prompt: str = "You are a helpful assistant.",
        max_retries: int = 3,
        backoff_factor: float = 2.0
    ) -> str:
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key or groq_api_key.startswith("YOUR_"):
            raise ValueError("Groq API key is unconfigured. Please set the GROQ_API_KEY environment variable.")

        model = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
        url = "https://api.groq.com/openai/v1/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {groq_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 1024
        }

        timeout = httpx.Timeout(30.0, connect=10.0)
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            current_delay = 1.0
            for attempt in range(1, max_retries + 1):
                try:
                    response = await client.post(url, json=payload, headers=headers)
                    
                    if response.status_code == 200:
                        data = response.json()
                        return data["choices"][0]["message"]["content"]
                    
                    if response.status_code == 429:
                        retry_after_header = response.headers.get("retry-after")
                        delay = float(retry_after_header) if retry_after_header else current_delay
                        logger.warning(f"Groq API 429 Rate Limited. Retrying in {delay}s (Attempt {attempt}/{max_retries})")
                        time.sleep(delay)
                        current_delay *= backoff_factor
                        continue
                    
                    if response.status_code == 401:
                        raise HTTPException(401, "Invalid Groq API Key")
                    
                    response.raise_for_status()
                    
                except httpx.HTTPStatusError as e:
                    logger.error(f"Groq API HTTP error on attempt {attempt}: {e.response.text}")
                    if attempt == max_retries:
                        raise e
                except (httpx.RequestError, Exception) as e:
                    logger.error(f"Groq API Request error on attempt {attempt}: {e}")
                    if attempt == max_retries:
                        raise e
                
                time.sleep(current_delay)
                current_delay *= backoff_factor

            raise RuntimeError("Failed to query Groq API after maximum retries.")

    @staticmethod
    async def verify_health() -> Dict[str, Any]:
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key or groq_api_key.startswith("YOUR_"):
            return {"status": "unconfigured", "error": "GROQ_API_KEY environment variable is not set."}
        
        try:
            await AIService.query_groq(
                prompt="test",
                system_prompt="respond with 'ok'",
                max_retries=1
            )
            return {"status": "healthy"}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}
