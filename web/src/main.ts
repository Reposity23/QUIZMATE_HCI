import "./styles.css";
import { Difficulty, generateQuiz, QuizType } from "./api";
import { renderDebug } from "./debug";
import { highlightCodeBlocks } from "./renderQuiz";
import { scoreQuiz } from "./scoring";
import { formatDuration } from "./timer";
import { renderRichText } from "./latex";

const app = document.querySelector<HTMLDivElement>("#app")!;

type ThemeMode = "nebula" | "sunrise" | "emerald" | "midnight";
type FontMode = "inter" | "poppins" | "space" | "lora";
type ColorCombo = "violet" | "ocean" | "sunset" | "forest";

type UiPreferences = {
  theme: ThemeMode;
  font: FontMode;
  colorCombo: ColorCombo;
  animations: boolean;
  cardStyle: "glass" | "solid";
};

let files: File[] = [];
let quiz: any = null;
let answers: Record<string, any> = {};
let startedAt = 0;
let debugPayload: any = {};
let raw = "";
let details = "";
let currentQuestionIndex = 0;
let isGenerating = false;
let isFinished = false;
const defaultUiPreferences: UiPreferences = {
  theme: "nebula",
  font: "inter",
  colorCombo: "violet",
  animations: true,
  cardStyle: "glass",
};
let uiPreferences: UiPreferences = loadUiPreferences();

function loadUiPreferences(): UiPreferences {
  try {
    const rawPrefs = localStorage.getItem("quizforge-ui-preferences");
    if (!rawPrefs) return defaultUiPreferences;
    return { ...defaultUiPreferences, ...JSON.parse(rawPrefs) };
  } catch {
    return defaultUiPreferences;
  }
}

function applyUiPreferences() {
  document.body.dataset.theme = uiPreferences.theme;
  document.body.dataset.font = uiPreferences.font;
  document.body.dataset.combo = uiPreferences.colorCombo;
  document.body.dataset.animations = uiPreferences.animations ? "on" : "off";
  document.body.dataset.card = uiPreferences.cardStyle;
}

function saveUiPreferences() {
  localStorage.setItem("quizforge-ui-preferences", JSON.stringify(uiPreferences));
  applyUiPreferences();
}

function addFiles(incoming: File[]) {
  const next = [...files, ...incoming];
  if (next.length > 10) return alert("Maximum 10 files allowed.");
  const tooLarge = next.find((f) => f.size > 20 * 1024 * 1024);
  if (tooLarge) return alert(`${tooLarge.name} exceeds 20MB.`);
  files = next;
  render();
}

function renderApp() {
  if (isGenerating) {
    app.innerHTML = `<div class="loading-overlay">
      <div class="spinner spinner-advanced"></div>
      <h2 class="animate-pulse">Crafting Your Intelligence...</h2>
      <p class="fade-in" style="color: var(--text-muted)">We're processing your documents into interactive challenges • validating schema • preparing adaptive question set</p>
      <div class="loading-dots" aria-hidden="true"><span></span><span></span><span></span></div>
    </div>`;
    return;
  }

  if (isFinished) {
    app.innerHTML = `<main><h1>Performance Report</h1>${scoreView()}</main>`;
    bindScore();
    return;
  }

  app.innerHTML = `<main><h1>QuizForge</h1>${quiz ? quizView() : setupView()}</main>`;
  if (!quiz && !isFinished) {
    bindSetup();
  } else if (quiz) {
    bindQuiz();
  }
  highlightCodeBlocks(app);
}



