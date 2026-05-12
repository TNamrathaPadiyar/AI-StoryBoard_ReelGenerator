const fs = require("fs");
const path = require("path");
const https = require("https");
const { execFile, spawn } = require("child_process");
const Video = require("../models/video");

const backendRoot = path.join(__dirname, "..");
const transcriptPath = path.join(backendRoot, "ai-engine", "transcript.txt");
const metadataPath = path.join(backendRoot, "ai-engine", "metadata.json");
const MAX_VIDEO_SECONDS = 15 * 60;
const STOP_WORDS = new Set([
  "about", "after", "again", "because", "before", "being", "could", "every", "first", "from",
  "have", "into", "just", "like", "make", "more", "only", "other", "people", "really", "should",
  "than", "that", "their", "there", "these", "thing", "this", "those", "very", "video", "with",
  "your", "you", "they", "what", "when", "where", "will", "would"
]);

function readTranscript() {
  try {
    return fs.readFileSync(transcriptPath, "utf8");
  } catch (error) {
    return "";
  }
}

function readMetadata() {
  try {
    return JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  } catch (error) {
    return {};
  }
}

function clipUrlForPath(clipPath) {
  const normalized = String(clipPath || "").replace(/\\/g, "/");
  const fileName = normalized.split("/").pop();
  return fileName ? `/api/generated/${fileName}` : "";
}

function generatedUrlForFile(fileName) {
  return fileName ? `/api/generated/${fileName}` : "";
}

function uploadUrlForFile(fileName) {
  return fileName ? `/api/uploads/${fileName}` : "";
}

function safeUnlink(filePath) {
  if (!filePath) {
    return;
  }

  const resolved = path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(path.join(backendRoot, filePath));
  const allowedRoots = [
    path.resolve(path.join(backendRoot, "uploads")),
    path.resolve(path.join(backendRoot, "ai-engine", "clips")),
  ];
  const isAllowed = allowedRoots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));

  if (!isAllowed) {
    return;
  }

  fs.promises.unlink(resolved).catch(() => {});
}

function serializeVideo(video) {
  return {
    id: video._id.toString(),
    userId: video.userId?.toString?.() || video.userId,
    filename: video.filename,
    originalName: video.originalName,
    status: video.status,
    transcript: video.transcript,
    transcriptEnglish: video.transcriptEnglish || "",
    sourceLanguage: video.sourceLanguage || "",
    analysisLanguage: video.analysisLanguage || "",
    highlights: video.highlights || [],
    trailers: video.trailers || [],
    clips: (video.clips || []).map((clip) => ({
      path: clip.path,
      url: clip.url,
    })),
    thumbnail: video.thumbnail || {},
    contentInsights: video.contentInsights || {},
    settings: video.settings || {},
    captionSuggestions: video.captionSuggestions || [],
    hashtags: video.hashtags || [],
    viralScore: video.viralScore || 0,
    duration: video.duration || 0,
    failureReason: video.failureReason || "",
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  };
}

