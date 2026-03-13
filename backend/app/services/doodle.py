import os
import json
import logging
import random
from groq import Groq
from dotenv import load_dotenv
from app.config import get_db, DEMO_USER_ID

load_dotenv()

logger = logging.getLogger(__name__)

# ── Configure Groq ──────────────────────────────────────────────────────────────
_api_key = os.getenv("GROQ_API_KEY", "").strip().strip('"')
_client = Groq(api_key=_api_key)
_MODEL = "llama-3.1-8b-instant"

DOODLE_SYSTEM_PROMPT = (
    "You are a frustrated but creative AI that expresses itself through terrible, "
    "primitive MS-Paint style doodles. Your goal is to provide a sequence of simple "
    "canvas drawing commands that represent a 'terrible' drawing related to the "
    "user's recent life context (themes/emotions).\n\n"
    "Output ONLY a JSON object with a 'commands' key containing an array of commands.\n"
    "Each command is a list: \n"
    "- ['color', '#RRGGBB']\n"
    "- ['move', x, y] (0-500 scale)\n"
    "- ['line', x, y] (0-500 scale)\n"
    "- ['width', w] (line width)\n\n"
    "Keep the drawing simple (20-40 commands). It should look amateurish, shaky, "
    "and slightly abstract. Think stick figures, messy suns, scribbles, and basic shapes.\n"
    "No markdown, no explanation."
)

def get_recent_context():
    """Fetch recent themes and sentiment for context."""
    try:
        # Get last 5 journal analysis docs
        docs = (
            get_db().collection("users")
            .document(DEMO_USER_ID)
            .collection("journal_analysis")
            .order_by("date", direction="DESCENDING")
            .limit(5)
            .stream()
        )
        
        themes = []
        sentiments = []
        for doc in docs:
            data = doc.to_dict()
            themes.extend(data.get("themes", []))
            sentiments.append(data.get("sentiment", "Neutral"))
            
        return {
            "themes": list(set(themes))[:5],
            "sentiments": list(set(sentiments))[:3]
        }
    except Exception as e:
        logger.error(f"Failed to fetch context: {e}")
        return {"themes": ["nothingness"], "sentiments": ["Bored"]}

def generate_doodle():
    """Generate doodle commands based on context."""
    ctx = get_recent_context()
    
    user_prompt = (
        f"Generate a terrible doodle related to these themes: {', '.join(ctx['themes'])}. "
        f"The mood is {', '.join(ctx['sentiments'])}. "
        "The drawing should be primitive and abstract. "
        "Canvas size is 500x500."
    )

    try:
        response = _client.chat.completions.create(
            model=_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": DOODLE_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.9,
            max_tokens=1000,
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        logger.error(f"Doodle generation failed: {e}")
        # Return a fallback very simple doodle (a red circle-ish scribble)
        return {
            "commands": [
                ["width", 3],
                ["color", "#ff0000"],
                ["move", 250, 250],
                ["line", 270, 260],
                ["line", 280, 280],
                ["line", 260, 300],
                ["line", 240, 280],
                ["line", 250, 250]
            ]
        }