function render() {
  try {
    renderApp();
  } catch (error) {
    console.error("Render failed", error);
    app.innerHTML = `
      <main>
        <section class="card glass fatal-card">
          <h2>UI failed to render</h2>
          <p style="color: var(--text-muted)">Please refresh the page. If this persists, open browser console and share the error.</p>
          <button id="fatalReload" class="btn-primary-gradient">Reload</button>
        </section>
      </main>
    `;
    document.getElementById("fatalReload")?.addEventListener("click", () => window.location.reload());
  }
}
function setupView() {
  return `
    <div class="ambient-layer" aria-hidden="true">
      <span class="orb orb-1"></span>
      <span class="orb orb-2"></span>
      <span class="orb orb-3"></span>
    </div>
    <div class="hero-section fade-in">
      <div class="hero-mascot" aria-hidden="true">🤖</div>
      <p>Transform any document into a high-quality quiz using xAI Grok</p>
      <div class="status-ribbon"><span>⚡ Fast build</span><span>🧠 Smart prompts</span><span>🎯 High accuracy</span><span>♿ Accessible UI</span></div>
      <div class="hero-pills">
        <span>Smart transitions</span><span>Visual feedback</span><span>Accessibility-first</span><span>Trophy milestones 🏆</span>
      </div>
      <div class="hero-stats">
        <div><strong>10</strong><small>Max files</small></div>
        <div><strong>100</strong><small>Max questions</small></div>
        <div><strong>AI</strong><small>Auto-graded</small></div>
      </div>
    </div>
    <section class="card glass">
      <h2>1) Upload Learning Material</h2>
      <div id="dropZone" class="drop-zone">
        <div class="upload-icon">↑</div>
        <p>Drag & drop or click to browse</p>
        <span style="font-size: 0.8rem; color: var(--text-muted)">PDF, DOCX, TXT (Max 20MB)</span>
        <div class="upload-file-tags"><span>.pdf</span><span>.docx</span><span>.txt</span><span>.pptx</span><span>.md</span></div>
      </div>
      <input id="fileInput" type="file" multiple style="display:none" />
      <ul class="file-list">${files.map((f) => `<li class="fade-in"><span>${f.name}</span><span style="color:var(--text-muted)">${(f.size / 1024 / 1024).toFixed(2)} MB</span></li>`).join("")}</ul>
      ${files.length ? `<button id="clearFiles" class="btn-secondary" style="width:100%">Clear Files</button>` : ""}
    </section>
    ${improvementsView()}
    ${files.length ? optionsView() : ""}
    ${settingsView()}
    <footer class="app-footer">Built for focused study sessions • Theme-aware • Keyboard friendly</footer>
    <div class="debug-container">${renderDebug(debugPayload, raw, details)}</div>
  `;
}

function settingsView() {
  return `
    <section class="card fade-in settings-panel">
      <h2>3) Interface Studio</h2>
      <p class="settings-subtitle">Fine-tune theme, font, colors, and animation intensity without changing quiz logic.</p>
      <div class="settings-grid">
        <div class="input-group">
          <label for="themeMode">Theme</label>
          <select id="themeMode">
            <option value="nebula" ${uiPreferences.theme === "nebula" ? "selected" : ""}>Nebula</option>
            <option value="sunrise" ${uiPreferences.theme === "sunrise" ? "selected" : ""}>Sunrise</option>
            <option value="emerald" ${uiPreferences.theme === "emerald" ? "selected" : ""}>Emerald</option>
            <option value="midnight" ${uiPreferences.theme === "midnight" ? "selected" : ""}>Midnight</option>
          </select>
        </div>
        <div class="input-group">
          <label for="fontMode">Font</label>
          <select id="fontMode">
            <option value="inter" ${uiPreferences.font === "inter" ? "selected" : ""}>Inter</option>
            <option value="poppins" ${uiPreferences.font === "poppins" ? "selected" : ""}>Poppins</option>
            <option value="space" ${uiPreferences.font === "space" ? "selected" : ""}>Space Grotesk</option>
            <option value="lora" ${uiPreferences.font === "lora" ? "selected" : ""}>Lora</option>
          </select>
        </div>
        <div class="input-group">
          <label for="colorCombo">Color Combination</label>
          <select id="colorCombo">
            <option value="violet" ${uiPreferences.colorCombo === "violet" ? "selected" : ""}>Violet Pop</option>
            <option value="ocean" ${uiPreferences.colorCombo === "ocean" ? "selected" : ""}>Ocean Breeze</option>
            <option value="sunset" ${uiPreferences.colorCombo === "sunset" ? "selected" : ""}>Sunset Glow</option>
            <option value="forest" ${uiPreferences.colorCombo === "forest" ? "selected" : ""}>Forest Mint</option>
          </select>
        </div>
        <div class="input-group">
          <label for="cardStyle">Card style</label>
          <select id="cardStyle">
            <option value="glass" ${uiPreferences.cardStyle === "glass" ? "selected" : ""}>Glass</option>
            <option value="solid" ${uiPreferences.cardStyle === "solid" ? "selected" : ""}>Solid</option>
          </select>
        </div>
      </div>
      <label class="toggle-row" for="animationsToggle">
        <span>Enable advanced animations</span>
        <input id="animationsToggle" type="checkbox" ${uiPreferences.animations ? "checked" : ""} />
      </label>
      <div class="preview-strip" aria-hidden="true">
        <span class="chip">✨ Smooth transitions</span>
        <span class="chip">🎨 Dynamic palettes</span>
        <span class="chip">📚 Typography presets</span>
        <span class="chip">🏆 Trophy-grade finish</span>
      </div>
    </section>
  `;
}

