// server.js
// Main Express server for Smart Study Assistant

require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");

const { extractTextFromPdf } = require("./azureService");
const { analyzeText } = require("./aiService");
const { validatePdfFile } = require("./utils");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// Serve the frontend from /public
app.use(express.static(path.join(__dirname, "../public")));

// ─── Multer Setup ──────────────────────────────────────────────────────────────
// Store uploads in memory (as Buffer) — no disk I/O needed
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed."), false);
    }
  },
});

// ─── Routes ───────────────────────────────────────────────────────────────────


app.post("/analyze", upload.single("pdf"), async (req, res) => {
  try {
    const validation = validatePdfFile(req.file);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    console.log(`📄 Processing: ${req.file.originalname} (${Math.round(req.file.size / 1024)} KB)`);

    // Step 1: Extract text from PDF using Azure Document Intelligence
    console.log("🔍 Sending to Azure Document Intelligence...");
    const extractedText = await extractTextFromPdf(req.file.buffer);

    if (!extractedText || extractedText.length < 50) {
      return res.status(422).json({
        error: "Could not extract readable text from the PDF. Try a text-based PDF (not a scanned image).",
      });
    }

    console.log(`✅ Extracted ${extractedText.length} characters of text.`);

    // Step 2: Analyze the text with Hugging Face AI
    console.log("🤖 Sending to Hugging Face AI...");
    const analysis = await analyzeText(extractedText);

    console.log("✅ Analysis complete. Sending response.");
    return res.json({
      success: true,
      fileName: req.file.originalname,
      charCount: extractedText.length,
      ...analysis,
    });
  } catch (error) {
    console.error("❌ Error during analysis:", error.message);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred. Please try again.",
    });
  }
});

// ─── Fallback route ────────────────────────────────────────────────────────────
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ─── Multer error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File too large. Maximum size is 10 MB." });
  }
  return res.status(400).json({ error: err.message || "Upload error." });
});

// ─── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Smart Study Assistant running at http://localhost:${PORT}\n`);
});
