import json
import sys
import os
import cv2
import wave
import math
import struct
import importlib

try:
    Groq = importlib.import_module("groq").Groq
except Exception:
    Groq = None

# -------------------------
# CONFIG
# -------------------------
video_path = sys.argv[1]
options = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
client = Groq(api_key=os.environ.get("GROQ_KEY")) if Groq and os.environ.get("GROQ_KEY") else None

CLIP_LENGTH = 60 if int(options.get("clipLength", 30)) == 60 else 30
TRAILERS_TO_GENERATE = 1
MOMENTS_PER_TRAILER = 4 if CLIP_LENGTH == 60 else 3
TOTAL_MOMENTS_NEEDED = TRAILERS_TO_GENERATE * MOMENTS_PER_TRAILER
HOOK_WORDS = ["how", "why", "best", "important", "must", "secret", "watch", "listen", "look", "today"]
PAYOFF_WORDS = ["finally", "then", "after", "result", "end", "last", "conclusion", "so", "therefore"]
GOAL_KEYWORDS = {
    "education": ["learn", "step", "tips", "mistake", "example", "explain", "understand", "guide"],
    "sales": ["problem", "result", "benefit", "buy", "customer", "save", "price", "offer", "proof"],
    "story": ["then", "suddenly", "because", "felt", "remember", "started", "changed", "finally"],
    "portfolio": ["built", "designed", "created", "project", "result", "quality", "client", "work"],
    "engagement": ["why", "secret", "watch", "imagine", "crazy", "important", "today"]
}
TONE_EMOTION_BIAS = {
    "emotional": ["happy", "sad", "suspense"],
    "bold": ["excitement", "angry", "suspense"],
    "funny": ["happy", "excitement"],
    "clean": ["excitement", "happy"],
    "cinematic": ["suspense", "excitement", "happy"]
}


# -------------------------
# STEP 1: Video Info
# -------------------------
def get_video_info(video_path):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    duration = int(frame_count / fps) if fps > 0 else 0
    cap.release()
    return duration, fps


# -------------------------
# STEP 2: Load Whisper Segments
# -------------------------
def load_segments():
    path = "ai-engine/segments.json"
    if not os.path.exists(path):
        print("[Warning] segments.json not found", file=sys.stderr)
        return []
    with open(path, "r") as f:
        return json.load(f)


def load_metadata():
    path = "ai-engine/metadata.json"
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_visual_activity(video_path):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    sample_interval = max(1, int(fps))
    visual_map = {}
    frame_index = 0
    previous_gray = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_index % sample_interval == 0:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.GaussianBlur(gray, (7, 7), 0)
            score = 0.0
            if previous_gray is not None:
                diff = cv2.absdiff(gray, previous_gray)
                score = float(diff.mean()) + (cv2.Laplacian(gray, cv2.CV_64F).var() * 0.02)
            visual_map[int(frame_index / fps)] = score
            previous_gray = gray

        frame_index += 1

    cap.release()

    if not visual_map:
        return {}

    max_v = max(visual_map.values()) or 1
    return {key: round(value / max_v, 3) for key, value in visual_map.items()}


# -------------------------
# STEP 3: ML — Audio Energy
# -------------------------
def get_audio_energy(video_path):
    filename = os.path.basename(video_path).split('.')[0]
    audio_path = f"ai-engine/audio/{filename}.wav"

    if not os.path.exists(audio_path):
        print("[Audio] No WAV file found", file=sys.stderr)
        return {}

    energy_map = {}
    try:
        with wave.open(audio_path, "rb") as wf:
            framerate = wf.getframerate()
            sampwidth = wf.getsampwidth()
            channels = wf.getnchannels()
            frames_per_sec = framerate
            t = 0
            while True:
                frames = wf.readframes(frames_per_sec)
                if not frames:
                    break
                rms = calculate_rms(frames, sampwidth, channels)
                energy_map[t] = rms
                t += 1

        max_e = max(energy_map.values()) or 1
        for t in energy_map:
            energy_map[t] = round(energy_map[t] / max_e, 3)

        return energy_map

    except Exception as e:
        print(f"[Audio] Failed: {e}", file=sys.stderr)
        return {}


