import os
import openai
from typing import List, Dict, Any

class AgentManager : # This class is responsible for managing the different agents in the system, it can be used to select agents based on the task at hand, and to run agentic calls to the LLM.
    def __init__(
            self,
            judge_model = "gpt-5.4-nano", # Nano model to select the task type
            default_task_type = "graph construction", # Default task type if the judge model fails to classify
            edit_task_type = "graph editing", # Task type for graph editing tasks
            question_task_type = "graph analysis", # Task type for graph analysis tasks
            temperature = 0.2,
            max_completion_tokens = 32, # Short response for task type selection
            system_prompt = (
                "You are an expert task classifier for Intelliproof. "
                "Given the user input, determine if the task is a graph construction task, a graph editing task, or a graph analysis task. "
                "If the user is asking to create a new graph from scratch, classify it as a graph construction task. If the user is asking to modify or add to an existing graph, classify it as a graph editing task. If the user is asking a question about the graph or requesting insights without modifying the graph, classify it as a graph analysis task. "
                "Return only the task type (graph construction, graph editing, or graph analysis) as the output and nothing else."
            ),
        ) :
        self.judge_model = judge_model
        self.default_task_type = default_task_type
        self.edit_task_type = edit_task_type
        self.question_task_type = question_task_type
        self.temperature = temperature
        self.max_completion_tokens = max_completion_tokens
        self.system_prompt = system_prompt

class LLMManager: # This class uses a strong LLM to decide which model to use for the task, if the task is simple, it defaults to 5.4 nano, otherwise, it can either choose 5.4 mini or 5.4 normal.
    def __init__(
        self, 
        judge_model = "gpt-5.4",  # A strong model to judge task complexity and select appropriate model
        default_model = "gpt-5.4-nano",
        advanced_model = "gpt-5.4-mini",
        full_model = "gpt-5.4",
        temperature = 0.2, 
        max_completion_tokens = 32, # Short response for model selection
        system_prompt = (
            "You are an expert task classifier and model selector for Intelliproof. "
            "Given a task description and the user input, determine if it is simple, moderately complex, or complex. "
            "Simpler tasks can be handled by gpt-5.4-nano, moderately complex tasks should use gpt-5.4-mini, and complex tasks require gpt-5.4."
            "If the task is relatively straightforward and doesn't require deep reasoning or extensive context, classify it for gpt-5.4-nano. If the task involves some reasoning or context but is not too complex, classify it for gpt-5.4-mini. If the task is complex, requires deep reasoning, or extensive context, classify it for gpt-5.4."
            "Return only the model name (gpt-5.4-nano, gpt-5.4-mini, or gpt-5.4) as the output and nothing else."
        ),
    ) :
        self.judge_model = judge_model
        self.default_model = default_model
        self.advanced_model = advanced_model
        self.full_model = full_model
        self.temperature = temperature
        self.max_completion_tokens = max_completion_tokens
        self.system_prompt = system_prompt

