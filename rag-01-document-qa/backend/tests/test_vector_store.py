import unittest
import tempfile
from pathlib import Path
import chromadb
from services.vector_store import add_documents, query_documents
import services.vector_store as vs


class VectorStoreTests(unittest.TestCase):
    def setUp(self):
        # Create a temporary directory for the test database
        self.tmpdir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmpdir.name)
        
        # Override chroma client in the service to point to the temp path
        self.original_client = vs._client
        vs._client = chromadb.PersistentClient(path=str(self.db_path))

    def tearDown(self):
        # Restore the original client and cleanup
        vs._client = self.original_client
        self.tmpdir.cleanup()

    def test_add_and_query_documents(self):
        chunks = [
            {
                "filename": "document1.pdf",
                "page": 1,
                "chunk_index": 0,
                "text": "The quick brown fox jumps over the lazy dog."
            },
            {
                "filename": "document1.pdf",
                "page": 2,
                "chunk_index": 1,
                "text": "Artificial intelligence is changing the world."
            }
        ]
        
        # 3-dimensional mock embeddings for testing
        embeddings = [
            [0.1, 0.2, 0.3],
            [0.8, 0.9, 1.0]
        ]
        
        # Add to the database
        add_documents(chunks, embeddings)
        
        # Query using the first embedding
        results = query_documents([0.1, 0.2, 0.3], n_results=1)
        
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], "document1.pdf_p1_c0")
        self.assertEqual(results[0]["text"], "The quick brown fox jumps over the lazy dog.")
        self.assertEqual(results[0]["metadata"]["filename"], "document1.pdf")
        self.assertEqual(results[0]["metadata"]["page"], 1)
        
        # Query using the second embedding
        results_2 = query_documents([0.7, 0.8, 0.9], n_results=1)
        self.assertEqual(len(results_2), 1)
        self.assertEqual(results_2[0]["id"], "document1.pdf_p2_c1")


if __name__ == "__main__":
    unittest.main()
