# 📚 Smart Study Assistant

An AI-powered web app that transforms any PDF into a structured study guide — complete with a summary, key topics, and quiz questions.

---

## ✨ Features

- **Drag-and-drop PDF upload** — clean, modern UI
- **Azure Document Intelligence** — accurate text extraction from PDFs
- **Gemini AI** — free-tier AI for summarization, topic extraction, and quiz generation
- **Beautiful results** — summary paragraph, topic pills, numbered quiz questions

---

## 🛠 Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | HTML, CSS, Vanilla JavaScript     |
| Backend  | Node.js, Express                  |
| PDF OCR  | Azure AI Document Intelligence    |
| AI       | GEMINI AI 2.5 Flash API (free) |

---

## 🚀 Getting Started

### 1. Clone / download the project

```bash
cd smart-study-assistant
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy `.env` and fill in your credentials:

```bash
AZURE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_KEY=your_azure_key

GEMINI_API_KEY=hf_your_key_here

# Optional
PORT=3000
```

### 4. Run the server

```bash
node server/server.js
```

Or with auto-reload:

```bash
npx nodemon server/server.js
```

### 5. Open in browser

```
http://localhost:3000
```

---

## 📁 Project Structure

```
smart-study-assistant/
├── public/
│   ├── index.html        # Frontend markup
│   ├── style.css         # Styles
│   └── script.js         # Frontend logic
├── server/
│   ├── server.js         # Express server & routes
│   ├── azureService.js   # Azure Document Intelligence integration
│   ├── aiService.js      # Hugging Face AI integration
│   └── utils.js          # Text cleaning & validation utilities
├── .env                  # Environment variables (never commit this!)
├── package.json
└── README.md
```
---

## ⚙️ API Reference

### `POST /analyze`

Accepts a multipart form upload with a `pdf` field.

**Response:**

```json
{
  "success": true,
  "fileName": "lecture-notes.pdf",
  "charCount": 4821,
  "summary": "This document covers...",
  "topics": ["Machine Learning", "Neural Networks", "Backpropagation"],
  "questions": [
    "What is the purpose of backpropagation?",
    "..."
  ]
}
```

---

## ⚠️ Notes

- Only **text-based PDFs** work well. Scanned image PDFs require OCR.
- The Hugging Face free tier may be slow on first request (model cold start — up to 20s).
- File size limit: **10 MB**
- Text is truncated to ~3000 characters before sending to the AI model to stay within context limits.
