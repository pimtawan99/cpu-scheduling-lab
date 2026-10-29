import os
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage

from lib.db import db
from models.scheduling import AiExplainRequest, AiExplainResponse

router = APIRouter()


@router.post("/ai/explain", response_model=AiExplainResponse)
async def explain_result(request: AiExplainRequest) -> AiExplainResponse:
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI explanation is not configured")
    language = "Thai" if request.language == "th" else "English"
    context = request.result.model_dump_json()
    prompt = (
        f"Explain this CPU scheduling simulation in {language} for a university student. "
        "Use the exact metrics from the JSON, mention why the selected algorithm produced this order, "
        "and give one short comparison insight. Do not invent values. Keep it under 180 words. "
        f"Student question: {request.question}\nJSON: {context}"
    )
    try:
        chat = (
            LlmChat(
                api_key=api_key,
                session_id=f"cpu-scheduling-{request.result.algorithm}",
                system_message="You are a precise CPU scheduling tutor. Never change numeric facts from the supplied simulation.",
            )
            .with_model("openai", "gpt-5.4")
        )
        chunks: list[str] = []
        async for event in chat.stream_message(UserMessage(text=prompt)):
            if isinstance(event, TextDelta):
                chunks.append(event.content)
            elif isinstance(event, StreamDone):
                break
        explanation = "".join(chunks).strip()
        if not explanation:
            raise RuntimeError("AI returned an empty explanation")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI explanation unavailable: {exc}") from exc

    created_at = datetime.now(timezone.utc).isoformat()
    await db.ai_insights.insert_one(
        {
            "algorithm": request.result.algorithm,
            "language": request.language,
            "question": request.question,
            "explanation": explanation,
            "created_at": created_at,
        }
    )
    return AiExplainResponse(explanation=explanation, created_at=created_at)