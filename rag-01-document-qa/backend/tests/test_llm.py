import unittest
from unittest.mock import patch, MagicMock
import os
from services.llm import generate_answer


class LLMTests(unittest.TestCase):
    def setUp(self):
        # Backup environment variables
        self.original_env = dict(os.environ)

    def tearDown(self):
        # Restore environment variables
        os.environ.clear()
        os.environ.update(self.original_env)

    @patch("services.llm.requests.post")
    def test_call_ollama_success(self, mock_post):
        # Setup mock response for Ollama
        mock_response = MagicMock()
        mock_response.json.return_value = {"response": "Mocked Ollama response"}
        mock_response.raise_for_status = MagicMock()
        mock_post.return_value = mock_response

        os.environ["LLM_PROVIDER"] = "ollama"
        os.environ["OLLAMA_BASE_URL"] = "http://localhost:11434"
        os.environ["OLLAMA_MODEL"] = "llama3"

        answer = generate_answer("What is RAG?", ["RAG is Retrieval-Augmented Generation."])
        
        self.assertEqual(answer, "Mocked Ollama response")
        mock_post.assert_called_once()
        
        # Verify call arguments
        args, kwargs = mock_post.call_args
        self.assertEqual(args[0], "http://localhost:11434/api/generate")
        self.assertEqual(kwargs["json"]["model"], "llama3")
        self.assertIn("RAG is Retrieval-Augmented Generation.", kwargs["json"]["prompt"])

    @patch("services.llm.requests.post")
    def test_call_openrouter_success(self, mock_post):
        # Setup mock response for OpenRouter chat completions API
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": "Mocked OpenRouter response"
                    }
                }
            ]
        }
        mock_response.raise_for_status = MagicMock()
        mock_post.return_value = mock_response

        os.environ["LLM_PROVIDER"] = "openrouter"
        os.environ["OPENROUTER_API_KEY"] = "sk-or-valid-key"
        os.environ["OPENROUTER_MODEL"] = "meta-llama/llama-3-8b-instruct:free"

        answer = generate_answer("What is FastAPI?", ["FastAPI is a Python web framework."])
        
        self.assertEqual(answer, "Mocked OpenRouter response")
        mock_post.assert_called_once()
        
        args, kwargs = mock_post.call_args
        self.assertEqual(args[0], "https://openrouter.ai/api/v1/chat/completions")
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer sk-or-valid-key")
        self.assertEqual(kwargs["json"]["model"], "meta-llama/llama-3-8b-instruct:free")
        self.assertEqual(kwargs["json"]["messages"][0]["role"], "user")

    def test_openrouter_missing_api_key(self):
        os.environ["LLM_PROVIDER"] = "openrouter"
        # Set missing or placeholder api key
        os.environ["OPENROUTER_API_KEY"] = "your_openrouter_api_key_here"
        
        with self.assertRaises(ValueError) as context:
            generate_answer("Hello", ["Context info"])
        
        self.assertIn("OPENROUTER_API_KEY is not configured", str(context.exception))

    def test_unknown_provider(self):
        os.environ["LLM_PROVIDER"] = "invalid_provider"
        with self.assertRaises(ValueError) as context:
            generate_answer("Hello", ["Context info"])
        self.assertIn("Unknown LLM provider", str(context.exception))

    @patch("services.llm.requests.post")
    def test_dynamic_provider_parameter_api(self, mock_post):
        # Setup mock response for OpenRouter
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "choices": [
                {
                    "message": {
                        "content": "Mocked API response"
                    }
                }
            ]
        }
        mock_response.raise_for_status = MagicMock()
        mock_post.return_value = mock_response

        # Even if default is ollama, passing provider="api" should override it
        os.environ["LLM_PROVIDER"] = "ollama"
        os.environ["OPENROUTER_API_KEY"] = "sk-or-valid-key"
        os.environ["OPENROUTER_MODEL"] = "meta-llama/llama-3-8b-instruct:free"

        answer = generate_answer("What is RAG?", ["RAG context"], provider="api")
        
        self.assertEqual(answer, "Mocked API response")
        # Verify OpenRouter URL was called
        args, kwargs = mock_post.call_args
        self.assertEqual(args[0], "https://openrouter.ai/api/v1/chat/completions")

    @patch("services.llm.requests.post")
    def test_dynamic_provider_parameter_ollama(self, mock_post):
        # Setup mock response for Ollama
        mock_response = MagicMock()
        mock_response.json.return_value = {"response": "Mocked dynamic Ollama response"}
        mock_response.raise_for_status = MagicMock()
        mock_post.return_value = mock_response

        # Even if default is openrouter, passing provider="ollama" should override it
        os.environ["LLM_PROVIDER"] = "openrouter"
        os.environ["OLLAMA_BASE_URL"] = "http://localhost:11434"
        os.environ["OLLAMA_MODEL"] = "llama3"

        answer = generate_answer("What is RAG?", ["RAG context"], provider="ollama")
        
        self.assertEqual(answer, "Mocked dynamic Ollama response")
        # Verify Ollama URL was called
        args, kwargs = mock_post.call_args
        self.assertEqual(args[0], "http://localhost:11434/api/generate")



if __name__ == "__main__":
    unittest.main()