class ModelControlProtocol:
    def __init__(
        self,
        model_name: str = "gpt-5.4-nano-2026-03-17",
        temperature: float = 0.2,
        max_completion_tokens: int = 256,
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
        self.max_completion_tokens = max_completion_tokens
        self.system_prompt = system_prompt

# Define a single, project-wide MCP instance
DEFAULT_MCP = ModelControlProtocol()
TASK_JUDGE_MCP = LLMManager()
DEFAULT_AGENT_MANAGER = AgentManager()

def select_agent_for_task(messages: List[Dict[str, str]], am: AgentManager = DEFAULT_AGENT_MANAGER) -> str:
    # Use the judge model to determine which agent to use for the task
    openai.api_key = os.getenv("OPENAI_API_KEY")

    print(f"[agent_manager] select_agent_for_task: Evaluating task with {len(messages)} messages.")
    
    # Prepare messages for OpenAI API
    openai_messages = []
    if am.system_prompt:
        openai_messages.append({"role": "system", "content": am.system_prompt})
    
    for msg in messages:
        openai_messages.append({"role": "user", "content": msg["content"]})
    
    try:
        response = openai.chat.completions.create(
            model=am.judge_model,
            messages=openai_messages,
            temperature=am.temperature,
            max_completion_tokens=am.max_completion_tokens,
        )
        selected_task_type = response.choices[0].message.content.strip()
        print(f"[agent_manager] select_agent_for_task: Selected task type - {selected_task_type}")

        if selected_task_type.lower() == "graph construction":
            return am.default_task_type
        elif selected_task_type.lower() == "graph editing":
            return am.edit_task_type
        elif selected_task_type.lower() == "graph analysis":
            return am.question_task_type
        else : 
            print("[agent_manager] select_agent_for_task: Unexpected task type response, defaulting to graph construction.")
            return am.default_task_type  # Fallback to default if the response is unexpected

        #return selected_task_type
    except Exception as e:
        print(f"[agent_manager] select_agent_for_task: Error calling OpenAI API: {e}")
        raise e

def select_model_for_task(messages: List[Dict[str, str]], mcp: LLMManager = TASK_JUDGE_MCP) -> str:
    # Use the judge model to determine which model to use for the task
    openai.api_key = os.getenv("OPENAI_API_KEY")

    print(f"[llm_manager] select_model_for_task: Evaluating task with {len(messages)} messages.")
    
    # Prepare messages for OpenAI API
    openai_messages = []
    if mcp.system_prompt:
        openai_messages.append({"role": "system", "content": mcp.system_prompt})
    
    for msg in messages:
        openai_messages.append({"role": "user", "content": msg["content"]})
    
    try:
        response = openai.chat.completions.create(
            model=mcp.judge_model,
            messages=openai_messages,
            temperature=mcp.temperature,
            max_completion_tokens=mcp.max_completion_tokens,
        )
        selected_model = response.choices[0].message.content.strip()
        print(f"[llm_manager] select_model_for_task: Selected model - {selected_model}")

        if selected_model.lower() == "gpt-5.4-nano":
            return mcp.default_model
        elif selected_model.lower() == "gpt-5.4-mini":
            return mcp.advanced_model
        elif selected_model.lower() == "gpt-5.4":
            return mcp.full_model
        else : 
            print("[llm_manager] select_model_for_task: Unexpected model selection response, defaulting to nano.")
            return mcp.default_model  # Fallback to default if the response is unexpected

        #return selected_model
    except Exception as e:
        print(f"[llm_manager] select_model_for_task: Error calling OpenAI API: {e}")
        raise e

def run_llm(messages: List[Dict[str, str]], mcp: ModelControlProtocol = DEFAULT_MCP):

    openai.api_key = os.getenv("OPENAI_API_KEY")

    print(f"[llm_manager] run_llm: Running LLM with {len(messages)} messages.")
    
    # Set up OpenAI client
    
    # Prepare messages for OpenAI API
    openai_messages = []
    if mcp.system_prompt:
        openai_messages.append({"role": "system", "content": mcp.system_prompt})
    
    for msg in messages:
        openai_messages.append({"role": "user", "content": msg["content"]})
    
    try:

        mcp.model_name = select_model_for_task(messages)  # Dynamically select model based on task complexity
        print(f"[llm_manager] run_llm: Selected model - {mcp.model_name}")

        response = openai.chat.completions.create(
            model=mcp.model_name,
            messages=openai_messages,
            temperature=mcp.temperature,
            max_completion_tokens=mcp.max_completion_tokens,
        )
        print(f"[llm_manager] run_llm: LLM call finished.")

        response = response.choices[0].message.content.strip()  + "\n [Dynamic Model Used] " + mcp.model_name.capitalize()  # Append model used to the response for debugging

        return response # Return the response from the LLM, along with the model used for debugging
    except Exception as e:
        print(f"[llm_manager] run_llm: Error calling OpenAI API: {e}")
        raise e

def run_llm_agentic(messages: List[Dict[str, str]], mcp: ModelControlProtocol = DEFAULT_MCP) : 
    # This function is for running agentic LLM calls, it is mainly use to generate an argument track from a given input text, it uses the same model selection process as run_llm but with a different system prompt that is more focused on argument generation and analysis.

    openai.api_key = os.getenv("OPENAI_API_KEY")

    openai_messages = []
    if mcp.system_prompt:
        openai_messages.append({"role": "system", "content": mcp.system_prompt})
    for msg in messages:
        openai_messages.append({"role": "user", "content": msg["content"]})
    
    MODEL_NAME = "gpt-5.4" # Use the full model for agentic calls

    try:
        response = openai.chat.completions.create(
            model=MODEL_NAME,
            messages=openai_messages,
            temperature=mcp.temperature,
            max_completion_tokens=mcp.max_completion_tokens,
        )

        response = response.choices[0].message.content.strip()  # Append model used to the response for debugging

        return response
    except Exception as e:
        print(f"[llm_manager] run_llm_agentic: Error calling OpenAI API: {e}")
        raise e