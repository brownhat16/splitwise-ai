"""NVIDIA API configuration and base agent class."""

import os
import json
import httpx
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class AgentConfig:
    """Configuration for AI agents."""
    api_key: str = "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"
    base_url: str = "https://integrate.api.nvidia.com/v1"
    model: str = "nvidia/llama-3.1-nemotron-70b-instruct"  # Using available NVIDIA model
    max_tokens: int = 1024
    temperature: float = 0.7


class BaseAgent:
    """Base class for all AI agents."""
    
    def __init__(self, config: AgentConfig = None):
        self.config = config or AgentConfig()
        self.system_prompt = ""
        self.client = httpx.AsyncClient(timeout=60.0)
    
    async def _call_llm(self, messages: List[Dict[str, str]], 
                        temperature: float = None,
                        max_tokens: int = None) -> str:
        """
        Call the NVIDIA LLM API.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Override default temperature
            max_tokens: Override default max tokens
            
        Returns:
            The model's response text
        """
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
            response = await self.client.post(
                f"{self.config.base_url}/chat/completions",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            print(f"HTTP error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            print(f"Error calling LLM: {e}")
            raise
    
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
