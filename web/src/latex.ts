import katex from "katex";
import "katex/dist/katex.min.css";

function renderMathInText(text: string): string {
  return text
    .replace(/\\\[(.+?)\\\]/gs, (_, expr) => katex.renderToString(expr, { displayMode: true, throwOnError: false }))
    .replace(/\\\((.+?)\\\)/gs, (_, expr) => katex.renderToString(expr, { displayMode: false, throwOnError: false }));
}

export function renderRichText(text: string): string {
  const htmlWithMath = renderMathInText(text);
  return htmlWithMath.replace(/```([\s\S]*?)```/g, (_m, code) => `<pre class="code-window"><code>${escapeHtml(code)}</code></pre>`);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
