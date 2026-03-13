import os
import logging
import asyncio
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_api_key = os.getenv("GROQ_API_KEY", "").strip().strip('"')
_client = AsyncGroq(api_key=_api_key)
_MODEL = "llama-3.1-8b-instant"

SYSTEM_PROMPT = """You are a deadpan, witty habit coach who has just rejected a user's photo submission. You write one single sentence of sarcastic feedback.

Rules:
- Maximum 20 words
- Reference what was actually in the image if visual context is provided
- Do not use exclamation marks
- Do not be cruel — dry and disappointed, not mean
- Do not start with 'I'
- Examples of the right tone:
  'A photo of your couch is not a gym, but points for creativity.'
  'That book being closed suggests a unique interpretation of reading.'
  'Impressive salad, if by salad you mean a burger with a pickle on it.'"""


async def generate_sarcastic_rejection(habit_name: str, verdict: str, visual_context: str, fraud_suspected: bool) -> str:
    """
    Call Llama 3.1 to generate a sarcastic rejection sentence.
    Returns the string text. Falls back on failure.
    """
    fallback = "That photo proves nothing except that you tried."
    
    context = visual_context if visual_context else verdict
    
    user_message = f"""Habit the user was supposed to complete: {habit_name}
What the AI saw in their photo: {context}
Fraud suspected: {fraud_suspected}

Write exactly one sarcastic rejection sentence."""

    try:
        response = await asyncio.wait_for(
            _client.chat.completions.create(
                model=_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.7,
                max_tokens=100,
            ),
            timeout=5.0
        )
        
        reply = response.choices[0].message.content.strip()
        # Clean up quotes if present
        if reply.startswith('"') and reply.endswith('"'):
            reply = reply[1:-1]
        elif reply.startswith("'") and reply.endswith("'"):
            reply = reply[1:-1]
            
        return reply.strip()
        
    except asyncio.TimeoutError:
        logger.warning("[Sarcasm] Timeout (5s), using fallback.")
        return fallback
    except Exception as e:
        logger.error("[Sarcasm] Failed: %s, using fallback.", e)
        return fallback
