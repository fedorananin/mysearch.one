// Drag & drop of cards. The new order is written straight back into the
// bookmark tree (chrome.bookmarks.move), so it applies everywhere: other
// devices, the bookmark manager, the bookmarks bar.

let drag = null; // { id, parentId, index, isFolder }

// Lets main.js tell an internal card drag apart from a link dragged in from
// outside (address bar, another page).
export function isDraggingCard() {
  return drag !== null;
}

function clearMarks() {
  document
    .querySelectorAll('.drop-before, .drop-after, .drop-into')
    .forEach((el) => el.classList.remove('drop-before', 'drop-after', 'drop-into'));
}

// Where over the card are we: 'into' (center of a folder card) or before/after.
// The quick launch bar can be vertical — then before/after goes by Y, not X.
function zoneFor(card, node, e) {
  const rect = card.getBoundingClientRect();
  const vertical = card.closest('#quickbar') &&
    ['left', 'right'].includes(document.body.dataset.quickpos);
  const rel = vertical
    ? (e.clientY - rect.top) / rect.height
    : (e.clientX - rect.left) / rect.width;
  if (!node.url && rel > 0.3 && rel < 0.7) return 'into';
  return rel < 0.5 ? 'before' : 'after';
}

export function bindCardDnd(card, node, parentId, index) {
  card.draggable = true;

  card.addEventListener('dragstart', (e) => {
    drag = { id: node.id, parentId, index, isFolder: !node.url };
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', node.id);
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    clearMarks();
    drag = null;
  });

  card.addEventListener('dragover', (e) => {
    if (!drag || drag.id === node.id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    clearMarks();
    card.classList.add('drop-' + zoneFor(card, node, e));
  });

  card.addEventListener('dragleave', () => clearMarks());

  card.addEventListener('drop', async (e) => {
    if (!drag || drag.id === node.id) return;
    e.preventDefault();
    const zone = zoneFor(card, node, e);
    clearMarks();
    try {
      if (zone === 'into') {
        await chrome.bookmarks.move(drag.id, { parentId: node.id });
      } else {
        let target = zone === 'before' ? index : index + 1;
        // Within the same folder Chrome expects the index as it will be
        // AFTER the dragged item is removed from its old slot.
        if (drag.parentId === parentId && drag.index < target) target -= 1;
        await chrome.bookmarks.move(drag.id, { parentId, index: target });
      }
    } catch {
      // e.g. moving a folder into its own subtree — the API refuses, we just
      // leave everything as it was.
    }
    drag = null;
  });
}
