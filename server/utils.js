// utils.js
// Utility functions for text cleaning and formatting

/**
 * Cleans raw extracted text from Azure Document Intelligence.
 * Removes excessive whitespace, page markers, and noise.
 * @param {string} rawText - The raw text extracted from the PDF
 * @returns {string} - Cleaned, readable text
 */
function cleanExtractedText(rawText) {
  if (!rawText || typeof rawText !== "string") return "";

  let cleaned = rawText
    // Remove null characters and non-printable chars (except newlines/tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Collapse multiple blank lines into at most two
    .replace(/\n{3,}/g, "\n\n")
    // Remove lines that are purely numeric (page numbers)
    .replace(/^\s*\d+\s*$/gm, "")
    // Collapse multiple spaces into one
    .replace(/ {2,}/g, " ")
    // Trim each line
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    // Final trim
    .trim();

  return cleaned;
}

/**
 * Truncates text to a maximum number of characters, ending at a sentence boundary.
 * Used to avoid exceeding AI model context limits.
 * @param {string} text - The text to truncate
 * @param {number} maxChars - Maximum character count (default: 3000)
 * @returns {string} - Truncated text
 */
function truncateText(text, maxChars = 3000) {
  if (!text || text.length <= maxChars) return text;

  const truncated = text.slice(0, maxChars);
  // Try to cut at the last sentence boundary
  const lastPeriod = truncated.lastIndexOf(".");
  return lastPeriod > maxChars * 0.8
    ? truncated.slice(0, lastPeriod + 1)
    : truncated;
}

/**
 * Validates that an uploaded file is a PDF.
 * @param {object} file - Multer file object
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePdfFile(file) {
  if (!file) return { valid: false, error: "No file provided." };

  const isPdf =
    file.mimetype === "application/pdf" ||
    file.originalname.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return { valid: false, error: "Only PDF files are supported." };
  }

  // 10 MB limit
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: "File too large. Maximum size is 10 MB.",
    };
  }

  return { valid: true };
}

module.exports = { cleanExtractedText, truncateText, validatePdfFile };
