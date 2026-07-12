import os
import requests
from typing import List
from dotenv import load_dotenv


def _call_ollama(prompt: str) -> str:
    """Calls local Ollama generation API."""
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    model = os.getenv("OLLAMA_MODEL", "llama3")
    url = f"{base_url}/api/generate"
    try:
        response = requests.post(
            url,
            json={
                "model": model,
                "prompt": prompt,
                "stream": False
            },
            timeout=60.0
        )
        if response.status_code != 200:
            try:
                err_data = response.json()
                if "error" in err_data:
                    raise RuntimeError(f"Ollama error: {err_data['error']}")
            except (ValueError, KeyError):
                pass
            response.raise_for_status()
        return response.json().get("response", "").strip()
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Ollama request failed: {str(e)}")



def _call_openrouter(prompt: str) -> str:
    """Calls OpenRouter chat completions API."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    model = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3-8b-instruct:free")
    
    if not api_key or api_key == "your_openrouter_api_key_here":
        raise ValueError("OPENROUTER_API_KEY is not configured or is the default placeholder. Please set a valid API key in your .env file.")
        
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/PrNirmal/rag-lab",
        "X-Title": "RAG Lab Document QA"
    }
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ]
    }
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=60.0)
        if response.status_code != 200:
            try:
                err_data = response.json()
                if "error" in err_data:
                    err_msg = err_data["error"].get("message", str(err_data["error"]))
                    raise RuntimeError(f"OpenRouter error: {err_msg}")
            except (ValueError, KeyError):
                pass
            response.raise_for_status()
        res_data = response.json()

        if "choices" not in res_data or not res_data["choices"]:
            if "error" in res_data:
                err_msg = res_data["error"].get("message", str(res_data["error"]))
                raise RuntimeError(f"OpenRouter API error: {err_msg}")
            raise RuntimeError(f"OpenRouter response did not return any choices. Response: {res_data}")
        return res_data["choices"][0]["message"]["content"].strip()
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"OpenRouter request failed: {str(e)}")


def generate_answer(query: str, contexts: List[str], provider: str = None) -> str:
    """Generates an answer to the query using the provided context chunks."""
    # Reload environment variables dynamically to pick up changes to the .env file
    load_dotenv(override=True)

    if not contexts:
        context_str = "No relevant context found."
    else:
        context_str = "\n\n".join([f"Document Part {i+1}:\n{text}" for i, text in enumerate(contexts)])

    prompt = f"""You are a helpful assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. If you don't know the answer or if the context doesn't contain relevant information, say that you don't know. Use three sentences maximum and keep the answer concise.

Question: {query}

Context:
{context_str}

Answer:"""

    if not provider:
        provider = os.getenv("LLM_PROVIDER", "ollama")
    
    provider = provider.lower()
    if provider in ("openrouter", "api"):
        return _call_openrouter(prompt)
    elif provider == "ollama":
        return _call_ollama(prompt)
    else:
        raise ValueError(f"Unknown LLM provider '{provider}'. Supported providers are 'ollama' and 'openrouter' / 'api'.")