function runPythonScript(scriptName, args) {
  return new Promise((resolve, reject) => {
    execFile("python", [path.join("ai-engine", scriptName), ...args], { cwd: backendRoot }, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr;
        reject(error);
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`Request failed with status ${response.statusCode}`));
            return;
          }

          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

async function getYouTubeTrendContext({ transcriptEnglish, settings }) {
  if (!process.env.YOUTUBE_API_KEY) {
    return null;
  }

  const regionCode = process.env.YOUTUBE_REGION || "IN";
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("chart", "mostPopular");
  url.searchParams.set("regionCode", regionCode);
  url.searchParams.set("maxResults", "12");
  url.searchParams.set("key", process.env.YOUTUBE_API_KEY);

  try {
    const payload = await fetchJson(url.toString());
    const keywords = new Set(extractKeywords(transcriptEnglish));
    const items = (payload.items || []).map((item) => {
      const snippet = item.snippet || {};
      const title = cleanText(snippet.title || "");
      const tags = (snippet.tags || []).slice(0, 6);
      const titleMatches = [...keywords].filter((keyword) => title.toLowerCase().includes(keyword));
      const tagMatches = tags.filter((tag) => keywords.has(String(tag).toLowerCase()));

      return {
        title,
        channel: snippet.channelTitle || "",
        tags,
        viewCount: Number(item.statistics?.viewCount || 0),
        relevance: titleMatches.length + tagMatches.length,
      };
    });

    const ranked = items
      .sort((a, b) => (b.relevance - a.relevance) || (b.viewCount - a.viewCount))
      .slice(0, 5);

    const trendTags = [...new Set(ranked.flatMap((item) => item.tags))]
      .map((tag) => `#${toTitleCase(String(tag)).replace(/[^a-zA-Z0-9]/g, "")}`)
      .filter((tag) => tag.length > 1)
      .slice(0, 6);

    return {
      source: "youtube_mostPopular",
      regionCode,
      platform: settings.platform,
      titles: ranked.map((item) => item.title).filter(Boolean),
      trendTags,
    };
  } catch (error) {
    console.warn("YouTube trend context unavailable:", error.message);
    return null;
  }
}

function runClipGeneration(videoFilename, highlightsPayload) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(
      "python",
      [path.join("ai-engine", "clip_generation.py"), path.join("uploads", videoFilename)],
      { cwd: backendRoot }
    );

    let output = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on("error", reject);

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(errorOutput || "Clip generation failed."));
        return;
      }

      try {
        resolve(JSON.parse(output));
      } catch (error) {
        reject(new Error("Invalid JSON returned by clip generation."));
      }
    });

    pythonProcess.stdin.write(JSON.stringify(highlightsPayload));
    pythonProcess.stdin.end();
  });
}

function normalizeBoolean(value, defaultValue = true) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return defaultValue;
}

function parseSettings(body = {}) {
  const clipLength = Number(body.clipLength || 30);
  const allowedCreatorGoals = ["engagement", "education", "sales", "story", "portfolio"];
  const allowedAudiences = ["general", "students", "professionals", "creators", "customers"];
  const allowedTones = ["cinematic", "emotional", "bold", "clean", "funny"];

  return {
    clipLength: clipLength === 60 ? 60 : 30,
    subtitles: normalizeBoolean(body.subtitles, true),
    platform: ["instagram", "youtube"].includes(body.platform) ? body.platform : "instagram",
    targetLanguage: ["auto", "english", "hindi", "kannada"].includes(body.targetLanguage)
      ? body.targetLanguage
      : "auto",
    creatorGoal: allowedCreatorGoals.includes(body.creatorGoal) ? body.creatorGoal : "engagement",
    audience: allowedAudiences.includes(body.audience) ? body.audience : "general",
    tone: allowedTones.includes(body.tone) ? body.tone : "cinematic",
  };
}

function extractKeywords(text) {
  const counts = new Map();
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
    .forEach((word) => {
      counts.set(word, (counts.get(word) || 0) + 1);
    });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([word]) => word);
}

function hashtagify(value) {
  const cleaned = toTitleCase(String(value || "").replace(/[^a-zA-Z0-9\s]/g, " "))
    .replace(/\s+/g, "");
  return cleaned ? `#${cleaned}` : "";
}

