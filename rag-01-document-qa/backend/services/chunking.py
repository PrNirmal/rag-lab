from typing import Any


def split_text_recursive(
    text: str,
    chunk_size: int = 500,
    chunk_overlap: int = 50,
    separators: list[str] = None
) -> list[str]:
    """Splits text recursively using a list of separators:
    - Collapse paragraph-level splits ("\\n\\n") first.
    - Fallback to line-level splits ("\\n").
    - Fallback to word-level splits (" ").
    - Finally, fallback to character-level splits ("").
    """
    if separators is None:
        separators = ["\n\n", "\n", " ", ""]

    if len(text) <= chunk_size:
        return [text] if text else []

    # Find the separator to split on
    selected_sep = separators[0]
    next_separators = separators[1:]

    # Split text
    if selected_sep == "":
        splits = list(text)
    else:
        splits = text.split(selected_sep)

    chunks = []
    current_chunk = []
    current_length = 0

    for split in splits:
        split_len = len(split)
        
        # Determine connector size between elements
        conn_len = len(selected_sep) if (selected_sep != "" and current_chunk) else 0
        
        if current_length + split_len + conn_len > chunk_size:
            # Save the current chunk if it has content
            if current_chunk:
                chunks.append(selected_sep.join(current_chunk) if selected_sep != "" else "".join(current_chunk))
                
                # Keep elements from current_chunk to satisfy chunk_overlap
                overlap_splits = []
                overlap_len = 0
                for s in reversed(current_chunk):
                    s_len = len(s)
                    c_len = len(selected_sep) if (selected_sep != "" and overlap_splits) else 0
                    if overlap_len + s_len + c_len <= chunk_overlap:
                        overlap_splits.insert(0, s)
                        overlap_len += s_len + c_len
                    else:
                        break
                current_chunk = overlap_splits
                current_length = overlap_len
            
            # If the single split is larger than chunk_size, split recursively
            if split_len > chunk_size:
                if next_separators:
                    sub_chunks = split_text_recursive(split, chunk_size, chunk_overlap, next_separators)
                    chunks.extend(sub_chunks)
                else:
                    # Fallback to fixed size character slicing
                    for idx in range(0, split_len, chunk_size - chunk_overlap):
                        chunks.append(split[idx:idx + chunk_size])
            else:
                current_chunk.append(split)
                current_length += split_len + (len(selected_sep) if (selected_sep != "" and len(current_chunk) > 1) else 0)
        else:
            current_chunk.append(split)
            current_length += split_len + (len(selected_sep) if (selected_sep != "" and len(current_chunk) > 1) else 0)

    if current_chunk:
        chunks.append(selected_sep.join(current_chunk) if selected_sep != "" else "".join(current_chunk))

    return chunks


def chunk_document(
    document: dict[str, Any],
    chunk_size: int = 500,
    chunk_overlap: int = 50
) -> list[dict[str, Any]]:
    """Chunks a standardized document structure into page-aware text chunks."""
    filename = document.get("filename", "unknown")
    pages = document.get("pages", [])
    chunks = []
    chunk_index = 0

    for page_data in pages:
        page_num = page_data.get("page", 1)
        page_text = page_data.get("text", "")

        # Split text of this page into sub-chunks
        page_chunks = split_text_recursive(page_text, chunk_size, chunk_overlap)

        for text_chunk in page_chunks:
            chunks.append({
                "filename": filename,
                "page": page_num,
                "chunk_index": chunk_index,
                "text": text_chunk
            })
            chunk_index += 1

    return chunks
