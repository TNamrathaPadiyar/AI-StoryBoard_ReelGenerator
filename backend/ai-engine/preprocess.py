import cv2
import whisper
from moviepy import VideoFileClip
import os
import sys
import shutil
import json
import importlib

try:
    Groq = importlib.import_module("groq").Groq
except Exception:
    Groq = None

video_path = sys.argv[1]
options = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}

SUPPORTED_LANGUAGES = {
    "auto": None,
    "english": "en",
    "hindi": "hi",
    "kannada": "kn"
}


def safe_translate_segments(segments, source_language):
    if source_language not in ["hi", "kn"]:
        for seg in segments:
            seg["english_text"] = seg["text"]
        return segments, "english", False

    if not Groq or not os.environ.get("GROQ_KEY"):
        for seg in segments:
            seg["english_text"] = seg["text"]
        return segments, source_language, False

    client = Groq(api_key=os.environ.get("GROQ_KEY"))
    indexed_lines = "\n".join([f"{i}: {seg['text']}" for i, seg in enumerate(segments)])
    prompt = f"""Translate the following transcript lines from {source_language} to natural English.
Return only valid JSON with this format:
{{"translations":[{{"index":0,"english_text":"..."}}]}}

Lines:
{indexed_lines}
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=3000
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        translations = {item["index"]: item["english_text"] for item in result.get("translations", [])}
        for i, seg in enumerate(segments):
            seg["english_text"] = translations.get(i, seg["text"])
        return segments, "english", True
    except Exception:
        for seg in segments:
            seg["english_text"] = seg["text"]
        return segments, source_language, False


if os.path.exists("ai-engine/frames"):
    shutil.rmtree("ai-engine/frames")

os.makedirs("ai-engine/frames", exist_ok=True)
os.makedirs("ai-engine/audio", exist_ok=True)
os.makedirs("ai-engine", exist_ok=True)

video = VideoFileClip(video_path)
filename = os.path.basename(video_path).split('.')[0]
audio_path = f"ai-engine/audio/{filename}.wav"
duration = float(video.duration or 0)
video.audio.write_audiofile(audio_path, logger=None)
video.close()

print("Audio extracted")

cap = cv2.VideoCapture(video_path)
frame_count = 0
frame_rate = cap.get(cv2.CAP_PROP_FPS) or 25
sample_interval = max(1, int(frame_rate * 2))

while True:
    ret, frame = cap.read()
    if not ret:
        break

    if frame_count % sample_interval == 0:
        frame_name = f"ai-engine/frames/frame_{frame_count}.jpg"
        cv2.imwrite(frame_name, frame)

    frame_count += 1

cap.release()
print("Frames extracted")

model = whisper.load_model("base")
language_hint = SUPPORTED_LANGUAGES.get(options.get("targetLanguage", "auto"))
transcribe_kwargs = {"word_timestamps": True}
if language_hint:
    transcribe_kwargs["language"] = language_hint

result = model.transcribe(audio_path, **transcribe_kwargs)
transcript = result["text"].strip()
source_language = result.get("language", language_hint or "unknown")

segments = []
words = []
for seg in result["segments"]:
    segments.append({
        "start": round(seg["start"], 2),
        "end": round(seg["end"], 2),
        "text": seg["text"].strip()
    })
    for w in seg.get("words", []):
        words.append({
            "word": w["word"].strip(),
            "start": round(w["start"], 3),
            "end": round(w["end"], 3)
        })

segments, analysis_language, translated = safe_translate_segments(segments, source_language)
transcript_english = " ".join([seg.get("english_text", seg["text"]) for seg in segments]).strip()

with open("ai-engine/transcript.txt", "w", encoding="utf-8") as f:
    f.write(transcript)

with open("ai-engine/segments.json", "w", encoding="utf-8") as f:
    json.dump(segments, f, indent=2, ensure_ascii=False)

with open("ai-engine/words.json", "w", encoding="utf-8") as f:
    json.dump(words, f, indent=2, ensure_ascii=False)

with open("ai-engine/metadata.json", "w", encoding="utf-8") as f:
    json.dump({
        "duration": round(duration, 2),
        "source_language": source_language,
        "analysis_language": analysis_language,
        "translated_to_english": translated,
        "transcript_english": transcript_english,
        "options": options
    }, f, indent=2, ensure_ascii=False)

print("Transcript generated")
print(transcript)
