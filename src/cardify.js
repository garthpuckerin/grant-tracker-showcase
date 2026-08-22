// Mobile card-lists from ledger tables — the labeling half.
//
// On phones (≤720px) CSS turns every `.table-scroll table.ledger` into a
// stack of cards (see index.css "Mobile card-lists"). A bare "$262,500" in a
// card is meaningless, so each cell needs its column header as a label. This
// observer stamps `data-label` on every <td> from the table's <thead> text —
// once on install and again whenever React re-renders rows — so no screen has
// to hand-maintain labels and desktop markup is untouched.
const TABLE_SELECTOR = '.table-scroll table.ledger';

function labelTable(table) {
  const headers = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent.trim());
  if (headers.length === 0) return;
  table.querySelectorAll('tbody tr').forEach((tr) => {
    Array.from(tr.children).forEach((td, i) => {
      const label = headers[i] || '';
      if (label) td.setAttribute('data-label', label);
      else td.removeAttribute('data-label');
    });
  });
}

export function labelAllTables(root = document) {
  root.querySelectorAll(TABLE_SELECTOR).forEach(labelTable);
}

/**
 * Install the observer on a root element. Returns a disposer.
 * @param {HTMLElement} root
 */
export function installCardify(root) {
  if (!root) return () => {};
  labelAllTables(root);
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; labelAllTables(root); });
  });
  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
}
