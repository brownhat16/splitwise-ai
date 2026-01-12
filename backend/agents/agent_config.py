"""NVIDIA API configuration and base agent class."""

import os
import json
import re
import asyncio
import httpx
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

# Timeout configuration
AI_TIMEOUT_SECONDS = 30  # Max time for AI response


@dataclass
class AgentConfig:
    """Configuration for AI agents."""
    api_key: str = field(default_factory=lambda: os.getenv("NVIDIA_API_KEY", ""))
    base_url: str = "https://integrate.api.nvidia.com/v1"
    model: str = "nvidia/llama-3.3-nemotron-super-49b-v1.5"  # Powerful NVIDIA model
    max_tokens: int = 1024
    temperature: float = 0.7


class BaseAgent:
    """Base class for all AI agents."""
    
    def __init__(self, config: AgentConfig = None):
        self.config = config or AgentConfig()
        self.system_prompt = ""
        self.client = httpx.AsyncClient(timeout=AI_TIMEOUT_SECONDS)
    
    async def _call_llm(self, messages: List[Dict[str, str]], 
                        temperature: float = None,
                        max_tokens: int = None) -> str:
        """
        Call the NVIDIA LLM API with timeout protection.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Override default temperature
            max_tokens: Override default max tokens
            
        Returns:
            The model's response text
        """
        if not self.config.api_key:
            return json.dumps({
                "error": "No API key configured",
                "message": "Please set the NVIDIA_API_KEY environment variable"
            })
        
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.config.model,
            "messages": messages,
            "temperature": temperature or self.config.temperature,
            "max_tokens": max_tokens or self.config.max_tokens
        }
        
        try:
            # Wrap in asyncio timeout for extra protection
            async with asyncio.timeout(AI_TIMEOUT_SECONDS):
                response = await self.client.post(
                    f"{self.config.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                
                # Remove <think> blocks (common in reasoning models)
                if content:
                    content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
                
                return content
        except asyncio.TimeoutError:
            print(f"AI timeout after {AI_TIMEOUT_SECONDS} seconds")
            return json.dumps({
                "error": "timeout",
                "message": "I'm taking too long to think. Please try a simpler request or use the manual forms."
            })
        except httpx.TimeoutException:
            print(f"HTTP timeout after {AI_TIMEOUT_SECONDS} seconds")
            return json.dumps({
                "error": "timeout",
                "message": "The AI is busy. Please try again in a moment or use the manual forms."
            })
        except httpx.HTTPStatusError as e:
            print(f"HTTP error: {e.response.status_code} - {e.response.text}")
            return json.dumps({
                "error": f"HTTP {e.response.status_code}",
                "message": "API request failed. Please try again."
            })
        except Exception as e:
            print(f"Error calling LLM: {e}")
            return json.dumps({
                "error": str(e),
                "message": "Something went wrong. Please try again or use the manual forms."
            })
    
    async def process(self, user_input: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Process user input and return a response.
        
        To be implemented by subclasses.
        """
        raise NotImplementedError("Subclasses must implement process()")
    
    def _build_messages(self, user_input: str, context: Dict[str, Any] = None) -> List[Dict[str, str]]:
        """Build the messages list for the LLM call."""
        messages = []
        
        if self.system_prompt:
            messages.append({"role": "system", "content": self.system_prompt})
        
        if context and "history" in context:
            for msg in context["history"][-5:]:  # Last 5 messages for context
                messages.append({"role": "user", "content": msg.get("user", "")})
                if msg.get("assistant"):
                    messages.append({"role": "assistant", "content": msg["assistant"]})
        
        messages.append({"role": "user", "content": user_input})
        return messages
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()


def parse_json_response(response: str) -> Dict[str, Any]:
    """
    Extract JSON from an LLM response.
    
    Handles cases where JSON is wrapped in markdown code blocks.
    """
    # Remove <think>...</think> blocks (common in reasoning models)
    response = re.sub(r'<think>.*?</think>', '', response, flags=re.DOTALL).strip()

    # Try to find JSON in code blocks
    if "```json" in response:
        start = response.find("```json") + 7
        end = response.find("```", start)
        if end > start:
            response = response[start:end].strip()
    elif "```" in response:
        start = response.find("```") + 3
        end = response.find("```", start)
        if end > start:
            response = response[start:end].strip()
    
    # Try to parse as JSON
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        # Try to find JSON object in the response
        start = response.find("{")
        end = response.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(response[start:end])
            except json.JSONDecodeError:
                pass
        return {"raw_response": response, "parse_error": True}
