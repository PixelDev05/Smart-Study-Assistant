// azureService.js
// Handles communication with Azure AI Document Intelligence

const axios = require("axios");
const { cleanExtractedText } = require("./utils");

/**
 * Sends a PDF buffer to Azure Document Intelligence and returns extracted text.
 * Tries multiple API versions/paths to handle different resource configurations.
 */
async function extractTextFromPdf(pdfBuffer) {
  const endpoint = process.env.AZURE_ENDPOINT.replace(/\/$/, "");
  const apiKey = process.env.AZURE_KEY;

  if (!endpoint || !apiKey) {
    throw new Error("Azure credentials missing. Check AZURE_ENDPOINT and AZURE_KEY in .env");
  }

  // Try these API URLs in order until one works
  const candidateUrls = [
    `${endpoint}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2023-07-31`,
    `${endpoint}/formrecognizer/documentModels/prebuilt-read:analyze?api-version=2022-08-31`,
    `${endpoint}/formrecognizer/v2.1/layout/analyze`,
    `${endpoint}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-02-29-preview`,
  ];

  let operationUrl = null;
  let lastError = null;

  for (const url of candidateUrls) {
    try {
      console.log(`Trying: ${url}`);
      const response = await axios.post(url, pdfBuffer, {
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
          "Content-Type": "application/pdf",
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      operationUrl = response.headers["operation-location"];
      if (operationUrl) {
        console.log("Azure accepted the request. Polling for result...");
        break;
      }
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error?.message || err.message;
      console.log(`Failed (${status}): ${msg}`);
      lastError = err;
      // 404 means wrong path — try the next one
      // Any other error (401, 403, 400) means credentials or request issue — stop
      if (status !== 404) {
        throw new Error(`Azure error (${status}): ${msg}`);
      }
    }
  }

  if (!operationUrl) {
    throw new Error(
      `Could not reach Azure Document Intelligence. ` +
      `Please verify your AZURE_ENDPOINT and AZURE_KEY in .env. ` +
      `Last error: ${lastError?.response?.data?.error?.message || lastError?.message}`
    );
  }

  return await pollForResult(operationUrl, apiKey);
}

/**
 * Polls the Azure operation URL until analysis completes.
 */
async function pollForResult(operationUrl, apiKey, maxRetries = 20, delay = 3000) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    await sleep(delay);

    const response = await axios.get(operationUrl, {
      headers: { "Ocp-Apim-Subscription-Key": apiKey },
    });

    const result = response.data;
    const status = result.status;

    console.log(`Poll attempt ${attempt + 1}: ${status}`);

    if (status === "succeeded") {
      return parseAzureResult(result);
    }

    if (status === "failed") {
      const errMsg = result.error?.message || "Unknown Azure analysis error.";
      throw new Error(`Azure analysis failed: ${errMsg}`);
    }
  }

  throw new Error("Azure analysis timed out. Try a smaller PDF.");
}

/**
 * Parses the Azure result — handles both old and new API response formats.
 */
function parseAzureResult(result) {
  // New API format (2022-08-31 and later)
  if (result.analyzeResult?.pages) {
    const lines = result.analyzeResult.pages
      .flatMap((p) => (p.lines || []).map((l) => l.content));
    return cleanExtractedText(lines.join("\n"));
  }

  // Older API format (v2.1)
  if (result.analyzeResult?.readResults) {
    const lines = result.analyzeResult.readResults
      .flatMap((page) => (page.lines || []).map((l) => l.text));
    return cleanExtractedText(lines.join("\n"));
  }

  throw new Error("Could not parse Azure response — unexpected format.");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { extractTextFromPdf };