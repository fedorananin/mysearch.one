// Thin wrappers around chrome.bookmarks.

export async function getNode(id) {
  try {
    const [node] = await chrome.bookmarks.get(id);
    return node;
  } catch {
    return null;
  }
}

export async function getChildren(id) {
  try {
    return await chrome.bookmarks.getChildren(id);
  } catch {
    return [];
  }
}

export function isFolder(node) {
  return !node.url;
}

// Resolve a stored {id, path} folder reference. Bookmark IDs are stable within
// one profile but differ between synced devices, so if the ID is gone we walk
// the tree by folder titles (path). `fallbackId` is returned when nothing
// resolves (null = "no folder", used for the optional quick launch bar).
export async function resolveFolder(ref, fallbackId = '1') {
  if (ref?.id) {
    const node = await getNode(ref.id);
    if (node && isFolder(node)) return node;
  }
  if (ref?.path?.length) {
    const byPath = await findByPath(ref.path);
    if (byPath) return byPath;
  }
  return fallbackId ? getNode(fallbackId) : null;
}

async function findByPath(path) {
  const [root] = await chrome.bookmarks.getTree();
  // Root's children are "Bookmarks bar", "Other bookmarks", etc. The stored
  // path starts from one of those.
  let candidates = root.children || [];
  let node = null;
  for (const title of path) {
    node = candidates.find((n) => !n.url && n.title === title) || null;
    if (!node) return null;
    candidates = node.children || (await getChildren(node.id));
  }
  return node;
}

// Title path from tree root down to the node (for storing a durable reference).
export async function pathOf(id) {
  const path = [];
  let node = await getNode(id);
  while (node && node.parentId && node.id !== '0') {
    path.unshift(node.title);
    node = await getNode(node.parentId);
  }
  return path;
}

// Flat list of all folders for the settings <select>, with depth for indent.
export async function allFolders() {
  const [root] = await chrome.bookmarks.getTree();
  const out = [];
  const walk = (node, depth) => {
    for (const child of node.children || []) {
      if (!child.url) {
        out.push({ id: child.id, title: child.title, depth });
        walk(child, depth + 1);
      }
    }
  };
  walk(root, 0);
  return out;
}

export function onBookmarksChanged(callback) {
  for (const ev of ['onCreated', 'onRemoved', 'onChanged', 'onMoved', 'onChildrenReordered']) {
    chrome.bookmarks[ev]?.addListener(callback);
  }
}