function buildContentSpecificHashtags(transcriptEnglish, settings = {}) {
  const text = cleanText(transcriptEnglish).toLowerCase();
  const tags = [];
  const add = (...items) => {
    items.forEach((item) => {
      const tag = item.startsWith("#") ? item : hashtagify(item);
      if (tag && !tags.includes(tag)) {
        tags.push(tag);
      }
    });
  };

  const foodTerms = {
    diet: ["#DietSwap", "#FoodChallenge", "#WhatIEatInADay"],
    food: ["#FoodVlog", "#FoodChallenge"],
    noodles: ["#NoodleLovers", "#InstantNoodles"],
    pizza: ["#PizzaLovers", "#PizzaNight"],
    salad: ["#HealthyEating", "#SaladBowl"],
    coffee: ["#CoffeeRun", "#CoffeeLovers"],
    breakfast: ["#BreakfastIdeas", "#MorningRoutine"],
    lunch: ["#LunchTime", "#FoodReview"],
    dinner: ["#DinnerTime", "#DinnerIdeas"],
    salmon: ["#SalmonDinner", "#HealthyFood"],
    veggies: ["#VeggieMeal", "#HealthyEating"],
    bubble: ["#BubbleTea", "#BobaTea"],
  };

  Object.entries(foodTerms).forEach(([term, termTags]) => {
    if (text.includes(term)) {
      add(...termTags);
    }
  });

  const places = [
    "hong kong",
    "bangalore",
    "bengaluru",
    "mumbai",
    "delhi",
    "hyderabad",
    "chennai",
    "karnataka",
    "india",
  ];

  places.forEach((place) => {
    if (text.includes(place)) {
      const placeName = place === "bengaluru" ? "Bangalore" : place;
      add(`${placeName}Food`, `${placeName}Vlog`);
    }
  });

  if (text.includes("swap") || text.includes("swapping")) {
    add("#SwapChallenge", "#CoupleChallenge");
  }

  if (text.includes("24 hours") || text.includes("24 hour")) {
    add("#24HourChallenge");
  }

  if (text.includes("mall")) {
    add("#MallFood", "#FoodCourt");
  }

  if (settings.platform === "youtube") {
    add("#YouTubeShorts");
  } else {
    add("#InstagramReels");
  }

  return tags.slice(0, 10);
}

function toTitleCase(text) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function compactTitleWords(words, maxWords = 6) {
  const blocked = new Set(["gonna", "wanna", "kinda", "looks", "looked", "thing", "stuff", "okay"]);
  const result = [];

  words.forEach((rawWord) => {
    const word = rawWord.replace(/[^a-zA-Z0-9]/g, "");
    const lowered = word.toLowerCase();

    if (word.length < 3 || blocked.has(lowered)) {
      return;
    }

    if (result[result.length - 1]?.toLowerCase() === lowered) {
      return;
    }

    result.push(word);
  });

  return result.slice(0, maxWords);
}

