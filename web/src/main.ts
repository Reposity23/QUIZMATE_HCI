import "./styles.css";
import { Difficulty, generateQuiz, QuizType } from "./api";
import { renderDebug } from "./debug";
import { highlightCodeBlocks } from "./renderQuiz";
import { scoreQuiz } from "./scoring";
import { formatDuration } from "./timer";
import { renderRichText } from "./latex";

const app = document.querySelector<HTMLDivElement>("#app")!;
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

function addFiles(incoming: File[]) {
  const next = [...files, ...incoming];
  if (next.length > 10) return alert("Maximum 10 files allowed.");
  const tooLarge = next.find((f) => f.size > 20 * 1024 * 1024);
  if (tooLarge) return alert(`${tooLarge.name} exceeds 20MB.`);
  files = next;
  render();
}

function render() {
  if (isGenerating) {
    app.innerHTML = `<div class="loading-overlay">
      <div class="spinner"></div>
      <h2 class="animate-pulse">Crafting Your Intelligence...</h2>
      <p class="fade-in" style="color: var(--text-muted)">We're processing your documents into interactive challenges</p>
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

function setupView() {
  return `
    <div class="hero-section fade-in">
      <p>Transform any document into a high-quality quiz using xAI Grok</p>
    </div>
    <section class="card glass">
      <h2>1) Upload Learning Material</h2>
      <div id="dropZone" class="drop-zone">
        <div class="upload-icon">↑</div>
        <p>Drag & drop or click to browse</p>
        <span style="font-size: 0.8rem; color: var(--text-muted)">PDF, DOCX, TXT (Max 20MB)</span>
      </div>
      <input id="fileInput" type="file" multiple style="display:none" />
      <ul class="file-list">${files.map((f, i) => `<li class="fade-in"><span>${f.name}</span><span style="color:var(--text-muted)">${(f.size / 1024 / 1024).toFixed(2)} MB</span></li>`).join("")}</ul>
      ${files.length ? `<button id="clearFiles" class="btn-secondary" style="width:100%">Clear Files</button>` : ""}
    </section>
    ${files.length ? optionsView() : ""}
    <div class="debug-container">${renderDebug(debugPayload, raw, details)}</div>
  `;
}

function optionsView() {
  return `
    <section class="card glass fade-in">
      <h2>2) Customize Your Experience</h2>
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
            ${[5, 10, 20, 30].map((n) => `<button type="button" class="count-btn ${n === 10 ? 'active' : ''}" data-count="${n}">${n}</button>`).join("")}
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
      </section>
    </div>
  `;
}

function scoreView() {
  const score = scoreQuiz(quiz, answers);
  const color = score.percent >= 80 ? 'var(--success)' : score.percent >= 50 ? 'var(--warning)' : 'var(--accent)';
  
  return `
    <div class="results-container">
      <section class="card glass fade-in" style="text-align:center">
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
             <div class="card glass result-card ${res.correct ? 'correct-border' : 'wrong-border'} fade-in">
               <div class="result-header">
                 <span class="q-number">Q${i + 1}</span>
                 <span class="result-badge ${res.correct ? 'bg-success' : 'bg-danger'}">
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
    document.querySelectorAll(".count-btn").forEach(b => b.classList.remove("active"));
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
      const result = await generateQuiz({ 
        files, 
        quizType: quizTypeEl.value as QuizType, 
        questionCount: Number(customCountEl.value || 10), 
        difficulty: difficultyEl.value as Difficulty 
      });
      debugPayload = result.debug || {}; raw = result.raw || ""; details = result.details || "";
      if (!result.ok) { throw new Error(result.error || "Generation failed"); }
      quiz = result.quiz; answers = {}; startedAt = Date.now(); currentQuestionIndex = 0;
    } catch (err: any) {
      alert(err.message);
    } finally {
      isGenerating = false;
      render();
    }
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
    quiz = null; answers = {}; isFinished = false; files = []; currentQuestionIndex = 0; render(); 
  });
  document.getElementById("reviewBtn")?.addEventListener("click", () => {
    const section = document.getElementById("reviewSection")!;
    section.style.display = section.style.display === "none" ? "block" : "none";
    if (section.style.display === "block") {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

render();
