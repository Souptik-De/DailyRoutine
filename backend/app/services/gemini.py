"""
Groq-powered journal sentiment analysis service.
Uses Llama-3.1-8B-Instant via the Groq API.
"""
import os
import json
import logging
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── Configure Groq ──────────────────────────────────────────────────────────────
_api_key = os.getenv("GROQ_API_KEY", "").strip().strip('"')
_client = Groq(api_key=_api_key)
_MODEL = "llama-3.1-8b-instant"

VALID_SENTIMENTS = {"Joyful", "Content", "Neutral", "Anxious", "Sad", "Lethargic", "Overwhelmed"}

NEUTRAL_RESULT = {
    "sentiment": "Neutral",
    "mood_score": 0.0,
    "themes": [],
}


class AnalysisError(Exception):
    """Raised when the LLM returns unparseable JSON after retry."""
    pass


def _parse_response(text: str) -> dict:
    """Parse and validate the JSON response from the LLM."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        # Remove markdown code block markers
        if cleaned.startswith("```json"):
            cleaned = cleaned.removeprefix("```json")
        else:
            cleaned = cleaned.removeprefix("```")
            
    if cleaned.endswith("```"):
        cleaned = cleaned.removesuffix("```")

    cleaned = cleaned.strip()

    data = json.loads(cleaned)

    sentiment = data.get("sentiment", "")
    if sentiment not in VALID_SENTIMENTS:
        raise ValueError(f"Invalid sentiment: {sentiment}")

    mood_score = float(data.get("mood_score", 0))
    mood_score = max(-1.0, min(1.0, mood_score))

    themes = data.get("themes", [])
    if not isinstance(themes, list):
        themes = []
    themes = [str(t) for t in themes[:4]]

    return {
        "sentiment": sentiment,
        "mood_score": round(mood_score, 2),
        "themes": themes,
    }


def analyse_entry(entry_text: str) -> dict:
    """
    Analyse a journal entry using Groq (Llama-3.1-8B-Instant).

    Returns dict with keys: sentiment, mood_score, themes.
    Skips API call for very short entries (< 5 words).
    Retries once on malformed JSON. Raises AnalysisError on persistent failure.
    """
    word_count = len(entry_text.strip().split())
    if word_count < 5:
        logger.info("Entry too short (%d words), returning Neutral.", word_count)
        return dict(NEUTRAL_RESULT)

    prompt = (
        "Analyse this journal entry. Return ONLY valid JSON, no markdown, no explanation:\n"
        '{ "sentiment": "<one of: Joyful, Content, Neutral, Anxious, Sad, Lethargic, Overwhelmed>", '
        '"mood_score": <float from -1.0 to 1.0>, '
        '"themes": ["<2-4 short tags like Work Stress, Good Sleep, Family>"] }\n\n'
        f"Entry: {entry_text}"
    )

    last_error = None
    for attempt in range(2):
        try:
            response = _client.chat.completions.create(
                model=_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=256,
            )
            return _parse_response(response.choices[0].message.content)
        except Exception as e:
            last_error = e
            logger.warning("Analysis attempt %d failed: %s", attempt + 1, e)

    logger.error("Analysis failed after 2 attempts: %s", last_error)
    raise AnalysisError(f"Failed to analyse entry: {last_error}")
