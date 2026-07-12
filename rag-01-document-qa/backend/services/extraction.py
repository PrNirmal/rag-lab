import re
from pathlib import Path
from typing import Any
import fitz
from docx import Document
from fastapi import HTTPException, status


def clean_text(text: str) -> str:
    """Preprocesses and normalizes text extracted from documents:
    - Normalizes line endings to \\n.
    - Removes repeated horizontal spaces/tabs.
    - Trims leading/trailing whitespace of each line.
    - Collapses multiple consecutive empty lines to a single empty line to preserve paragraph breaks.
    - Trims leading/trailing empty lines of the entire document.
    """
    if not text:
        return ""

    # Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Clean each line
    lines = text.split("\n")
    cleaned_lines = []
    for line in lines:
        # Collapse multiple spaces/tabs to a single space, and strip the line
        cleaned_line = re.sub(r"[ \t]+", " ", line).strip()
        cleaned_lines.append(cleaned_line)

    # Collapse consecutive blank lines
    final_lines = []
    for line in cleaned_lines:
        if line:
            final_lines.append(line)
        else:
            if final_lines and final_lines[-1] != "":
                final_lines.append("")

    # Remove leading blank lines
    while final_lines and final_lines[0] == "":
        final_lines.pop(0)

    # Remove trailing blank lines
    while final_lines and final_lines[-1] == "":
        final_lines.pop()

    return "\n".join(final_lines)


def extract_text_from_pdf(file_path: str | Path) -> dict[str, Any]:
    path = Path(file_path)
    pages = []
    with fitz.open(path) as document:
        for i, page in enumerate(document, start=1):
            text = page.get_text()
            pages.append({
                "page": i,
                "text": clean_text(text)
            })
    return {
        "filename": path.name,
        "pages": pages
    }


def extract_text_from_docx(file_path: str | Path) -> dict[str, Any]:
    path = Path(file_path)
    document = Document(path)
    paragraphs = [paragraph.text for paragraph in document.paragraphs]
    text = "\n\n".join(paragraphs)
    return {
        "filename": path.name,
        "pages": [
            {
                "page": 1,
                "text": clean_text(text)
            }
        ]
    }


def extract_text_from_text(file_path: str | Path) -> dict[str, Any]:
    path = Path(file_path)
    text = path.read_text(encoding="utf-8")
    return {
        "filename": path.name,
        "pages": [
            {
                "page": 1,
                "text": clean_text(text)
            }
        ]
    }


def extract_text(file_path: Path) -> dict[str, Any]:
    """Helper dispatcher that directs file extraction based on suffix."""
    suffix = file_path.suffix.lower()
    if suffix == ".pdf":
        return extract_text_from_pdf(file_path)
    if suffix == ".docx":
        return extract_text_from_docx(file_path)
    if suffix in {".txt", ".md", ".csv"}:
        return extract_text_from_text(file_path)
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")
