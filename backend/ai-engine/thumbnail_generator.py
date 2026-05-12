import json
import os
import sys
import textwrap

import cv2
import numpy as np


TARGET_SIZE = (1080, 1920)
TONE_PALETTES = {
    "cinematic": {
        "panel": (8, 16, 30),
        "accent": (64, 188, 255),
        "badge": (48, 112, 255),
        "sticker": (255, 170, 88),
        "text": (255, 255, 255)
    },
    "emotional": {
        "panel": (26, 18, 36),
        "accent": (186, 118, 255),
        "badge": (172, 92, 210),
        "sticker": (255, 162, 178),
        "text": (255, 248, 250)
    },
    "bold": {
        "panel": (12, 12, 18),
        "accent": (56, 74, 255),
        "badge": (36, 42, 230),
        "sticker": (44, 235, 182),
        "text": (255, 255, 255)
    },
    "clean": {
        "panel": (18, 28, 32),
        "accent": (132, 214, 190),
        "badge": (70, 138, 156),
        "sticker": (232, 236, 221),
        "text": (248, 252, 250)
    },
    "funny": {
        "panel": (24, 20, 16),
        "accent": (255, 194, 64),
        "badge": (255, 120, 88),
        "sticker": (98, 224, 255),
        "text": (255, 252, 244)
    }
}


def load_face_detector():
    cascade_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
    if not os.path.exists(cascade_path):
        return None
    detector = cv2.CascadeClassifier(cascade_path)
    return detector if not detector.empty() else None


FACE_DETECTOR = load_face_detector()


def resize_and_crop(frame, target_width=1080, target_height=1920):
    height, width = frame.shape[:2]
    scale = max(target_width / width, target_height / height)
    resized = cv2.resize(frame, (int(width * scale), int(height * scale)))
    new_h, new_w = resized.shape[:2]
    x = max(0, (new_w - target_width) // 2)
    y = max(0, (new_h - target_height) // 2)
    return resized[y:y + target_height, x:x + target_width]


def frame_score(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))
    contrast = float(np.std(gray))
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    center_crop = gray[gray.shape[0] // 5: gray.shape[0] * 4 // 5, gray.shape[1] // 5: gray.shape[1] * 4 // 5]
    center_energy = float(np.std(center_crop))
    face_bonus = 0.0

    if FACE_DETECTOR is not None:
        faces = FACE_DETECTOR.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=4, minSize=(60, 60))
        face_bonus = min(2.5, len(faces) * 1.2)

    return (contrast * 0.25) + (sharpness * 0.015) + (brightness * 0.08) + (center_energy * 0.18) + face_bonus


def choose_best_frame(video_path, seek_time):
    capture = cv2.VideoCapture(video_path)
    fps = capture.get(cv2.CAP_PROP_FPS) or 25
    candidate_times = [max(0.0, seek_time + offset) for offset in (-1.4, -0.8, -0.2, 0.4, 1.0, 1.6)]
    best_frame = None
    best_score = -1.0

    for timestamp in candidate_times:
        capture.set(cv2.CAP_PROP_POS_FRAMES, int(timestamp * fps))
        success, frame = capture.read()
        if not success or frame is None:
            continue
        fitted = resize_and_crop(frame, *TARGET_SIZE)
        score = frame_score(fitted)
        if score > best_score:
            best_score = score
            best_frame = fitted

    capture.release()
    if best_frame is None:
        raise RuntimeError("Unable to capture thumbnail frame.")
    return best_frame


def shadow_text(image, text, origin, font, scale, color, thickness):
    x, y = origin
    cv2.putText(image, text, (x + 4, y + 4), font, scale, (0, 0, 0), thickness + 4, cv2.LINE_AA)
    cv2.putText(image, text, origin, font, scale, color, thickness, cv2.LINE_AA)


def draw_gradient_band(image, y1, y2, color, max_alpha):
    height, width = image.shape[:2]
    band = image.copy()
    cv2.rectangle(band, (0, y1), (width, y2), color, -1)
    for y in range(y1, y2):
        ratio = (y - y1) / max(1, y2 - y1)
        alpha = max_alpha * ratio
        image[y:y + 1] = cv2.addWeighted(band[y:y + 1], alpha, image[y:y + 1], 1 - alpha, 0)


def draw_pill(image, top_left, text, fill, text_color, width=None):
    x, y = top_left
    font = cv2.FONT_HERSHEY_DUPLEX
    scale = 0.9
    thickness = 2
    (text_width, _), _ = cv2.getTextSize(text, font, scale, thickness)
    pill_width = width or text_width + 40
    pill_height = 54
    radius = pill_height // 2

    cv2.rectangle(image, (x + radius, y), (x + pill_width - radius, y + pill_height), fill, -1)
    cv2.circle(image, (x + radius, y + radius), radius, fill, -1)
    cv2.circle(image, (x + pill_width - radius, y + radius), radius, fill, -1)
    text_x = x + (pill_width - text_width) // 2
    text_y = y + 35
    cv2.putText(image, text, (text_x, text_y), font, scale, text_color, thickness, cv2.LINE_AA)


def add_overlay(image, title, badge, sticker, tone="cinematic"):
    height, width = image.shape[:2]
    palette = TONE_PALETTES.get(tone, TONE_PALETTES["cinematic"])

    draw_gradient_band(image, int(height * 0.62), height, palette["panel"], 0.58)
    draw_gradient_band(image, 0, int(height * 0.16), palette["panel"], 0.25)
    cv2.rectangle(image, (0, int(height * 0.68)), (18, height - 64), palette["accent"], -1)

    draw_pill(image, (36, 44), badge[:18], palette["badge"], (255, 255, 255))
    draw_pill(image, (width - 320, 44), sticker[:18], palette["sticker"], (15, 20, 28), width=284)

    wrapped = textwrap.wrap(title[:58], width=15)[:2]
    start_y = int(height * 0.77)
    for index, line in enumerate(wrapped):
        shadow_text(
            image,
            line,
            (48, start_y + (index * 92)),
            cv2.FONT_HERSHEY_DUPLEX,
            1.95,
            palette["text"],
            4,
        )

    draw_pill(image, (48, height - 92), "BEST HOOK FRAME", palette["panel"], (196, 228, 255), width=360)
    return image


def main():
    payload = json.loads(sys.argv[1])
    input_path = payload["input"]
    output_path = payload["output"]
    seek_time = float(payload.get("seekTime", 1))
    title = payload.get("title", "Viral Reel")
    badge = payload.get("badge", "HOT")
    sticker = payload.get("sticker", "MUST WATCH")
    tone = payload.get("tone", "cinematic")

    image = choose_best_frame(input_path, seek_time)
    image = add_overlay(image, title, badge, sticker, tone)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    cv2.imwrite(output_path, image)


if __name__ == "__main__":
    main()
