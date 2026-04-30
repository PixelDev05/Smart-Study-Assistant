// aiService.js
// AI analysis using Google Gemini API (free tier)

const axios = require("axios");
const { truncateText } = require("./utils");

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/**
 * Analyzes extracted PDF text using Gemini.
 * Returns summary, key topics, and quiz questions in one API call.
 */
async function analyzeText(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing. Add it to your .env file.");

  const safeText = truncateText(text, 3000);

  const prompt = `You are a study assistant. Analyze the following text and respond ONLY with a valid JSON object in this exact format, no extra text:

{
  "summary": "A clear 3-5 sentence summary of the material",
  "topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5", "Topic 6"],
  "questions": [
    "First quiz question?",
    "Second quiz question?",
    "Third quiz question?",
    "Fourth quiz question?",
    "Fifth quiz question?"
  ]
}

Text to analyze:
${safeText}`;

  try {
    const response = await axios.post(
      `${GEMINI_URL}?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 1024,
        },
      },
      { headers: { "Content-Type": "application/json" }, timeout: 30000 }
    );

    // Extract the text from Gemini's response
    const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("Gemini responded successfully.");

    // Parse the JSON from the response
    return parseGeminiResponse(rawText);

  } catch (error) {
    const status = error.response?.status;
    const msg = error.response?.data?.error?.message || error.message;

    if (status === 400) throw new Error("Gemini API error: Invalid request. Check your GEMINI_API_KEY.");
    if (status === 403) throw new Error("Gemini API error: API key invalid or not enabled. Visit aistudio.google.com to get a key.");
    if (status === 429) {
  console.log("Rate limit hit, retrying in 10 seconds...");
  await new Promise((r) => setTimeout(r, 10000));
  return analyzeText(text);
}

    throw new Error(`Gemini API error: ${msg}`);
  }
}

/**
 * Parses Gemini's text response into a structured object.
 * Handles cases where the model wraps JSON in markdown code fences.
 */
function parseGeminiResponse(rawText) {
  // Strip markdown code fences if present: ```json ... ```
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      summary:   typeof parsed.summary === "string" ? parsed.summary : "No summary available.",
      topics:    Array.isArray(parsed.topics)    ? parsed.topics    : ["No topics extracted"],
      questions: Array.isArray(parsed.questions) ? parsed.questions : ["No questions generated"],
    };
  } catch (e) {
    console.error("Failed to parse Gemini JSON response:", cleaned.slice(0, 200));
    // Fallback: return raw text as summary
    return {
      summary:   cleaned.slice(0, 500) || "Could not parse AI response.",
      topics:    ["Could not extract topics"],
      questions: ["Could not generate questions"],
    };
  }
}

module.exports = { analyzeText };
