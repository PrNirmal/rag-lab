import unittest
from services.chunking import split_text_recursive, chunk_document


class ChunkingTests(unittest.TestCase):
    def test_split_text_recursive_basic(self):
        text = "Hello World! This is a test."
        # Fits in one chunk of size 50
        chunks = split_text_recursive(text, chunk_size=50, chunk_overlap=10)
        self.assertEqual(chunks, [text])

    def test_split_text_recursive_paragraph_split(self):
        text = "Paragraph one is here.\n\nParagraph two is there."
        # If we set chunk_size=25, it should split at '\n\n'
        chunks = split_text_recursive(text, chunk_size=25, chunk_overlap=5)
        self.assertEqual(chunks, ["Paragraph one is here.", "Paragraph two is there."])

    def test_split_text_recursive_word_split(self):
        text = "WordOne WordTwo WordThree"
        # If chunk_size=15 and chunk_overlap=7
        chunks = split_text_recursive(text, chunk_size=15, chunk_overlap=7)
        self.assertEqual(chunks, ["WordOne WordTwo", "WordTwo WordThree"])

    def test_split_text_recursive_long_split(self):
        # A single word that exceeds chunk_size
        text = "Supercalifragilisticexpialidocious"
        chunks = split_text_recursive(text, chunk_size=10, chunk_overlap=2)
        # Should force split it by character slicing:
        # Chunks will be offset by (10 - 2) = 8
        # chunk 1: 0..10 -> Supercalif
        # chunk 2: 8..18 -> ifragilist
        # chunk 3: 16..26 -> isticexpia
        # chunk 4: 24..34 -> iadocious
        self.assertEqual(
            chunks,
            ["Supercalif", "ifragilist", "sticexpial", "alidocious"]
        )

    def test_chunk_document(self):
        doc = {
            "filename": "test.pdf",
            "pages": [
                {
                    "page": 1,
                    "text": "This is page one text. It is very short."
                },
                {
                    "page": 2,
                    "text": "This is page two text. It is also very short."
                }
            ]
        }
        
        chunks = chunk_document(doc, chunk_size=25, chunk_overlap=5)
        
        # Verify page-aware attributes
        self.assertTrue(len(chunks) > 0)
        for idx, chunk in enumerate(chunks):
            self.assertEqual(chunk["filename"], "test.pdf")
            self.assertEqual(chunk["chunk_index"], idx)
            self.assertIn("page", chunk)
            self.assertIn("text", chunk)
            
        # Verify correct text mapping
        self.assertEqual(chunks[0]["page"], 1)
        self.assertEqual(chunks[-1]["page"], 2)


if __name__ == "__main__":
    unittest.main()
