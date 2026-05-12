import importlib
import json
import os
import sys

try:
    Groq = importlib.import_module("groq").Groq
except Exception:
    Groq = None


def fallback(payload):
    captions = payload.get("captions", [])[:3]
    if payload.get("audience") and payload.get("personalization_angle") and captions:
        captions[0] = f"{captions[0]} For {payload.get('audience')}.".strip()

    return {
        "thumbnail_title": payload.get("thumbnail_title", ""),
        "thumbnail_sticker": payload.get("thumbnail_sticker", "MUST WATCH"),
        "captions": captions,
        "hashtags": payload.get("hashtags", [])[:10],
        "viral_reasons": payload.get("viral_reasons", [])[:4],
    }


def main():
    payload = json.loads(sys.argv[1])

    if not Groq or not os.environ.get("GROQ_KEY"):
        print(json.dumps(fallback(payload), ensure_ascii=False))
        return

    client = Groq(api_key=os.environ.get("GROQ_KEY"))
    prompt = f"""You are generating social-ready output for a short-form reel.

Platform: {payload.get("platform")}
Source language: {payload.get("source_language")}
Dominant emotion: {payload.get("dominant_emotion")}
Creator goal: {payload.get("creator_goal")}
Target audience: {payload.get("audience")}
Brand tone: {payload.get("tone")}
Personalization angle: {payload.get("personalization_angle")}
Retention pattern: {payload.get("retention_pattern")}
Trend context from official APIs when configured:
{json.dumps(payload.get("trend_context"), ensure_ascii=False)}
Current thumbnail title: {payload.get("thumbnail_title")}
Current thumbnail sticker: {payload.get("thumbnail_sticker")}
Current reel summary: {payload.get("reel_summary")}
Reel moments:
{json.dumps(payload.get("reel_moments", []), ensure_ascii=False)}

Rewrite the outputs to be:
- directly tied to the actual reel content
- personalized to the creator goal, audience, and tone
- use trend context only when it is relevant to the reel content
- clean, not cringe
- short, creator-style, and clear
- suitable for Instagram Reels or YouTube Shorts

Rules:
- thumbnail_title: 3 to 7 words, highly readable
- thumbnail_sticker: 1 to 3 words, uppercase
- captions: exactly 3 options, each under 190 characters
- hashtags: 8 to 10 hashtags only
- viral_reasons: exactly 4 short reasons explaining why the reel can retain attention
- do not mention the website or AI system
- keep them content-specific

Return only valid JSON:
{{
  "thumbnail_title": "...",
  "thumbnail_sticker": "...",
  "captions": ["...", "...", "..."],
  "hashtags": ["#...", "..."],
  "viral_reasons": ["...", "...", "...", "..."]
}}
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.45,
            max_tokens=1200,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        print(json.dumps({
            "thumbnail_title": result.get("thumbnail_title") or payload.get("thumbnail_title", ""),
            "thumbnail_sticker": result.get("thumbnail_sticker") or payload.get("thumbnail_sticker", "MUST WATCH"),
            "captions": (result.get("captions") or payload.get("captions", []))[:3],
            "hashtags": (result.get("hashtags") or payload.get("hashtags", []))[:10],
            "viral_reasons": (result.get("viral_reasons") or payload.get("viral_reasons", []))[:4],
        }, ensure_ascii=False))
    except Exception:
        print(json.dumps(fallback(payload), ensure_ascii=False))


if __name__ == "__main__":
    main()