function cleanText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function splitSentences(text) {
  return cleanText(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function buildTopicTitle({ transcriptEnglish, originalName, highlights }) {
  const keywords = extractKeywords(transcriptEnglish);
  const hookLine = cleanText(highlights[0]?.text || splitSentences(transcriptEnglish)[0] || path.parse(originalName).name);
  const hookWords = compactTitleWords(hookLine
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2), 5);

  const transcriptLower = transcriptEnglish.toLowerCase();

  if (transcriptLower.includes("swapping our diets") || transcriptLower.includes("swap") && transcriptLower.includes("diet")) {
    return "We Swapped Diets";
  }

  if (hookLine.toLowerCase().includes("how") && hookWords.length >= 2) {
    return toTitleCase(`How ${hookWords.slice(1).join(" ")}`.trim().slice(0, 42));
  }

  if (keywords.length >= 2) {
    return toTitleCase(compactTitleWords([keywords[0], keywords[1], ...hookWords], 5).join(" ").trim().slice(0, 42));
  }

  return toTitleCase(hookWords.join(" ").trim().slice(0, 42)) || "Best Moment";
}

function getDominantEmotion(highlights = []) {
  const counts = new Map();
  highlights.forEach((item) => {
    const emotion = cleanText(item?.emotion || "").toLowerCase();
    if (!emotion) {
      return;
    }
    counts.set(emotion, (counts.get(emotion) || 0) + 1);
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "excitement";
}

function getFinalReelMoments(highlights = [], trailers = []) {
  if (trailers[0]?.length) {
    return [...trailers[0]].sort((a, b) => Number(a.start || 0) - Number(b.start || 0));
  }

  return [...highlights]
    .sort((a, b) => Number(a.start || 0) - Number(b.start || 0))
    .slice(0, 4);
}

function trimForSocial(text, maxLength = 220) {
  const cleaned = cleanText(text);
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const clipped = cleaned.slice(0, maxLength - 1);
  const lastBreak = Math.max(clipped.lastIndexOf("."), clipped.lastIndexOf(" "), clipped.lastIndexOf(","));
  return `${(lastBreak > 80 ? clipped.slice(0, lastBreak) : clipped).trim()}...`;
}

function buildThumbnailSticker({ reelMoments, transcriptEnglish }) {
  const lead = cleanText(reelMoments[0]?.text || splitSentences(transcriptEnglish)[0] || "").toLowerCase();
  const emotion = getDominantEmotion(reelMoments);

  if (lead.includes("how") || lead.includes("tips") || lead.includes("steps")) {
    return "HOW TO";
  }
  if (lead.includes("why") || lead.includes("?")) {
    return "WATCH THIS";
  }
  if (lead.includes("secret") || lead.includes("truth") || lead.includes("real")) {
    return "REAL TALK";
  }
  if (emotion === "suspense") {
    return "WAIT FOR IT";
  }
  if (emotion === "angry") {
    return "RAW TAKE";
  }
  if (emotion === "sad") {
    return "EMOTIONAL";
  }
  if (emotion === "happy") {
    return "FEEL GOOD";
  }
  return "MUST WATCH";
}

function getPersonalizationProfile(settings = {}) {
  const goalMap = {
    engagement: {
      label: "Engagement",
      angle: "Lead with the most curiosity-heavy moment and end on a shareable payoff.",
      captionCTA: "Drop this in your saves before you forget.",
      tags: ["#AudienceRetention", "#ShareableReel"],
      scoringBias: "hook-first"
    },
    education: {
      label: "Education",
      angle: "Turn the reel into a clear mini-lesson with one takeaway viewers can repeat.",
      captionCTA: "Save this as a quick learning note.",
      tags: ["#LearnOnReels", "#QuickLesson"],
      scoringBias: "clarity"
    },
    sales: {
      label: "Sales",
      angle: "Highlight the problem, the desire, and the proof without sounding like an ad.",
      captionCTA: "Send this to someone who needs the result.",
      tags: ["#ProductStory", "#ProblemSolved"],
      scoringBias: "proof"
    },
    story: {
      label: "Story",
      angle: "Shape the clip as a beginning, tension point, and emotional resolution.",
      captionCTA: "Watch the shift from start to finish.",
      tags: ["#StoryArc", "#WatchTillEnd"],
      scoringBias: "arc"
    },
    portfolio: {
      label: "Portfolio",
      angle: "Make the result look premium, intentional, and useful as a proof-of-work sample.",
      captionCTA: "This is the kind of detail that builds trust.",
      tags: ["#CreativePortfolio", "#ProofOfWork"],
      scoringBias: "polish"
    }
  };

  const audienceMap = {
    general: "general viewers",
    students: "students who need a simple, memorable takeaway",
    professionals: "busy professionals who scan for value fast",
    creators: "creators looking for hooks, pacing, and reusable ideas",
    customers: "potential customers comparing trust and usefulness"
  };

  const toneMap = {
    cinematic: "premium and dramatic",
    emotional: "human, reflective, and feeling-led",
    bold: "direct, punchy, and high-confidence",
    clean: "minimal, sharp, and professional",
    funny: "light, playful, and conversational"
  };

  const goal = goalMap[settings.creatorGoal] || goalMap.engagement;

  return {
    ...goal,
    audience: audienceMap[settings.audience] || audienceMap.general,
    audienceKey: settings.audience || "general",
    tone: toneMap[settings.tone] || toneMap.cinematic,
    toneKey: settings.tone || "cinematic",
  };
}

function buildRetentionPattern({ reelMoments = [], dominantEmotion, profile }) {
  const roles = reelMoments.map((moment) => moment.role).filter(Boolean);
  const hasHook = roles.includes("hook");
  const hasClimax = roles.includes("climax");

  if (profile.scoringBias === "clarity") {
    return hasHook && hasClimax
      ? "Question, explanation, proof beat"
      : "Context, takeaway, repeatable idea";
  }

  if (profile.scoringBias === "proof") {
    return "Pain point, proof, action cue";
  }

  if (profile.scoringBias === "arc" || dominantEmotion === "sad" || dominantEmotion === "suspense") {
    return "Hook, tension, emotional release";
  }

  if (profile.scoringBias === "polish") {
    return "Best visual, value line, credibility close";
  }

  return "Fast hook, rising curiosity, payoff";
}

function buildThumbnailConcept({ title, sticker, profile, dominantEmotion }) {
  const tonePrefix = {
    cinematic: "High-contrast cinematic frame",
    emotional: "Close emotional frame",
    bold: "Bold reaction frame",
    clean: "Clean centered frame",
    funny: "Expressive candid frame"
  };

  return `${tonePrefix[profile.toneKey] || tonePrefix.cinematic} with "${title}" as the main promise and "${sticker}" as the attention badge for a ${dominantEmotion} reel.`;
}

function buildContentInsights({ transcriptEnglish, settings, highlights, trailers, sourceLanguage }) {
  const reelMoments = getFinalReelMoments(highlights, trailers);
  const sentences = splitSentences(transcriptEnglish);
  const profile = getPersonalizationProfile(settings);
  const hook = cleanText(reelMoments[0]?.text || sentences[0] || "");
  const middle = cleanText(
    reelMoments[Math.min(1, Math.max(0, reelMoments.length - 1))]?.text ||
      sentences[Math.min(1, Math.max(0, sentences.length - 1))] ||
      ""
  );
  const ending = cleanText(
    reelMoments[reelMoments.length - 1]?.text ||
      sentences[sentences.length - 1] ||
      ""
  );
  const dominantEmotion = getDominantEmotion(reelMoments);
  const platformCTA = settings.platform === "youtube" ? "Watch till the last cut." : "Save this reel for later.";
  const emotionalCTA = {
    excitement: "This one builds fast.",
    suspense: "Wait for the payoff.",
    happy: "This part feels too good.",
    angry: "This part hits hard.",
    sad: "You can feel this moment."
  };

  const audienceCue = profile.audienceKey === "general" ? "" : `Made for ${profile.audience}.`;
  const captionOne = trimForSocial([hook, middle, ending].filter(Boolean).join(" "));
  const captionTwo = trimForSocial([hook, emotionalCTA[dominantEmotion] || emotionalCTA.excitement, profile.captionCTA].filter(Boolean).join(" "));
  const captionThree = trimForSocial([audienceCue, hook, platformCTA].filter(Boolean).join(" "));
  const keywords = extractKeywords(transcriptEnglish);
  const specificTags = buildContentSpecificHashtags(transcriptEnglish, settings);
  const emotion = dominantEmotion;
  const baseTags = settings.platform === "youtube"
    ? ["#YouTubeShorts", "#Shorts", "#WatchTillEnd", "#ViralShorts"]
    : ["#InstagramReels", "#Reels", "#ExplorePage", "#TrendingReels"];
  const languageTagMap = {
    hi: "#HindiContent",
    kn: "#KannadaContent",
    en: "#EnglishContent",
  };

  const keywordTags = keywords.map((word) => `#${toTitleCase(word).replace(/\s+/g, "")}`);
  const emotionTag = `#${emotion.charAt(0).toUpperCase()}${emotion.slice(1)}Story`;
  const intentTags = [
    "#Storytelling",
    "#ViralVideo",
    "#MustWatch",
    settings.clipLength === 60 ? "#OneMinuteReel" : "#ThirtySecondReel",
  ];
  const thumbnailSticker = buildThumbnailSticker({ reelMoments, transcriptEnglish });
  const reelSummary = trimForSocial([hook, middle, ending].filter(Boolean).join(" "), 160);

  return {
    reelMoments,
    dominantEmotion,
    hookLine: hook,
    middleLine: middle,
    endingLine: ending,
    reelSummary,
    thumbnailSticker,
    audience: profile.audience,
    creatorGoal: profile.label,
    tone: profile.tone,
    personalizationAngle: profile.angle,
    retentionPattern: buildRetentionPattern({ reelMoments, dominantEmotion, profile }),
    captionSuggestions: [...new Set([captionOne, captionTwo, captionThree].filter(Boolean))],
    hashtags: [...new Set([...specificTags, ...keywordTags, ...baseTags, emotionTag, languageTagMap[sourceLanguage] || "#CreatorWorkflow", ...profile.tags, ...intentTags])].slice(0, 10),
  };
}

function buildViralAnalysis({ reelMoments = [], settings, transcriptEnglish }) {
  if (!reelMoments.length) {
    return { score: 0, reasons: [] };
  }

  const average = reelMoments.reduce((total, item) => total + Number(item.score || 0), 0) / reelMoments.length;
  const starts = reelMoments.map((moment) => Number(moment.start || 0));
  const maxStart = Math.max(...starts, 1);
  const bucketCount = new Set(starts.map((start) => {
    const ratio = start / maxStart;
    if (ratio < 0.33) return "start";
    if (ratio < 0.66) return "middle";
    return "end";
  })).size;
  const dominantEmotion = getDominantEmotion(reelMoments);
  const captionsReady = splitSentences(transcriptEnglish).length > 1 ? 5 : 0;
  const platformBonus = settings.platform === "instagram" ? 4 : 3;
  const profile = getPersonalizationProfile(settings);
  const hookBonus = cleanText(reelMoments[0]?.text || "").length > 20 ? 8 : 4;
  const structureBonus = bucketCount >= 3 ? 10 : bucketCount >= 2 ? 6 : 2;
  const emotionBonus = ["excitement", "suspense"].includes(dominantEmotion) ? 8 : dominantEmotion === "happy" ? 5 : 3;
  const personalizationBonus = settings.audience !== "general" || settings.creatorGoal !== "engagement" ? 6 : 3;
  const score = Math.round(Math.min(100, (average * 7.2) + captionsReady + platformBonus + hookBonus + structureBonus + emotionBonus + personalizationBonus));

  return {
    score,
    reasons: [
      hookBonus >= 8 ? "Strong opening line for the first seconds." : "Hook is present but could be sharper.",
      structureBonus >= 10 ? "Reel covers beginning, middle, and ending beats." : "Story flow is decent but not fully balanced.",
      emotionBonus >= 8 ? `Dominant emotion is ${dominantEmotion}, which helps retention.` : `Emotion reads as ${dominantEmotion}, but intensity is moderate.`,
      personalizationBonus >= 6 ? `Creative brief is tuned for ${profile.audience}.` : "Default audience mode is usable, but personalization can sharpen the output."
    ]
  };
}

function pickThumbnailMoment(highlights = []) {
  if (!highlights.length) {
    return null;
  }

  const ranked = [...highlights].sort((a, b) => {
    const roleScore = { hook: 4, climax: 3, tension: 2, resolution: 1 };
    return ((roleScore[b.role] || 0) + Number(b.score || 0)) - ((roleScore[a.role] || 0) + Number(a.score || 0));
  });

  return ranked[0];
}

function generateThumbnail(videoFilename, highlight, thumbnailTitle, stickerText, settings = {}) {
  return new Promise((resolve) => {
    const outputFile = `${path.parse(videoFilename).name}-thumb.jpg`;
    const outputPath = path.join(backendRoot, "ai-engine", "clips", outputFile);
    const seekTime = Math.max(0, Number(highlight?.start || 1) + 0.5);
    const payload = JSON.stringify({
      input: path.join("uploads", videoFilename),
      output: path.join("ai-engine", "clips", outputFile),
      seekTime,
      title: thumbnailTitle,
      sticker: stickerText,
      tone: settings.tone || "cinematic",
      goal: settings.creatorGoal || "engagement",
      badge: (highlight?.emotion || "viral").toUpperCase(),
    });

    execFile(
      "python",
      [path.join("ai-engine", "thumbnail_generator.py"), payload],
      { cwd: backendRoot },
      () => resolve({ path: outputPath, url: generatedUrlForFile(outputFile), title: thumbnailTitle })
    );
  });
}

function rewriteSocialCopy(payload) {
  return new Promise((resolve) => {
    execFile(
      "python",
      [path.join("ai-engine", "social_copy_generator.py"), JSON.stringify(payload)],
      { cwd: backendRoot },
      (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }

        try {
          resolve(JSON.parse(stdout));
        } catch (parseError) {
          resolve(null);
        }
      }
    );
  });
}

async function markVideoFailed(videoId, reason) {
  await Video.findByIdAndUpdate(videoId, {
    status: "failed",
    failureReason: reason,
  });
}

async function processVideo(videoId, fileName, settings) {
  try {
    const settingsArg = JSON.stringify(settings);
    await runPythonScript("preprocess.py", [path.join("uploads", fileName), settingsArg]);
    const metadata = readMetadata();

    if (metadata.duration && metadata.duration > MAX_VIDEO_SECONDS) {
      throw new Error("Video exceeds the 15 minute project limit.");
    }

    await Video.findByIdAndUpdate(videoId, {
      transcript: readTranscript(),
      transcriptEnglish: metadata.transcript_english || readTranscript(),
      sourceLanguage: metadata.source_language || "unknown",
      analysisLanguage: metadata.analysis_language || "english",
      duration: metadata.duration || 0,
      status: "detecting_highlights",
      failureReason: "",
    });

    const highlightRun = await runPythonScript("highlight_detector.py", [path.join("uploads", fileName), settingsArg]);
    const highlightResult = JSON.parse(highlightRun.stdout);
    const transcriptEnglish = metadata.transcript_english || readTranscript();
    const contentInsights = buildContentInsights({
      transcriptEnglish,
      settings,
      highlights: highlightResult.highlights || [],
      trailers: highlightResult.trailers || [],
      sourceLanguage: metadata.source_language,
    });
    const thumbnailMoment = pickThumbnailMoment(contentInsights.reelMoments || highlightResult.highlights || []);
    const thumbnailTitle = buildTopicTitle({
      transcriptEnglish,
      originalName: fileName,
      highlights: contentInsights.reelMoments || highlightResult.highlights || [],
    });
    const viralAnalysis = buildViralAnalysis({
      reelMoments: contentInsights.reelMoments,
      settings,
      transcriptEnglish,
    });
    const trendContext = await getYouTubeTrendContext({ transcriptEnglish, settings });
    const refinedSocialCopy = await rewriteSocialCopy({
      platform: settings.platform,
      source_language: metadata.source_language || "unknown",
      dominant_emotion: contentInsights.dominantEmotion,
      creator_goal: contentInsights.creatorGoal,
      audience: contentInsights.audience,
      tone: contentInsights.tone,
      personalization_angle: contentInsights.personalizationAngle,
      retention_pattern: contentInsights.retentionPattern,
      thumbnail_title: thumbnailTitle,
      thumbnail_sticker: contentInsights.thumbnailSticker,
      reel_summary: contentInsights.reelSummary,
      trend_context: trendContext,
      reel_moments: contentInsights.reelMoments,
      captions: contentInsights.captionSuggestions,
      hashtags: contentInsights.hashtags,
      viral_reasons: viralAnalysis.reasons,
    });
    const finalThumbnailTitle = refinedSocialCopy?.thumbnail_title || thumbnailTitle;
    const finalThumbnailSticker = refinedSocialCopy?.thumbnail_sticker || contentInsights.thumbnailSticker;
    const finalCaptions = refinedSocialCopy?.captions?.length ? refinedSocialCopy.captions : contentInsights.captionSuggestions;
    const specificHashtags = buildContentSpecificHashtags(transcriptEnglish, settings);
    const finalHashtags = [
      ...new Set([
        ...specificHashtags,
        ...(trendContext?.trendTags || []),
        ...(refinedSocialCopy?.hashtags || []),
        ...contentInsights.hashtags,
      ]),
    ].slice(0, 10);
    const finalViralReasons = refinedSocialCopy?.viral_reasons?.length ? refinedSocialCopy.viral_reasons : viralAnalysis.reasons;
    const thumbnailConcept = buildThumbnailConcept({
      title: finalThumbnailTitle,
      sticker: finalThumbnailSticker,
      profile: getPersonalizationProfile(settings),
      dominantEmotion: contentInsights.dominantEmotion,
    });

    await Video.findByIdAndUpdate(videoId, {
      highlights: highlightResult.highlights || [],
      trailers: highlightResult.trailers || [],
      duration: highlightResult.duration || 0,
      captionSuggestions: finalCaptions,
      hashtags: finalHashtags,
      contentInsights: {
        dominantEmotion: contentInsights.dominantEmotion,
        hookLine: contentInsights.hookLine,
        middleLine: contentInsights.middleLine,
        endingLine: contentInsights.endingLine,
        reelSummary: contentInsights.reelSummary,
        thumbnailSticker: finalThumbnailSticker,
        viralReasons: finalViralReasons,
        audience: contentInsights.audience,
        creatorGoal: contentInsights.creatorGoal,
        tone: contentInsights.tone,
        personalizationAngle: contentInsights.personalizationAngle,
        retentionPattern: contentInsights.retentionPattern,
        thumbnailConcept,
      },
      viralScore: viralAnalysis.score,
      status: "generating_clips",
    });

    const clipResult = await runClipGeneration(fileName, { ...highlightResult, options: settings });
    const existingVideo = await Video.findById(videoId);
    const thumbnail = existingVideo?.thumbnail?.source === "custom" && existingVideo.thumbnail.url
      ? {
          path: existingVideo.thumbnail.path,
          url: existingVideo.thumbnail.url,
          title: finalThumbnailTitle,
          source: "custom",
        }
      : await generateThumbnail(fileName, thumbnailMoment, finalThumbnailTitle, finalThumbnailSticker, settings);
    const clips = (clipResult.clips || []).map((clipPath) => ({
      path: clipPath,
      url: clipUrlForPath(clipPath),
    }));

    await Video.findByIdAndUpdate(videoId, {
      clips,
      thumbnail,
      status: "completed",
    });
  } catch (error) {
    console.error("Video processing error:", error);
    await markVideoFailed(videoId, error.message || "Processing failed.");
  }
}

exports.uploadVideo = async (req, res) => {
  try {
    const videoFile = req.files?.video?.[0] || req.file;
    const thumbnailFile = req.files?.thumbnail?.[0] || null;

    if (!videoFile) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const { userId } = req.body;
    const settings = parseSettings(req.body);

    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const savedVideo = await Video.create({
      userId,
      filename: videoFile.filename,
      originalName: videoFile.originalname,
      status: "preprocessing",
      transcript: "",
      highlights: [],
      trailers: [],
      clips: [],
      transcriptEnglish: "",
      sourceLanguage: "",
      analysisLanguage: "",
      settings,
      captionSuggestions: [],
      hashtags: [],
      contentInsights: {},
      thumbnail: thumbnailFile
        ? {
            path: thumbnailFile.path,
            url: uploadUrlForFile(thumbnailFile.filename),
            title: "",
            source: "custom",
          }
        : {},
      viralScore: 0,
      failureReason: "",
    });

    processVideo(savedVideo._id, videoFile.filename, settings);

    return res.status(201).json({
      message: "Video uploaded and processing started.",
      video: serializeVideo(savedVideo),
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ message: "Unable to upload video right now." });
  }
};

exports.deleteVideo = async (req, res) => {
  try {
    const { userId } = req.query;
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ message: "Video not found." });
    }

    if (userId && String(video.userId) !== String(userId)) {
      return res.status(403).json({ message: "You cannot delete this video." });
    }

    safeUnlink(path.join(backendRoot, "uploads", video.filename));
    safeUnlink(video.thumbnail?.path);
    (video.clips || []).forEach((clip) => safeUnlink(clip.path));

    await Video.findByIdAndDelete(video._id);

    return res.json({ message: "Video deleted." });
  } catch (error) {
    console.error("Delete video error:", error);
    return res.status(500).json({ message: "Unable to delete video right now." });
  }
};

exports.listVideos = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const videos = await Video.find({ userId }).sort({ createdAt: -1 });
    return res.json({ videos: videos.map(serializeVideo) });
  } catch (error) {
    console.error("List videos error:", error);
    return res.status(500).json({ message: "Unable to fetch videos." });
  }
};

exports.getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ message: "Video not found." });
    }

    return res.json({ video: serializeVideo(video) });
  } catch (error) {
    console.error("Get video error:", error);
    return res.status(500).json({ message: "Error fetching video." });
  }
};
