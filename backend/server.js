import "dotenv/config";
import express from "express";
import cors from "cors";
import { solveDoubt, simplifyAnswer } from "./geminiService.js";

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // allow no-origin requests (e.g. curl, server-to-server health checks)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
  })
);
app.use(express.json({ limit: "10mb" })); // images as base64 can be sizeable

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Solve a batch of doubts in one "Explain Session".
// Body: { doubts: [{ id, type: "text"|"image", content, mimeType? }] }
app.post("/api/solve", async (req, res) => {
  const { doubts } = req.body;

  if (!Array.isArray(doubts) || doubts.length === 0) {
    return res.status(400).json({ error: "Provide a non-empty 'doubts' array." });
  }

  try {
    // Solve sequentially to stay well within free-tier rate limits.
    const results = [];
    for (const doubt of doubts) {
      try {
        const { answer, subject } = await solveDoubt(doubt);
        results.push({ id: doubt.id, answer, subject, status: "solved" });
      } catch (err) {
        console.error(`Failed to solve doubt ${doubt.id}:`, err.message);
        results.push({
          id: doubt.id,
          status: "error",
          error: "Could not solve this doubt right now. Please try again.",
        });
      }
    }
    res.json({ results });
  } catch (err) {
    console.error("Unexpected /api/solve failure:", err);
    res.status(500).json({ error: "Something went wrong solving your doubts." });
  }
});

// Simplify one already-solved doubt.
// Body: { doubtText: "...", answer: "..." }
app.post("/api/simplify", async (req, res) => {
  const { doubtText, answer } = req.body;

  if (!doubtText || !answer) {
    return res.status(400).json({ error: "Provide both 'doubtText' and 'answer'." });
  }

  try {
    const simplified = await simplifyAnswer(doubtText, answer);
    res.json({ simplified });
  } catch (err) {
    console.error("Failed to simplify answer:", err.message);
    res.status(500).json({ error: "Could not simplify this answer right now." });
  }
});

app.listen(PORT, () => {
  console.log(`LastMile backend running on http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn("Reminder: set GEMINI_API_KEY in backend/.env before testing /api/solve");
  }
});
