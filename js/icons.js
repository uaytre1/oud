// One icon style for buttons (quality.md "The next UI fixes" 7): the emoji that start a button label (🎤 ▶ ■ ↻ …)
// are shown as line icons drawn like the home tiles. The code that sets labels is unchanged: this swaps the emoji
// for an icon wherever a button label starts with one, now and whenever a label changes later.
const P = {
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/>',
  pause: '<path d="M9 6v12M15 6v12"/>',
  again: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>',
  tune: '<path d="M4 17a8 8 0 0 1 16 0"/><path d="M12 17l4-6"/><circle cx="12" cy="17" r="1.3" fill="currentColor"/>',
  save: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
  share: '<path d="M7 17 17 7M9 7h8v8"/>',
};
const MAP = [['🎤', 'mic'], ['▶︎', 'play'], ['▶', 'play'], ['⏹', 'stop'], ['■', 'stop'], ['⏸', 'pause'], ['↻', 'again'],
  ['🔁', 'again'], ['🎚️', 'tune'], ['🎚', 'tune'], ['📦', 'save'], ['↗', 'share']];
const svg = (k) => `<svg class="bi" viewBox="0 0 24 24" aria-hidden="true">${P[k]}</svg>`;

function fix(b) {
  const t = b.firstChild;
  if (!t || t.nodeType !== 3) return;                     // a label that does not start with text: leave it
  const s = t.nodeValue.replace(/^\s+/, '');
  const m = MAP.find(([e]) => s.startsWith(e));
  if (!m) return;
  t.nodeValue = s.slice(m[0].length).replace(/^[\s️]+/, '');
  t.before(document.createRange().createContextualFragment(svg(m[1])));
}
const scan = (root) => {
  if (root.nodeType !== 1) return;
  if (root.matches('button')) fix(root);
  root.querySelectorAll('button').forEach(fix);
};
export function startIcons() {
  scan(document.body);
  new MutationObserver((list) => {
    for (const r of list) {
      const n = r.type === 'characterData' ? r.target.parentNode : r.target;
      if (n && n.nodeType === 1 && n.closest('button')) fix(n.closest('button'));
      r.addedNodes.forEach(scan);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}
