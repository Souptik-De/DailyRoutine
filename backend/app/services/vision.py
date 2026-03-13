import os
import json
import logging
import asyncio
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Using the primary key for vision tasks
_api_key = os.getenv("GROQ_API_KEY", "").strip().strip('"')
_client = AsyncGroq(api_key=_api_key)
_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

SYSTEM_PROMPT = """You are an unimpressed, highly skeptical habit verification judge.
You have seen every trick. You are not fooled by:
- Stock photos or screenshots of photos
- Images clearly taken from Google
- Images that show preparation but not completion
  (a gym bag ≠ a workout, an empty plate ≠ proof they ate healthy)
- Images completely unrelated to the stated habit
- Blurry or deliberately obscured photos

You look for genuine, specific, real evidence of habit completion.
Respond ONLY in valid JSON. No markdown. No extra text."""


async def verify_proof_image(image_url: str, habit_name: str, proof_hint: str = "") -> dict:
    """
    Call Groq vision API to verify habit completion.
    Returns: { verified, confidence, verdict, visual_context, fraud_suspected, fraud_reason }
    """
    hint_text = proof_hint if proof_hint else "Use your best judgment based on the habit name"
    
    user_message = f"""Habit: {habit_name}
What counts as valid proof: {hint_text}

Analyse this image strictly. Return ONLY this JSON with no extra text:
{{
  "verified": true or false,
  "confidence": "high" | "medium" | "low",
  "verdict": "one sentence — what you saw and your decision",
  "visual_context": "2-3 sentences of specific raw observations about the image. Setting, objects, activity visible, lighting, anything that informed your decision. Be precise.",
  "fraud_suspected": true or false,
  "fraud_reason": "if fraud_suspected is true, one sentence on why. Otherwise null."
}}"""

    fallback = {
        "verified": False,
        "confidence": "low",
        "verdict": "Could not analyse the image.",
        "visual_context": None,
        "fraud_suspected": False,
        "fraud_reason": None
    }

    # 10s timeout on vision call
    for attempt in range(2):
        try:
            response = await asyncio.wait_for(
                _client.chat.completions.create(
                    model=_MODEL,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": user_message},
                                {"type": "image_url", "image_url": {"url": image_url}},
                            ],
                        }
                    ],
                    temperature=0.1,  # Low temp for analytical judgment
                    max_tokens=600,
                ),
                timeout=10.0
            )

            raw_text = response.choices[0].message.content.strip()
            
            # Simple cleanup for common LLM markdown artifacts
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            
            raw_text = raw_text.strip()
            
            try:
                data = json.loads(raw_text)
                # Ensure structure matches fallback exactly
                for k in fallback:
                    if k not in data:
                        data[k] = fallback[k]
                return data
            except json.JSONDecodeError:
                logger.error("[Vision] Failed to parse JSON on attempt %d. Raw: %s", attempt + 1, raw_text)
                if attempt == 0:
                    await asyncio.sleep(1)
                    continue

        except asyncio.TimeoutError:
            logger.warning("[Vision] Attempt %d timed out (10s limit).", attempt + 1)
            if attempt == 0:
                await asyncio.sleep(1)
                continue
        except Exception as e:
            logger.error("[Vision] Attempt %d failed: %s", attempt + 1, e)
            if attempt == 0:
                await asyncio.sleep(1)
                continue

    logger.error("[Vision] All attempts failed, using safe fallback.")
    return fallback