def calculate_rms(frames, sampwidth, channels):
    if not frames:
        return 0

    if sampwidth == 1:
        sample_count = len(frames)
        samples = [(value - 128) for value in frames]
    elif sampwidth == 2:
        sample_count = len(frames) // 2
        samples = struct.unpack(f"<{sample_count}h", frames)
    elif sampwidth == 4:
        sample_count = len(frames) // 4
        samples = struct.unpack(f"<{sample_count}i", frames)
    else:
        raise ValueError(f"Unsupported sample width: {sampwidth}")

    if channels > 1:
        mono_samples = []
        for index in range(0, len(samples), channels):
            channel_group = samples[index:index + channels]
            mono_samples.append(sum(channel_group) / len(channel_group))
        samples = mono_samples

    if not samples:
        return 0

    mean_square = sum(sample * sample for sample in samples) / len(samples)
    return math.sqrt(mean_square)


# -------------------------
# STEP 4: ML — Speech Rate
# -------------------------
def get_speech_rate(segments):
    rates = {}
    for seg in segments:
        duration = seg["end"] - seg["start"]
        if duration > 0:
            word_count = len((seg.get("english_text") or seg["text"]).split())
            rate = word_count / duration
            rates[seg["start"]] = round(rate, 3)

    if rates:
        max_r = max(rates.values()) or 1
        for t in rates:
            rates[t] = round(rates[t] / max_r, 3)

    return rates


# -------------------------
# STEP 5: ML Score Every Segment
# -------------------------
def position_bonus(segment_start, duration):
    if duration <= 0:
        return 0.0
    ratio = segment_start / duration
    if ratio < 0.18:
        return 0.12
    if ratio > 0.68:
        return 0.08
    return 0.05


def text_bonus(text, is_last_segment=False, options=None):
    options = options or {}
    lowered = text.lower()
    hook_bonus = 0.12 if any(term in lowered for term in HOOK_WORDS) else 0.0
    payoff_bonus = 0.08 if is_last_segment or any(term in lowered for term in PAYOFF_WORDS) else 0.0
    question_bonus = 0.04 if "?" in text else 0.0
    goal_terms = GOAL_KEYWORDS.get(options.get("creatorGoal", "engagement"), GOAL_KEYWORDS["engagement"])
    goal_bonus = 0.07 if any(term in lowered for term in goal_terms) else 0.0
    audience_bonus = 0.04 if options.get("audience") not in [None, "general"] and len(lowered.split()) >= 6 else 0.0
    return hook_bonus + payoff_bonus + question_bonus + goal_bonus + audience_bonus


def score_segments(segments, energy_map, speech_rates, visual_map, duration):
    scored = []

    for index, seg in enumerate(segments):
        start = int(seg["start"])
        seg_duration = max(1.0, seg["end"] - seg["start"])

        # Average audio energy over segment
        seg_energies = [
            energy_map[t]
            for t in range(start, min(int(seg["end"]) + 1, start + 15))
            if t in energy_map
        ]
        audio_score = sum(seg_energies) / len(seg_energies) if seg_energies else 0.3
        speech_score = speech_rates.get(seg["start"], 0.3)
        keyword_text = (seg.get("english_text") or seg["text"]).lower()
        visual_scores = [
            visual_map[t]
            for t in range(start, min(int(seg["end"]) + 1, start + 15))
            if t in visual_map
        ]
        visual_score = sum(visual_scores) / len(visual_scores) if visual_scores else 0.25
        keyword_bonus = text_bonus(
            seg.get("english_text") or seg["text"],
            is_last_segment=index == len(segments) - 1,
            options=options
        )
        pacing_bonus = 0.08 if 5 <= seg_duration <= 14 else 0.03
        start_bonus = position_bonus(seg["start"], duration)
        ml_score = round(
            (audio_score * 0.34) +
            (speech_score * 0.22) +
            (visual_score * 0.24) +
            keyword_bonus +
            pacing_bonus +
            start_bonus,
            3
        )

        scored.append({
            "start": seg["start"],
            "end": seg["end"],
            "text": seg["text"],
            "english_text": seg.get("english_text") or seg["text"],
            "ml_score": ml_score,
            "visual_score": round(visual_score, 3),
            "audio_score": round(audio_score, 3),
            "speech_score": round(speech_score, 3)
        })

    return sorted(scored, key=lambda x: x["ml_score"], reverse=True)


