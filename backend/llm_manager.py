import os
import openai
from typing import List, Dict, Any

MODEL_LUNA = "gpt-6-luna"
MODEL_SOL = "gpt-6-sol"


def route_model(model_name: str | None) -> str:
    """Map legacy model names to the current Luna/Sol model tiers."""
    normalized = (model_name or "").lower().strip()

    if normalized == MODEL_SOL or normalized.startswith(f"{MODEL_SOL}-"):
        return MODEL_SOL
    if normalized == MODEL_LUNA or normalized.startswith(f"{MODEL_LUNA}-"):
        return MODEL_LUNA

    # GPT-5 mini/nano and every model predating GPT-5 use the Luna tier.
    if "mini" in normalized or "nano" in normalized:
        return MODEL_LUNA

    # A full GPT-5.x model uses the Sol tier. Unknown/older model names
    # intentionally fall back to Luna so legacy callers remain supported.
    if normalized.startswith("gpt-5"):
        return MODEL_SOL
    return MODEL_LUNA


class AgentManager : # This class is responsible for managing the different agents in the system, it can be used to select agents based on the task at hand, and to run agentic calls to the LLM.
    def __init__(
            self,
            judge_model = MODEL_LUNA, # Luna model to select the task type
            default_task_type = "graph construction", # Default task type if the judge model fails to classify
            edit_task_type = "graph editing", # Task type for graph editing tasks
            question_task_type = "graph analysis", # Task type for graph analysis tasks
            temperature=1.0,
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

class LLMManager: # This class uses a strong LLM to decide which model to use for the task.
    def __init__(
        self, 
        judge_model = MODEL_SOL,  # A strong model to judge task complexity and select appropriate model
        default_model = MODEL_LUNA,
        advanced_model = MODEL_LUNA,
        full_model = MODEL_SOL,
        temperature=1.0, 
        max_completion_tokens = 512, # Reasoning models may need budget before returning the short selection
        system_prompt = (
            "You are an expert task classifier and model selector for Intelliproof. "
            "Given a task description and the user input, determine if it is simple, moderately complex, or complex. "
            f"Simpler tasks can be handled by {MODEL_LUNA}, moderately complex tasks should use {MODEL_LUNA}, and complex tasks require {MODEL_SOL}."
            f"If the task is relatively straightforward and doesn't require deep reasoning or extensive context, classify it for {MODEL_LUNA}. If the task involves some reasoning or context but is not too complex, classify it for {MODEL_LUNA}. If the task is complex, requires deep reasoning, or extensive context, classify it for {MODEL_SOL}."
            f"Return only the model name ({MODEL_LUNA} or {MODEL_SOL}) as the output and nothing else."
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
        model_name: str = MODEL_LUNA,
        temperature: float = 1.0,
        max_completion_tokens: int = 512,
        dynamic_model_selection: bool = True,
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
        self.dynamic_model_selection = dynamic_model_selection
        self.system_prompt = system_prompt

# Define a single, project-wide MCP instance
DEFAULT_MCP = ModelControlProtocol()
TASK_JUDGE_MCP = LLMManager()
DEFAULT_AGENT_MANAGER = AgentManager()


def _is_output_limit_error(error: Exception) -> bool:
    """Return whether OpenAI rejected a completion because it hit an output limit."""
    message = str(error).lower()
    return (
        "could not finish the message" in message
        and ("max_tokens" in message or "output limit" in message)
    )


def _create_completion_with_retry(
    *,
    model: str,
    messages: List[Dict[str, str]],
    temperature: float,
    max_completion_tokens: int,
):
    """Create a completion and retry once with a bounded larger output budget.

    Reasoning models can consume part of the completion budget before emitting
    visible text. Retrying only this specific failure avoids masking unrelated
    API errors or routinely doubling token usage.
    """
    request = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_completion_tokens": max_completion_tokens,
    }

    try:
        return openai.chat.completions.create(**request)
    except Exception as error:
        retry_limit = min(max(max_completion_tokens * 2, 1024), 8192)
        if not _is_output_limit_error(error) or retry_limit <= max_completion_tokens:
            raise

        print(
            "[llm_manager] Completion reached its output limit; "
            f"retrying once with max_completion_tokens={retry_limit}."
        )
        request["messages"] = messages + [{
            "role": "user",
            "content": "Return only the concise final answer in no more than two sentences.",
        }]
        request["max_completion_tokens"] = retry_limit
        return openai.chat.completions.create(**request)

def select_agent_for_task(messages: List[Dict[str, str]], am: AgentManager = DEFAULT_AGENT_MANAGER) -> str:
    # Use the judge model to determine which agent to use for the task
    openai.api_key = os.getenv("OPENAI_API_KEY")

    print(f"[agent_manager] select_agent_for_task: Evaluating task with {len(messages)} messages.")
    
    # Prepare messages for OpenAI API
    openai_messages = []
    if am.system_prompt:
        openai_messages.append({"role": "system", "content": am.system_prompt})
    
    openai_messages.append({"role": "user", "content": messages[-1]['content']})  # Use only the latest user message for task classification
    

    try:
        response = openai.chat.completions.create(
            model=route_model(am.judge_model),
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
    
    # Model selection only needs the current request. Sending the full chat
    # history here consumes context and can leave less room for the answer.
    for msg in messages[-1:]:
        openai_messages.append({"role": "user", "content": msg["content"]})
    
    try:
        response = _create_completion_with_retry(
            model=route_model(mcp.judge_model),
            messages=openai_messages,
            temperature=mcp.temperature,
            max_completion_tokens=mcp.max_completion_tokens,
        )
        selected_model = response.choices[0].message.content.strip()
        print(f"[llm_manager] select_model_for_task: Selected model - {selected_model}")

        routed_model = route_model(selected_model)
        if routed_model == MODEL_SOL:
            return mcp.full_model
        if routed_model == MODEL_LUNA:
            return mcp.default_model

        print("[llm_manager] select_model_for_task: Unexpected model selection response, defaulting to Luna.")
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

        if mcp.dynamic_model_selection:
            mcp.model_name = select_model_for_task(messages)
        else:
            mcp.model_name = route_model(mcp.model_name)
        print(f"[llm_manager] run_llm: Selected model - {mcp.model_name}")

        response = _create_completion_with_retry(
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
    # Agentic calls use the same difficulty-based model selection as regular
    # LLM calls, while retaining their specialized system prompt.

    openai.api_key = os.getenv("OPENAI_API_KEY")

    openai_messages = []
    if mcp.system_prompt:
        openai_messages.append({"role": "system", "content": mcp.system_prompt})
    for msg in messages:
        openai_messages.append({"role": "user", "content": msg["content"]})
    
    try:
        if mcp.dynamic_model_selection:
            mcp.model_name = select_model_for_task(messages)
        else:
            mcp.model_name = route_model(mcp.model_name)
        print(f"[llm_manager] run_llm_agentic: Selected model - {mcp.model_name}")

        response = _create_completion_with_retry(
            model=mcp.model_name,
            messages=openai_messages,
            temperature=mcp.temperature,
            max_completion_tokens=mcp.max_completion_tokens,
        )

        response = response.choices[0].message.content.strip()  # Append model used to the response for debugging

        return response
    except Exception as e:
        print(f"[llm_manager] run_llm_agentic: Error calling OpenAI API: {e}")
        raise e