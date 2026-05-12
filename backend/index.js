const express = require("express");
const cors = require("cors");
const path = require("path");
const { spawnSync } = require("child_process");
const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = require("./config/db");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
app.use(express.json());

connectDB();

app.get("/", (req, res) => {
  res.send("MongoDB Backend Running...");
});

app.get("/api/health", (req, res) => {
  const ffmpegCheck = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  const pythonCheck = spawnSync("python", ["--version"], { encoding: "utf8" });

  res.json({
    status: "ok",
    services: {
      database: mongoose.connection.readyState === 1,
      ffmpeg: ffmpegCheck.status === 0,
      python: pythonCheck.status === 0,
      groqConfigured: Boolean(process.env.GROQ_KEY),
      uploadsDir: true,
      generatedDir: true,
    },
    versions: {
      python: (pythonCheck.stdout || pythonCheck.stderr || "").trim(),
      ffmpeg: ffmpegCheck.status === 0 ? "available" : "missing",
    }
  });
});

const authRoutes = require("./routes/authRoutes");
const videoRoutes = require("./routes/videoRoutes");
app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/generated", express.static(path.join(__dirname, "ai-engine", "clips")));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