# -------------------------
# STEP 6: Select Diverse Candidates
# -------------------------
def select_candidates(scored_segments, duration, needed, min_gap=15):
    candidates = []
    used_times = []
    time_buckets = [
        (0, duration / 3),
        (duration / 3, (duration * 2) / 3),
        ((duration * 2) / 3, duration + 1),
    ]

    for bucket_start, bucket_end in time_buckets:
        bucket_candidates = [
            seg for seg in scored_segments
            if bucket_start <= seg["start"] < bucket_end
            and not any(abs(seg["start"] - t) < min_gap for t in used_times)
        ]
        if bucket_candidates:
            chosen = bucket_candidates[0]
            candidates.append(chosen)
            used_times.append(chosen["start"])

    for seg in scored_segments:
        too_close = any(abs(seg["start"] - t) < min_gap for t in used_times)
        if too_close:
            continue

        candidates.append(seg)
        used_times.append(seg["start"])

        if len(candidates) >= needed:
            break

    # If not enough candidates, lower the gap requirement
    if len(candidates) < needed:
        for seg in scored_segments:
            if seg in candidates:
                continue
            too_close = any(abs(seg["start"] - t) < 5 for t in used_times)
            if not too_close:
                candidates.append(seg)
                used_times.append(seg["start"])
            if len(candidates) >= needed:
                break

    candidates = sorted(candidates, key=lambda x: (x["ml_score"], -x["start"]), reverse=True)[:max(needed + 2, len(candidates))]

    print(f"[ML] Selected {len(candidates)} candidates for {TRAILERS_TO_GENERATE} trailers", file=sys.stderr)
    for c in candidates:
        print(f"  {c['start']:.1f}s | ml_score={c['ml_score']} | \"{c['text'][:50]}\"", file=sys.stderr)

    return candidates


# -------------------------
# STEP 7: Groq Emotion Detection
# -------------------------
def detect_emotions(candidates, duration):
    """
    Send ML candidates to Groq.
    Get emotion + role labels for each.
    We need enough labeled moments to build multiple trailers.
    """
    print(f"[Groq] Detecting emotions on {len(candidates)} candidates...", file=sys.stderr)

    formatted = ""
    for i, c in enumerate(candidates):
        formatted += f"[{i}] {c['start']:.1f}s-{c['end']:.1f}s (ml_score={c['ml_score']}): \"{c.get('english_text', c['text'])}\"\n"

    prompt = f"""You are an expert trailer editor analyzing a video.

Video duration: {duration} seconds
Creator goal: {options.get("creatorGoal", "engagement")}
Target audience: {options.get("audience", "general")}
Desired tone: {options.get("tone", "cinematic")}
Target reel duration: {CLIP_LENGTH} seconds
High-energy moments detected by audio/speech analysis:
{formatted}

Label EACH moment with:
1. emotion: happy, excitement, suspense, angry, or sad
2. role: hook, tension, climax, or resolution
3. score: 0-10 virality score
4. A good start/end time that captures 7-12 seconds of the best part

IMPORTANT RULES:
- Label ALL {len(candidates)} moments
- Each moment should be concise for a {CLIP_LENGTH}-second short reel
- Prefer moments that create a story arc from hook to payoff
- Prefer moments that fit the creator goal, target audience, and desired tone
- Use exact timestamps close to the originals
- Distribute roles so we have variety: multiple hooks, tensions, climaxes
- Return ONLY valid JSON, no explanation, no markdown

Format:
{{
  "moments": [
    {{
      "start": <number>,
      "end": <number>,
      "text": "<the line>",
      "emotion": "<happy|excitement|suspense|angry|sad>",
      "role": "<hook|tension|climax|resolution>",
      "score": <float 0-10>
    }}
  ]
}}"""

    try:
        if not client:
            raise RuntimeError("Groq client unavailable")
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000
        )

        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        result = json.loads(raw)
        moments = result.get("moments", [])

        print(f"[Groq] Got {len(moments)} labeled moments", file=sys.stderr)
        for m in moments:
            print(f"  [{m['role'].upper()}] {m['start']}s-{m['end']}s | {m['emotion']} | score={m['score']}", file=sys.stderr)

        return moments

    except Exception as e:
        print(f"[Groq] Failed: {e}", file=sys.stderr)
        # Fallback: return candidates as basic moments
        return [
            {
                "start": max(0, c["start"] - 0.5),
                "end": min(c["end"], max(c["start"] + 7, c["start"] + min(11, max(7, c["end"] - c["start"]))), duration),
                "text": c.get("english_text", c["text"]),
                "emotion": (TONE_EMOTION_BIAS.get(options.get("tone", "cinematic"), TONE_EMOTION_BIAS["cinematic"])[i % len(TONE_EMOTION_BIAS.get(options.get("tone", "cinematic"), TONE_EMOTION_BIAS["cinematic"]))]),
                "role": ["hook", "tension", "climax", "resolution"][i % 4],
                "score": min(10, round(c["ml_score"] * 8.5, 2))
            }
            for i, c in enumerate(candidates)
        ]


