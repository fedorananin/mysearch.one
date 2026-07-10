// Background service worker: the "Add to start page" context menu on web
// pages and links. Everything else lives in the new tab page itself.

import { resolveFolder } from './bookmarks.js';

const MENU_PARENT = 'add-to-start';
const MENU_MAIN = 'add-to-main';
const MENU_QUICK = 'add-to-quick';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_PARENT,
      title: 'Add to start page',
      contexts: ['page', 'link'],
    });
    chrome.contextMenus.create({
      id: MENU_MAIN,
      parentId: MENU_PARENT,
      title: 'Main grid',
      contexts: ['page', 'link'],
    });
    chrome.contextMenus.create({
      id: MENU_QUICK,
      parentId: MENU_PARENT,
      title: 'Quick launch bar',
      contexts: ['page', 'link'],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_MAIN && info.menuItemId !== MENU_QUICK) return;

  const { settings } = await chrome.storage.sync.get('settings');
  let ref = info.menuItemId === MENU_QUICK ? settings?.quickFolder : settings?.mainFolder;
  // Quick launch not configured → fall back to the main folder.
  if (info.menuItemId === MENU_QUICK && !ref?.id && !ref?.path?.length) {
    ref = settings?.mainFolder;
  }
  const folder = await resolveFolder(ref || { id: '1', path: [] }, '1');
  if (!folder) return;

  const url = info.linkUrl || info.pageUrl || tab?.url;
  if (!url) return;
  let title = info.linkUrl ? '' : (tab?.title || '');
  if (!title) {
    try {
      title = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      title = url;
    }
  }

  // Don't create duplicates within the same folder.
  const children = await chrome.bookmarks.getChildren(folder.id);
  if (children.some((b) => b.url === url)) return;

  await chrome.bookmarks.create({ parentId: folder.id, title, url });
});
