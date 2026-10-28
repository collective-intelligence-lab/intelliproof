from types import SimpleNamespace

import llm_manager


def test_model_selection_retries_when_reasoning_budget_is_exhausted(monkeypatch):
    requests = []

    def create_completion(**request):
        requests.append(request)
        if len(requests) == 1:
            raise RuntimeError(
                "Could not finish the message because max_tokens or model output limit was reached."
            )
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content="gpt-6-luna"))]
        )

    monkeypatch.setattr(
        llm_manager.openai.chat.completions,
        "create",
        create_completion,
    )

    selected = llm_manager.select_model_for_task([{"role": "user", "content": "Validate an edge."}])

    assert selected == llm_manager.MODEL_LUNA
    assert len(requests) == 2
    assert requests[0]["max_completion_tokens"] == 512
    assert requests[1]["max_completion_tokens"] == 1024