# -------------------------
# STEP 8: Group into Trailer Arcs
# -------------------------
def group_into_trailers(moments, duration, num_trailers=TRAILERS_TO_GENERATE):
    sorted_moments = sorted(moments, key=lambda x: x.get("score", 0), reverse=True)
    if not sorted_moments:
        return []

    early = [m for m in sorted_moments if m["start"] < duration / 3]
    middle = [m for m in sorted_moments if duration / 3 <= m["start"] < (duration * 2) / 3]
    late = [m for m in sorted_moments if m["start"] >= (duration * 2) / 3]

    def pick_best(bucket, preferred_roles):
        for role in preferred_roles:
            role_match = [moment for moment in bucket if moment.get("role") == role]
            if role_match:
                return role_match[0]
        return bucket[0] if bucket else None

    chosen = []
    for moment in [
        pick_best(early, ["hook", "tension"]),
        pick_best(middle, ["tension", "climax"]),
        pick_best(late, ["climax", "resolution"]),
    ]:
        if moment:
            chosen.append(moment)

    chosen_keys = {f"{m['start']}-{m['end']}" for m in chosen}
    extras = [
        moment for moment in sorted_moments
        if f"{moment['start']}-{moment['end']}" not in chosen_keys
    ]

    for moment in extras:
        if len(chosen) >= MOMENTS_PER_TRAILER:
            break
        chosen.append(moment)
        chosen_keys.add(f"{moment['start']}-{moment['end']}")

    final_reel = sorted(chosen[:MOMENTS_PER_TRAILER], key=lambda x: x["start"])
    total = sum(m["end"] - m["start"] for m in final_reel)
    print(f"[Arc] Final reel: {len(final_reel)} moments, ~{total:.1f}s", file=sys.stderr)
    for m in final_reel:
        print(f"  [{m['role'].upper()}] {m['start']}s-{m['end']}s | {m['emotion']}", file=sys.stderr)

    return [final_reel]


# -------------------------
# MAIN
# -------------------------
def run():
    duration, fps = get_video_info(video_path)
    print(f"[Info] Duration: {duration}s | FPS: {fps}", file=sys.stderr)

    segments = load_segments()
    metadata = load_metadata()
    print(f"[Info] Loaded {len(segments)} transcript segments", file=sys.stderr)

    if not segments:
        print("[Error] No segments found!", file=sys.stderr)
        print(json.dumps({"highlights": [], "trailers": [], "duration": duration}))
        return

    # ML signals
    energy_map = get_audio_energy(video_path)
    speech_rates = get_speech_rate(segments)
    visual_map = get_visual_activity(video_path)

    # Score all segments
    scored = score_segments(segments, energy_map, speech_rates, visual_map, duration)

    # Select diverse candidates
    candidates = select_candidates(scored, duration, TOTAL_MOMENTS_NEEDED)

    if not candidates:
        print("[Error] No candidates found!", file=sys.stderr)
        print(json.dumps({"highlights": [], "trailers": [], "duration": duration}))
        return

    # Groq emotion detection
    moments = detect_emotions(candidates, duration)

    # Group into trailer arcs
    trailers = group_into_trailers(moments, duration)

    print(f"\n[Final] {len(trailers)} trailers planned", file=sys.stderr)

    # Output format — flat highlights list with trailer_index
    all_highlights = []
    for t_idx, trailer_moments in enumerate(trailers):
        for m in trailer_moments:
            m["trailer_index"] = t_idx
            all_highlights.append(m)

    result = {
        "highlights": all_highlights,
        "trailers": trailers,
        "num_trailers": len(trailers),
        "duration": duration,
        "analysis_language": metadata.get("analysis_language", "english"),
        "source_language": metadata.get("source_language", "unknown")
    }

    print(json.dumps(result))


if __name__ == "__main__":
    run()