function optionsView() {
  return `
    <section class="card glass fade-in">
      <h2>2) Customize Your Experience</h2>
      <p class="settings-subtitle">Set strategy, count and difficulty before generation.</p>
      <div class="options-grid">
        <div class="input-group">
          <label for="quizType">Quiz Strategy</label>
          <select id="quizType">
            <option value="mcq">Multiple Choice</option>
            <option value="fill_blank">Fill in the Blank</option>
            <option value="identification">Identification</option>
            <option value="matching">Matching</option>
            <option value="mixed">Mixed Strategy</option>
          </select>
        </div>

        <div class="input-group">
          <label>Question Quantity</label>
          <div class="count-btns">
            ${[5, 10, 20, 30].map((n) => `<button type="button" class="count-btn ${n === 10 ? "active" : ""}" data-count="${n}">${n}</button>`).join("")}
          </div>
          <input id="customCount" type="number" min="1" max="100" value="10" placeholder="Custom (max 100)"/>
        </div>

        <div class="input-group">
          <label for="difficulty">Cognitive Load</label>
          <select id="difficulty">
            <option value="">Balanced</option>
            <option value="easy">Introductory (Easy)</option>
            <option value="medium">Intermediate (Medium)</option>
            <option value="hard">Advanced (Hard)</option>
          </select>
        </div>
      </div>
      <button id="generateBtn" class="btn-primary-gradient" style="width:100%; padding:18px; margin-top:10px">Initialize Generation</button>
    </section>
  `;
}

function quizView() {
  const q = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  let qHtml = "";
  if (q.type === "mcq") {
    qHtml = q.choices.map((c: string, i: number) => `
      <label class="choice-label ${Number(answers[q.id]) === i ? "selected" : ""}">
        <input type="radio" name="${q.id}" data-qid="${q.id}" value="${i}" ${Number(answers[q.id]) === i ? "checked" : ""}/>
        <span class="choice-index">${String.fromCharCode(65 + i)}</span>
        <div class="choice-text">${renderRichText(c)}</div>
      </label>
    `).join("");
  } else if (q.type === "matching") {
    const rights = q.pairs.map((p: any) => p.right);
    qHtml = q.pairs.map((p: any, i: number) => `
      <div class="match-row glass">
        <span class="match-left">${renderRichText(p.left)}</span>
        <select data-qid="${q.id}" data-pair="${i}">
          <option value="">Choose matching item...</option>
          ${rights.map((r: string) => `<option ${answers[q.id]?.[i] === r ? "selected" : ""}>${r}</option>`).join("")}
        </select>
      </div>
    `).join("");
  } else {
    qHtml = `<input type="text" data-qid="${q.id}" value="${answers[q.id] || ""}" class="text-answer-input" placeholder="Enter your response here..."/>`;
  }

  return `
    <div class="quiz-container">
      <div class="q-progress"><div class="q-progress-bar" style="width:${progress}%"></div></div>
      <div class="q-header">
        <span class="q-badge">Question ${currentQuestionIndex + 1} / ${quiz.questions.length}</span>
        <span class="q-type-badge">${q.type.toUpperCase()}</span>
      </div>
      <div class="q-meta">
        <span class="meta-pill">${answers[q.id] !== undefined && answers[q.id] !== "" ? "Answered" : "Unanswered"}</span>
        <span class="meta-pill">Progress ${Math.round(progress)}%</span>
      </div>
      <section class="card question-card glass">
        <div class="question-prompt">${renderRichText(q.prompt)}</div>
        <div class="question-body animate-in">${qHtml}</div>
        <div class="actions">
          <button id="prevQ" class="btn-secondary" ${currentQuestionIndex === 0 ? "disabled" : ""}>Back</button>
          ${currentQuestionIndex === quiz.questions.length - 1
            ? `<button id="submitQuiz" class="btn-success">Finalize & Submit</button>`
            : `<button id="nextQ" class="btn-primary">Continue</button>`
          }
        </div>
        <p class="question-hint">Tip: You can navigate questions in any order before final submission.</p>
      </section>
    </div>
  `;
}

