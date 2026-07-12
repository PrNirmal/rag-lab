import unittest
from services.embeddings import get_embedding, get_embeddings


class EmbeddingTests(unittest.TestCase):
    def test_get_embedding_basic(self):
        text = "Hello world"
        embedding = get_embedding(text)
        
        # Verify it's a list of floats
        self.assertIsInstance(embedding, list)
        self.assertTrue(len(embedding) > 0)
        self.assertIsInstance(embedding[0], float)
        
        # Verify dimension is 384 for all-MiniLM-L6-v2
        self.assertEqual(len(embedding), 384)

    def test_get_embeddings_batch(self):
        texts = ["Hello world", "RAG document QA", "Sentence Transformers"]
        embeddings = get_embeddings(texts)
        
        self.assertEqual(len(embeddings), 3)
        for emb in embeddings:
            self.assertEqual(len(emb), 384)
            self.assertIsInstance(emb, list)
            self.assertIsInstance(emb[0], float)

    def test_get_embedding_empty(self):
        self.assertEqual(get_embedding(""), [])
        self.assertEqual(get_embeddings([]), [])


if __name__ == "__main__":
    unittest.main()
