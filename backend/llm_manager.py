import os
from langchain_community.chat_models import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage

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

def get_llm(mcp: ModelControlProtocol = DEFAULT_MCP):
    print(f"[llm_manager] get_llm: Initializing LLM with model={mcp.model_name}")
    llm = ChatOpenAI(
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        model=mcp.model_name,
        temperature=mcp.temperature,
        max_tokens=mcp.max_tokens,
    )
    print(f"[llm_manager] get_llm: LLM initialized.")
    return llm

def run_llm(messages, mcp: ModelControlProtocol = DEFAULT_MCP):
    print(f"[llm_manager] run_llm: Running LLM with {len(messages)} messages.")
    llm = get_llm(mcp)
    chat_messages = []
    if mcp.system_prompt:
        chat_messages.append(SystemMessage(content=mcp.system_prompt))
    for msg in messages:
        chat_messages.append(HumanMessage(content=msg["content"]))
    response = llm(chat_messages)
    print(f"[llm_manager] run_llm: LLM call finished.")
    return response.content 