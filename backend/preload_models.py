import os
from sentence_transformers import SentenceTransformer

model_name = os.getenv("EMBEDDING_MODEL_NAME", "BAAI/bge-small-en-v1.5")
print(f"Caching model {model_name}...")
SentenceTransformer(model_name)
print("Caching completed successfully.")
