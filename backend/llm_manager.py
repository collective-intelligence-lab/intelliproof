import os
import openai
from typing import List, Dict, Any

class ModelControlProtocol:
    def __init__(
        self,
        model_name: str = "gpt-4o-mini",
        temperature: float = 0.2,
        max_tokens: int = 256,
        system_prompt: str = (
            "You are an expert fact-checker and argument analyst working for Intelliproof.\n"
            "Intelliproof is a platform for collaborative, transparent, and AI-assisted argument analysis. "
            "Its goal is to help users build, critique, and understand complex arguments by mapping claims, "
            "evidence, and logical relationships in a graph structure. The system uses AI to evaluate the credibility "
            "of claims, the strength of evidence, and the validity of logical connections, aiming to foster critical thinking, "
            "reduce misinformation, and support constructive debate."
        ),
    ):
        self.model_name = model_name
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.system_prompt = system_prompt

# Define a single, project-wide MCP instance
DEFAULT_MCP = ModelControlProtocol()

def run_llm(messages: List[Dict[str, str]], mcp: ModelControlProtocol = DEFAULT_MCP):
    print(f"[llm_manager] run_llm: Running LLM with {len(messages)} messages.")
    
    # Set up OpenAI client
    openai.api_key = os.getenv("OPENAI_API_KEY")
    
    # Prepare messages for OpenAI API
    openai_messages = []
    if mcp.system_prompt:
        openai_messages.append({"role": "system", "content": mcp.system_prompt})
    
    for msg in messages:
        openai_messages.append({"role": "user", "content": msg["content"]})
    
    try:
        response = openai.chat.completions.create(
            model=mcp.model_name,
            messages=openai_messages,
            temperature=mcp.temperature,
            max_tokens=mcp.max_tokens,
        )
        print(f"[llm_manager] run_llm: LLM call finished.")
        return response.choices[0].message.content
    except Exception as e:
        print(f"[llm_manager] run_llm: Error calling OpenAI API: {e}")
        raise e 