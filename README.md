# AI StoryBoard Reel Generator

AI StoryBoard Reel Generator is a full-stack major project that converts long videos into personalized short-form reels for Instagram Reels and YouTube Shorts. It analyzes the video transcript, audio energy, speech pacing, visual activity, creator goal, target audience, and tone to generate a final reel, thumbnail, captions, hashtags, and a creative direction report.

## Features

- User registration and login
- User-specific dashboard and upload history
- Upload MP4/MOV videos
- Optional custom thumbnail upload
- 30-second or 60-second reel generation
- Instagram Reels / YouTube Shorts mode
- Auto, English, Hindi, and Kannada transcript settings
- Whisper-based transcription
- Audio energy, speech rate, and visual activity scoring
- Personalized highlight detection
- Emotion and story-role labeling for moments
- Final vertical reel generation with optional subtitles
- Smart thumbnail generation from the best hook frame
- Personalized captions and content-specific hashtags
- Optional YouTube trend context using YouTube Data API
- Creative direction panel with hook, audience, goal, retention pattern, and viral reasons
- Delete uploaded videos and generated files from the dashboard

## Tech Stack

- Frontend: React, Framer Motion, CSS
- Backend: Node.js, Express, MongoDB, Mongoose
- AI / Video Engine: Python, Whisper, OpenCV, MoviePy, FFmpeg
- Optional APIs: Groq, YouTube Data API

## Prerequisites

Install these before running the project:

- Node.js
- Python 3.10+
- MongoDB Atlas connection string
- FFmpeg added to system PATH
- Git

## Setup

Clone the repository:

```bash
git clone https://github.com/TNamrathaPadiyar/AI-StoryBoard_ReelGenerator.git
cd AI-StoryBoard_ReelGenerator
```

Install backend dependencies:

```bash
cd backend
npm install
pip install -r requirements.txt
```

Create backend environment file:

```bash
copy .env.example .env
```

Update `backend/.env`:

```env
PORT=8000
MONGO_URI=your_mongodb_connection_string
GROQ_KEY=optional_groq_api_key
YOUTUBE_API_KEY=optional_youtube_data_api_key
YOUTUBE_REGION=IN
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

## Run The Project

Start backend:

```bash
cd backend
npm start
```

Start frontend in a second terminal:

```bash
cd frontend
npm start
```

Open:

```text
http://localhost:3000
```

The backend runs on:

```text
http://localhost:8000
```

## Optional API Keys

`GROQ_KEY` improves emotion detection, caption rewriting, translation, and social copy.

`YOUTUBE_API_KEY` enables optional trend context from YouTube popular videos. Without it, the app still generates content-specific captions and hashtags using local transcript analysis.

## Important Notes

- Do not commit `backend/.env`; it contains private credentials.
- Uploaded videos, generated reels, audio files, extracted frames, and transcripts are ignored by Git.
- First-time Whisper processing may take longer because the model may need to download.
- Reels generated before code changes will not automatically update. Upload/process the video again to get new output.
