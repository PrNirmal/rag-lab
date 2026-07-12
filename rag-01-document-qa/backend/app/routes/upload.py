from pathlib import Path
import shutil
import tempfile
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from services.extraction import extract_text
from services.chunking import chunk_document
from services.embeddings import get_embedding, get_embeddings
from services.vector_store import (
    add_documents,
    query_documents,
    get_all_filenames,
    get_document_chunks,
)

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/", status_code=status.HTTP_201_CREATED)
async def upload_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file selected")

    # Check for duplicate files in the database
    if file.filename in get_all_filenames():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="File already exists")

    suffix = Path(file.filename).suffix
    temp_path = None
    try:
        # Write to a temporary file using tempfile module
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_path = Path(temp_file.name)

        # Extract text from the temporary file path
        extracted_text = extract_text(temp_path)
        # Override the filename field with the original filename (instead of temp file name)
        extracted_text["filename"] = file.filename

        # Chunk the extracted text
        chunks = chunk_document(extracted_text)
        
        # Generate embeddings for the chunks
        texts = [chunk["text"] for chunk in chunks]
        embeddings = get_embeddings(texts)
        
        # Add chunks and embeddings to the vector database
        add_documents(chunks, embeddings)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process and index file: {str(e)}"
        )
    finally:
        # Clean up the temp file after processing is done
        if temp_path and temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass

    return {
        "message": "File uploaded and indexed successfully",
        "filename": file.filename,
        "extracted_text": extracted_text,
        "chunks": chunks,
    }


@router.get("/")
async def list_uploads():
    # Return files list directly from the database
    return {"files": get_all_filenames()}


@router.get("/query")
async def query_rag(
    q: str, 
    n: int = 5, 
    provider: str = None, 
    medium: str = None
):
    if not q:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query string parameter 'q' is required"
        )
    try:
        query_emb = get_embedding(q)
        results = query_documents(query_emb, n_results=n)
        
        # Extract text content from chunks to construct context for LLM
        contexts = [res["text"] for res in results]
        
        # Choose provider from either parameter (provider or medium)
        chosen_provider = provider or medium
        
        from services.llm import generate_answer
        answer = generate_answer(q, contexts, provider=chosen_provider)
        
        # Format the results metadata and collect unique sources
        formatted_results = []
        sources = []
        seen_sources = set()
        
        for res in results:
            doc_name = res["metadata"].get("filename", "")
            page_num = res["metadata"].get("page", 0)
            
            # Map chunk metadata to document and page keys
            formatted_metadata = {
                "document": doc_name,
                "page": page_num
            }
            
            formatted_results.append({
                "id": res["id"],
                "text": res["text"],
                "metadata": formatted_metadata,
                "distance": res.get("distance")
            })
            
            source_key = (doc_name, page_num)
            if source_key not in seen_sources:
                seen_sources.add(source_key)
                sources.append({
                    "document": doc_name,
                    "page": page_num
                })
        
        return {
            "query": q,
            "answer": answer,
            "results": formatted_results,
            "sources": sources
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Query failed: {str(e)}"
        )


@router.get("/{filename}/chunks")
async def get_file_chunks(filename: str):
    # Fetch chunk data directly from the vector store
    chunks = get_document_chunks(filename)
    if not chunks:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    return {
        "filename": filename,
        "chunks": chunks
    }
