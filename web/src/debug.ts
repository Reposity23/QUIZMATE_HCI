export function renderDebug(debug: any, raw?: string, details?: string): string {
  return `
    <details class="debug-panel">
      <summary>Debug</summary>
      <pre>${escapeHtml(JSON.stringify({ debug, details }, null, 2))}</pre>
      ${raw ? `<h4>Raw Model Output</h4><pre>${escapeHtml(raw)}</pre>` : ""}
    </details>
  `;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
