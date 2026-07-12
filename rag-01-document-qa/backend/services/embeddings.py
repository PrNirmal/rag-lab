from typing import Any

# We load the model lazily to avoid slowing down import / startup time
_model = None


def get_embedding_model() -> Any:
    """Lazily loads and returns the local SentenceTransformer model."""
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer("all-MiniLM-L6-v2")
        except ImportError as e:
            raise ImportError(
                "sentence-transformers package is not installed. "
                "Please run pip install sentence-transformers."
            ) from e
    return _model


def get_embedding(text: str) -> list[float]:
    """Generates an embedding vector for a single text chunk.
    For all-MiniLM-L6-v2, this returns a list of 384 floats.
    """
    if not text:
        return []
    model = get_embedding_model()
    embedding = model.encode(text, convert_to_numpy=True)
    return embedding.tolist()


def get_embeddings(texts: list[str]) -> list[list[float]]:
    """Generates embedding vectors for a list of text chunks in batch."""
    if not texts:
        return []
    model = get_embedding_model()
    embeddings = model.encode(texts, convert_to_numpy=True)
    return embeddings.tolist()
