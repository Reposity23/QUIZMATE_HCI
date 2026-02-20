import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
import { renderRichText } from "./latex";

export function renderQuiz(quiz: any, answers: Record<string, any>) {
  return quiz.questions.map((q: any, idx: number) => {
    if (q.type === "mcq") {
      return `<section class="card"><h3>Q${idx + 1}</h3><div>${renderRichText(q.prompt)}</div>${q.choices.map((c: string, i: number) => `<label><input type="radio" name="${q.id}" data-qid="${q.id}" value="${i}" ${Number(answers[q.id])===i?"checked":""}/> ${renderRichText(c)}</label>`).join("")}</section>`;
    }
    if (q.type === "matching") {
      const rights = q.pairs.map((p: any) => p.right);
      return `<section class="card"><h3>Q${idx + 1}</h3>${q.pairs.map((p: any, i: number) => `<div class="match-row"><span>${renderRichText(p.left)}</span><select data-qid="${q.id}" data-pair="${i}"><option value="">Select</option>${rights.map((r: string)=>`<option ${answers[q.id]?.[i]===r?"selected":""}>${r}</option>`).join("")}</select></div>`).join("")}</section>`;
    }

    return `<section class="card"><h3>Q${idx + 1}</h3><div>${renderRichText(q.prompt)}</div><input type="text" data-qid="${q.id}" value="${answers[q.id] || ""}"/></section>`;
  }).join("");
}

export function highlightCodeBlocks(root: HTMLElement) {
  root.querySelectorAll("pre code").forEach((el) => Prism.highlightElement(el as HTMLElement));
}
