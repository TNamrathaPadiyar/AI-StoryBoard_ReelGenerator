const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  filename: String,
  originalName: String,
  status: {
    type: String,
    default: "uploaded"
  },
  transcript: String,
  transcriptEnglish: String,
  sourceLanguage: String,
  analysisLanguage: String,
  trailers: {
    type: Array,
    default: []
  },
  highlights: [
    {
      start: Number,
      end: Number,
      text: String,
      emotion: String,
      role: String,
      score: Number,
      trailer_index: Number
    }
  ],
  clips: [
    {
      path: String,
      url: String
    }
  ],
  thumbnail: {
    path: String,
    url: String,
    title: String,
    source: String
  },
  contentInsights: {
    dominantEmotion: String,
    hookLine: String,
    middleLine: String,
    endingLine: String,
    reelSummary: String,
    thumbnailSticker: String,
    viralReasons: [String],
    audience: String,
    creatorGoal: String,
    tone: String,
    personalizationAngle: String,
    retentionPattern: String,
    thumbnailConcept: String
  },
  settings: {
    clipLength: {
      type: Number,
      default: 30
    },
    subtitles: {
      type: Boolean,
      default: true
    },
    platform: {
      type: String,
      default: "instagram"
    },
    targetLanguage: {
      type: String,
      default: "auto"
    },
    creatorGoal: {
      type: String,
      default: "engagement"
    },
    audience: {
      type: String,
      default: "general"
    },
    tone: {
      type: String,
      default: "cinematic"
    }
  },
  captionSuggestions: [String],
  hashtags: [String],
  viralScore: Number,
  duration: Number,
  failureReason: String
}, { timestamps: true });

module.exports = mongoose.model("Video", videoSchema);
