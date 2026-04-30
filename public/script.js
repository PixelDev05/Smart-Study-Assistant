// script.js
// Smart Study Assistant — Frontend Logic

// ── Element refs ─────────────────────────────────────────────────────────────
const dropZone   = document.getElementById('dropZone');
const fileInput  = document.getElementById('fileInput');
const fileBadge  = document.getElementById('fileBadge');
const fileName   = document.getElementById('fileName');
const removeFile = document.getElementById('removeFile');
const analyzeBtn = document.getElementById('analyzeBtn');
const errorBox   = document.getElementById('errorBox');
const errorMsg   = document.getElementById('errorMsg');

const uploadCard  = document.getElementById('uploadCard');
const loadingCard = document.getElementById('loadingCard');
const results     = document.getElementById('results');
const resetBtn    = document.getElementById('resetBtn');

// Result elements
const resultsFileName = document.getElementById('resultsFileName');
const summaryText     = document.getElementById('summaryText');
const topicsGrid      = document.getElementById('topicsGrid');
const quizList        = document.getElementById('quizList');

// Loading step elements
const steps = [
  document.getElementById('step1'),
  document.getElementById('step2'),
  document.getElementById('step3'),
  document.getElementById('step4'),
];

// ── State ─────────────────────────────────────────────────────────────────────
let selectedFile = null;
let stepInterval = null;

// ── File selection ─────────────────────────────────────────────────────────────

// Open file picker on click
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') fileInput.click();
});

// Handle file picker selection
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) handleFileSelect(e.target.files[0]);
});

// Drag-and-drop events
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFileSelect(file);
});

// Remove selected file
removeFile.addEventListener('click', (e) => {
  e.stopPropagation();
  clearFile();
});

/**
 * Validates and sets the selected file.
 * @param {File} file
 */
function handleFileSelect(file) {
  // Validate type
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    showError('Please upload a PDF file.');
    return;
  }

  // Validate size (10 MB)
  if (file.size > 10 * 1024 * 1024) {
    showError('File is too large. Maximum size is 10 MB.');
    return;
  }

  hideError();
  selectedFile = file;

  // Show file badge
  fileName.textContent = file.name;
  fileBadge.classList.remove('hidden');
  analyzeBtn.disabled = false;
}

/** Clears the selected file and resets the UI. */
function clearFile() {
  selectedFile = null;
  fileInput.value = '';
  fileBadge.classList.add('hidden');
  analyzeBtn.disabled = true;
  hideError();
}

// ── Analysis ───────────────────────────────────────────────────────────────────

analyzeBtn.addEventListener('click', startAnalysis);

async function startAnalysis() {
  if (!selectedFile) return;

  hideError();
  showLoading();
  startStepAnimation();

  const formData = new FormData();
  formData.append('pdf', selectedFile);

  try {
    const response = await fetch('/analyze', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Server error. Please try again.');
    }

    stopStepAnimation();
    renderResults(data);

  } catch (err) {
    stopStepAnimation();
    hideLoading();
    showError(err.message || 'Unexpected error. Please try again.');
  }
}

// ── Loading animation ──────────────────────────────────────────────────────────

/** Shows the loading card and hides the upload card. */
function showLoading() {
  uploadCard.classList.add('hidden');
  loadingCard.classList.remove('hidden');
  results.classList.add('hidden');
  resetSteps();
}

/** Hides the loading card and shows the upload card again. */
function hideLoading() {
  loadingCard.classList.add('hidden');
  uploadCard.classList.remove('hidden');
}

/** Resets all step indicators to inactive. */
function resetSteps() {
  steps.forEach((s) => {
    s.classList.remove('active', 'done');
  });
  steps[0].classList.add('active');
}

/**
 * Cycles through loading steps on a timer to give visual progress feedback.
 * In a real app these would be driven by server-sent events.
 */
function startStepAnimation() {
  let current = 0;
  steps[0].classList.add('active');

  stepInterval = setInterval(() => {
    if (current < steps.length - 1) {
      steps[current].classList.remove('active');
      steps[current].classList.add('done');
      current++;
      steps[current].classList.add('active');
    }
  }, 6000); // advance every 6 seconds
}

function stopStepAnimation() {
  clearInterval(stepInterval);
  stepInterval = null;
  // Mark all steps done
  steps.forEach((s) => {
    s.classList.remove('active');
    s.classList.add('done');
  });
}

// ── Results rendering ──────────────────────────────────────────────────────────

/**
 * Populates and shows the results section.
 * @param {{ fileName: string, summary: string, topics: string[], questions: string[] }} data
 */
function renderResults(data) {
  loadingCard.classList.add('hidden');

  // File name
  resultsFileName.textContent = data.fileName || 'Study Material';

  // Summary
  summaryText.textContent = data.summary || 'No summary available.';

  // Topics — render as pills
  topicsGrid.innerHTML = '';
  const topics = Array.isArray(data.topics) ? data.topics : [];
  if (topics.length === 0) {
    topicsGrid.innerHTML = '<span class="topic-pill">No topics extracted</span>';
  } else {
    topics.forEach((topic) => {
      const pill = document.createElement('span');
      pill.className = 'topic-pill';
      pill.textContent = topic;
      topicsGrid.appendChild(pill);
    });
  }

  // Quiz questions — render as numbered list items
  quizList.innerHTML = '';
  const questions = Array.isArray(data.questions) ? data.questions : [];
  if (questions.length === 0) {
    quizList.innerHTML = '<li class="quiz-item"><span class="quiz-num">—</span><span>No questions generated.</span></li>';
  } else {
    questions.forEach((q, i) => {
      const li = document.createElement('li');
      li.className = 'quiz-item';
      li.innerHTML = `<span class="quiz-num">${i + 1}</span><span>${escapeHtml(q)}</span>`;
      quizList.appendChild(li);
    });
  }

  results.classList.remove('hidden');
}

// ── Reset ──────────────────────────────────────────────────────────────────────

resetBtn.addEventListener('click', () => {
  results.classList.add('hidden');
  uploadCard.classList.remove('hidden');
  clearFile();
});

// ── Error helpers ──────────────────────────────────────────────────────────────

function showError(msg) {
  errorMsg.textContent = msg;
  errorBox.classList.remove('hidden');
}

function hideError() {
  errorBox.classList.add('hidden');
}

// ── Utility ────────────────────────────────────────────────────────────────────

/** Escapes HTML special characters to prevent XSS in dynamic content. */
function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, (c) => map[c]);
}