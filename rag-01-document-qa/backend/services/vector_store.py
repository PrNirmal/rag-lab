import os
from pathlib import Path
from typing import Any

# Global Chroma client cache
_client = None


def get_chroma_db_dir() -> Path:
    """Resolves the persistent Chroma DB directory across local and containerized deployments."""
    env_dir = os.getenv("CHROMA_DB_DIR")
    if env_dir:
        path = Path(env_dir)
        if not path.is_absolute():
            # If relative path is provided in .env (e.g. 'data'), resolve relative to backend folder
            base_dir = Path(__file__).resolve().parents[1]
            path = base_dir / path
    elif Path("/app/data").exists() and os.access("/app/data", os.W_OK):
        path = Path("/app/data")
    else:
        # Default to backend/data relative to project root
        path = Path(__file__).resolve().parents[1] / "data"

    path.mkdir(parents=True, exist_ok=True)
    return path


def get_chroma_client() -> Any:
    """Lazily initializes and returns the persistent Chroma DB client."""
    global _client
    if _client is None:
        try:
            import chromadb
            chroma_db_dir = get_chroma_db_dir()
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


def delete_document(filename: str) -> dict[str, Any]:
    """Deletes all chunks belonging to a filename from the vector database."""
    collection = get_or_create_collection()
    data = collection.get(where={"filename": filename}, include=["metadatas"])
    if not data or not data.get("ids") or len(data["ids"]) == 0:
        return {"success": False, "deleted_chunks": 0, "filename": filename}

    chunk_ids = data["ids"]
    collection.delete(ids=chunk_ids)
    return {"success": True, "deleted_chunks": len(chunk_ids), "filename": filename}


def delete_all_documents() -> dict[str, Any]:
    """Deletes all documents and chunks in the vector database collection."""
    collection = get_or_create_collection()
    data = collection.get(include=["metadatas"])
    if not data or not data.get("ids") or len(data["ids"]) == 0:
        return {"success": True, "deleted_chunks": 0}

    chunk_ids = data["ids"]
    collection.delete(ids=chunk_ids)
    return {"success": True, "deleted_chunks": len(chunk_ids)}


def get_all_documents_metadata() -> list[dict[str, Any]]:
    """Retrieves aggregated metadata for all distinct documents indexed in Chroma DB."""
    collection = get_or_create_collection()
    data = collection.get(include=["metadatas", "documents"])
    if not data or not data.get("metadatas"):
        return []

    docs_map: dict[str, dict[str, Any]] = {}
    
    for doc, meta in zip(data.get("documents", []), data.get("metadatas", [])):
        if not meta or "filename" not in meta:
            continue
        fname = meta["filename"]
        page = meta.get("page", 1)
        chunk_idx = meta.get("chunk_index", 0)

        if fname not in docs_map:
            docs_map[fname] = {
                "filename": fname,
                "total_chunks": 0,
                "pages": set(),
                "first_chunk": (chunk_idx, doc or "")
            }
        
        docs_map[fname]["total_chunks"] += 1
        docs_map[fname]["pages"].add(page)
        if chunk_idx < docs_map[fname]["first_chunk"][0]:
            docs_map[fname]["first_chunk"] = (chunk_idx, doc or "")

    results = []
    for fname, info in sorted(docs_map.items(), key=lambda x: x[0].lower()):
        first_text = info["first_chunk"][1] or ""
        preview = first_text[:120].strip() + ("..." if len(first_text) > 120 else "")
        results.append({
            "filename": fname,
            "total_chunks": info["total_chunks"],
            "pages": sorted(list(info["pages"])),
            "preview": preview
        })

    return results