function scoreView() {
  const score = scoreQuiz(quiz, answers);
  const color = score.percent >= 80 ? "var(--success)" : score.percent >= 50 ? "var(--warning)" : "var(--accent)";

  return `
    <div class="results-container">
      <section class="card glass fade-in score-card" style="text-align:center">
        <div class="trophy-banner" aria-hidden="true">🏆 Achievement Unlocked</div>
        <div class="score-display">
          <svg class="progress-ring" width="200" height="200">
            <circle class="progress-ring__circle-bg" stroke="#1e293b" stroke-width="12" fill="transparent" r="85" cx="100" cy="100"/>
            <circle class="progress-ring__circle" stroke="${color}" stroke-width="12" stroke-dasharray="534.07" stroke-dashoffset="${534.07 - (534.07 * score.percent) / 100}" fill="transparent" r="85" cx="100" cy="100"/>
          </svg>
          <div class="score-text">
            <span class="score-percent">${Math.round(score.percent)}%</span>
            <span class="score-fraction">${score.earned} / ${score.possible}</span>
          </div>
        </div>
        <div class="score-meta-grid">
          <div class="meta-item">
            <span class="meta-label">Duration</span>
            <span class="meta-value">${formatDuration(Date.now() - startedAt)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Accuracy</span>
            <span class="meta-value">${Math.round(score.percent)}%</span>
          </div>
        </div>
        <div class="result-actions">
          <button id="restartBtn" class="btn-primary-gradient" style="flex:1">New Quiz</button>
          <button id="reviewBtn" class="btn-secondary" style="flex:1">Detailed Review</button>
        </div>
      </section>
      <div id="reviewSection" class="review-list" style="display:none">
         <h2 style="text-align:center; margin-top:2rem">Detailed Breakdown</h2>
         ${quiz.questions.map((q: any, i: number) => {
           const res = score.perQuestion.find((p: any) => p.id === q.id);
           return `
             <div class="card glass result-card ${res.correct ? "correct-border" : "wrong-border"} fade-in">
               <div class="result-header">
                 <span class="q-number">Q${i + 1}</span>
                 <span class="result-badge ${res.correct ? "bg-success" : "bg-danger"}">
                   ${res.correct ? "✓ Validated" : "✗ Needs Review"}
                 </span>
               </div>
               <div class="result-prompt">${renderRichText(q.prompt)}</div>
               <div class="explanation-box">
                 <span class="exp-label">EXPLANATION</span>
                 <p>${q.explanation}</p>
               </div>
             </div>
           `;
         }).join("")}
      </div>
    </div>
  `;
}

