from pathlib import Path
from typing import Any

# Global Chroma client cache
_client = None


def get_chroma_client() -> Any:
    """Lazily initializes and returns the persistent Chroma DB client."""
    global _client
    if _client is None:
        try:
            import chromadb
            # Database directory is persisted in backend/data
            chroma_db_dir = Path(__file__).resolve().parents[1] / "data"
            _client = chromadb.PersistentClient(path=str(chroma_db_dir))
        except ImportError as e:
            raise ImportError(
                "chromadb package is not installed. "
                "Please run pip install chromadb."
            ) from e
    return _client


def get_or_create_collection(name: str = "documents") -> Any:
    """Gets or creates the default collection in Chroma DB."""
    client = get_chroma_client()
    return client.get_or_create_collection(name=name)


def add_documents(
    chunks: list[dict[str, Any]],
    embeddings: list[list[float]]
) -> None:
    """Adds a list of text chunks and their embeddings to the vector database.
    Each chunk is expected to be a dictionary like:
    {
        "filename": "...",
        "page": 1,
        "chunk_index": 0,
        "text": "..."
    }
    """
    if not chunks:
        return

    collection = get_or_create_collection()

    ids = []
    documents = []
    metadatas = []

    for chunk in chunks:
        # Create a unique ID for each chunk
        chunk_id = f"{chunk['filename']}_p{chunk['page']}_c{chunk['chunk_index']}"
        ids.append(chunk_id)
        documents.append(chunk["text"])
        metadatas.append({
            "filename": chunk["filename"],
            "page": chunk["page"],
            "chunk_index": chunk["chunk_index"]
        })

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas
    )


def query_documents(
    query_embedding: list[float],
    n_results: int = 5
) -> list[dict[str, Any]]:
    """Queries the vector database using a query embedding vector."""
    if not query_embedding:
        return []

    collection = get_or_create_collection()
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results
    )

    formatted_results = []
    if not results or not results.get("documents") or len(results["documents"]) == 0:
        return formatted_results

    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    ids = results["ids"][0]
    distances = results.get("distances", [[]])[0]

    for i in range(len(documents)):
        formatted_results.append({
            "id": ids[i],
            "text": documents[i],
            "metadata": metadatas[i],
            "distance": distances[i] if i < len(distances) else None
        })

    return formatted_results


def get_all_filenames() -> list[str]:
    """Retrieves a list of unique filenames indexed in the vector database."""
    collection = get_or_create_collection()
    data = collection.get(include=["metadatas"])
    if not data or not data.get("metadatas"):
        return []

    filenames = set()
    for meta in data["metadatas"]:
        if meta and "filename" in meta:
            filenames.add(meta["filename"])
    return sorted(list(filenames))


def get_document_chunks(filename: str) -> list[dict[str, Any]]:
    """Retrieves all chunks for a given filename from the vector database, ordered by chunk_index."""
    collection = get_or_create_collection()
    data = collection.get(where={"filename": filename}, include=["documents", "metadatas"])
    if not data or not data.get("documents"):
        return []

    chunks = []
    for doc, meta in zip(data["documents"], data["metadatas"]):
        chunks.append({
            "filename": meta.get("filename"),
            "page": meta.get("page"),
            "chunk_index": meta.get("chunk_index"),
            "text": doc
        })
    # Sort chunks by page and then chunk_index to maintain reading order
    chunks.sort(key=lambda c: (c["page"], c["chunk_index"]))
    return chunks