function bindSetup() {
  const drop = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput") as HTMLInputElement;

  drop?.addEventListener("click", () => fileInput?.click());
  drop?.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("drag-over"); });
  drop?.addEventListener("dragleave", () => drop.classList.remove("drag-over"));
  drop?.addEventListener("drop", (e) => { e.preventDefault(); drop.classList.remove("drag-over"); addFiles(Array.from(e.dataTransfer?.files || [])); });

  fileInput?.addEventListener("change", () => addFiles(Array.from(fileInput.files || [])));

  document.getElementById("clearFiles")?.addEventListener("click", () => { files = []; render(); });

  document.querySelectorAll(".count-btn").forEach((btn) => btn.addEventListener("click", () => {
    const val = btn.getAttribute("data-count") || "10";
    const customInput = document.getElementById("customCount") as HTMLInputElement;
    if (customInput) customInput.value = val;
    document.querySelectorAll(".count-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  }));

  document.getElementById("generateBtn")?.addEventListener("click", async () => {
    const quizTypeEl = document.getElementById("quizType") as HTMLSelectElement;
    const customCountEl = document.getElementById("customCount") as HTMLInputElement;
    const difficultyEl = document.getElementById("difficulty") as HTMLSelectElement;

    if (!quizTypeEl || !customCountEl || !difficultyEl) {
      console.error("Required elements not found in DOM");
      return;
    }

    isGenerating = true;
    render();
    try {
      const sanitizedQuestionCount = Math.min(100, Math.max(1, Number(customCountEl.value || 10)));
      customCountEl.value = String(sanitizedQuestionCount);

      const result = await generateQuiz({
        files,
        quizType: quizTypeEl.value as QuizType,
        questionCount: sanitizedQuestionCount,
        difficulty: difficultyEl.value as Difficulty,
      });
      debugPayload = result.debug || {};
      raw = result.raw || "";
      details = result.details || "";
      if (!result.ok) {
        throw new Error(result.error || "Generation failed");
      }
      quiz = result.quiz;
      answers = {};
      startedAt = Date.now();
      currentQuestionIndex = 0;
    } catch (err: any) {
      alert(err.message);
    } finally {
      isGenerating = false;
      render();
    }
  });

  const themeMode = document.getElementById("themeMode") as HTMLSelectElement | null;
  const fontMode = document.getElementById("fontMode") as HTMLSelectElement | null;
  const colorCombo = document.getElementById("colorCombo") as HTMLSelectElement | null;
  const cardStyle = document.getElementById("cardStyle") as HTMLSelectElement | null;
  const animationsToggle = document.getElementById("animationsToggle") as HTMLInputElement | null;

  themeMode?.addEventListener("change", () => {
    uiPreferences.theme = themeMode.value as ThemeMode;
    saveUiPreferences();
  });
  fontMode?.addEventListener("change", () => {
    uiPreferences.font = fontMode.value as FontMode;
    saveUiPreferences();
  });
  colorCombo?.addEventListener("change", () => {
    uiPreferences.colorCombo = colorCombo.value as ColorCombo;
    saveUiPreferences();
  });
  cardStyle?.addEventListener("change", () => {
    uiPreferences.cardStyle = cardStyle.value as UiPreferences["cardStyle"];
    saveUiPreferences();
  });
  animationsToggle?.addEventListener("change", () => {
    uiPreferences.animations = animationsToggle.checked;
    saveUiPreferences();
  });
}

function bindQuiz() {
  if (!quiz) return;
  app.querySelectorAll("input[type='radio']").forEach((el) => el.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement;
    answers[t.dataset.qid!] = Number(t.value);
    render();
  }));
  app.querySelectorAll("input[type='text']").forEach((el) => el.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement;
    answers[t.dataset.qid!] = t.value;
  }));
  app.querySelectorAll("select[data-qid]").forEach((el) => el.addEventListener("change", (e) => {
    const t = e.target as HTMLSelectElement;
    const qid = t.dataset.qid!;
    const idx = Number(t.dataset.pair!);
    answers[qid] = answers[qid] || {};
    answers[qid][idx] = t.value;
  }));

  document.getElementById("prevQ")?.addEventListener("click", () => { if (currentQuestionIndex > 0) { currentQuestionIndex--; render(); } });
  document.getElementById("nextQ")?.addEventListener("click", () => { if (currentQuestionIndex < quiz.questions.length - 1) { currentQuestionIndex++; render(); } });
  document.getElementById("submitQuiz")?.addEventListener("click", () => { isFinished = true; render(); });
}

function bindScore() {
  document.getElementById("restartBtn")?.addEventListener("click", () => {
    quiz = null;
    answers = {};
    isFinished = false;
    files = [];
    currentQuestionIndex = 0;
    render();
  });
  document.getElementById("reviewBtn")?.addEventListener("click", () => {
    const section = document.getElementById("reviewSection")!;
    section.style.display = section.style.display === "none" ? "block" : "none";
    if (section.style.display === "block") {
      section.scrollIntoView({ behavior: "smooth" });
    }
  });
}

applyUiPreferences();
render();
