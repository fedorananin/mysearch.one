// Custom context menu + <dialog>-based prompts.

const menu = document.getElementById('ctxmenu');
const dlg = document.getElementById('dlg');

export function initMenu() {
  document.addEventListener('click', hideMenu);
  document.addEventListener('scroll', hideMenu, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideMenu();
  });
  window.addEventListener('blur', hideMenu);
}

export function hideMenu() {
  menu.hidden = true;
  menu.textContent = '';
}

// items: array of {label, danger?, onClick} or 'sep'
export function showMenu(x, y, items) {
  menu.textContent = '';
  for (const item of items) {
    if (item === 'sep') {
      menu.appendChild(document.createElement('hr'));
      continue;
    }
    const div = document.createElement('div');
    div.className = 'item' + (item.danger ? ' danger' : '');
    div.textContent = item.label;
    div.addEventListener('click', (e) => {
      e.stopPropagation();
      hideMenu();
      item.onClick();
    });
    menu.appendChild(div);
  }
  menu.hidden = false;
  const rect = menu.getBoundingClientRect();
  menu.style.left = Math.min(x, innerWidth - rect.width - 8) + 'px';
  menu.style.top = Math.min(y, innerHeight - rect.height - 8) + 'px';
}

// Generic form dialog. fields: [{name, label, value?, type?='text', options?}]
// Resolves with {name: value, ...} or null if cancelled.
export function formDialog({ title, fields, okLabel = 'Save' }) {
  return new Promise((resolve) => {
    dlg.textContent = '';

    const h = document.createElement('h3');
    h.textContent = title;
    dlg.appendChild(h);

    const form = document.createElement('form');
    form.method = 'dialog';
    const inputs = {};

    for (const f of fields) {
      const wrap = document.createElement('div');
      wrap.className = 'field';
      const label = document.createElement('label');
      label.textContent = f.label;
      wrap.appendChild(label);
      let el;
      if (f.type === 'select') {
        el = document.createElement('select');
        for (const opt of f.options) {
          const o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          el.appendChild(o);
        }
        el.value = f.value ?? f.options[0]?.value;
        if (f.onChange) el.addEventListener('change', () => f.onChange(el.value, inputs));
      } else {
        el = document.createElement('input');
        el.type = 'text';
        el.value = f.value ?? '';
        if (f.placeholder) el.placeholder = f.placeholder;
      }
      inputs[f.name] = el;
      wrap.appendChild(el);
      form.appendChild(wrap);
    }

    const buttons = document.createElement('div');
    buttons.className = 'buttons';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => dlg.close('cancel'));
    const ok = document.createElement('button');
    ok.type = 'submit';
    ok.className = 'primary';
    ok.textContent = okLabel;
    buttons.append(cancel, ok);
    form.appendChild(buttons);
    dlg.appendChild(form);

    let submitted = false;
    form.addEventListener('submit', () => {
      submitted = true;
    });
    dlg.addEventListener(
      'close',
      () => {
        if (!submitted) return resolve(null);
        const out = {};
        for (const [name, el] of Object.entries(inputs)) out[name] = el.value.trim();
        resolve(out);
      },
      { once: true },
    );

    dlg.showModal();
    const first = Object.values(inputs)[0];
    if (first) first.focus();
  });
}

export function confirmDialog(message, okLabel = 'Delete') {
  return new Promise((resolve) => {
    dlg.textContent = '';
    const h = document.createElement('h3');
    h.textContent = message;
    dlg.appendChild(h);
    const buttons = document.createElement('div');
    buttons.className = 'buttons';
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => dlg.close());
    const ok = document.createElement('button');
    ok.className = 'primary';
    ok.textContent = okLabel;
    ok.addEventListener('click', () => {
      resolve(true);
      dlg.close();
    });
    buttons.append(cancel, ok);
    dlg.appendChild(buttons);
    dlg.addEventListener('close', () => resolve(false), { once: true });
    dlg.showModal();
  });
}

// Icon picker: default favicon / browser cache / pinned service / emoji /
// uploaded image.
// Resolves with {type:'emoji'|'image'|'source', value} | {type:'local'} |
// 'reset' | null.
export function iconDialog(current, { isFolder = false } = {}) {
  return new Promise((resolve) => {
    dlg.textContent = '';
    const h = document.createElement('h3');
    h.textContent = 'Change icon';
    dlg.appendChild(h);

    const box = document.createElement('div');
    box.className = 'iconoptions';

    const mk = (value, labelText) => {
      const label = document.createElement('label');
      label.className = 'opt';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'icontype';
      radio.value = value;
      label.append(radio, document.createTextNode(labelText));
      box.appendChild(label);
      return radio;
    };

    const rDefault = mk('default', isFolder ? 'Default (folder icon)' : 'Default (site favicon)');
    // The browser favicon cache and favicon services are meaningless for folders.
    const rLocal = isFolder
      ? null
      : mk('local', 'Browser icon (local cache) — sees dynamic favicons');
    let rSource = null;
    let sourceSelect = null;
    if (!isFolder) {
      rSource = mk('source', 'Favicon service:');
      sourceSelect = document.createElement('select');
      for (const [value, text] of [
        ['google', 'Google'], ['ddg', 'DuckDuckGo'], ['horse', 'Icon Horse'],
      ]) {
        const o = document.createElement('option');
        o.value = value;
        o.textContent = text;
        sourceSelect.appendChild(o);
      }
      rSource.parentElement.appendChild(sourceSelect);
      sourceSelect.addEventListener('focus', () => (rSource.checked = true));
    }
    const rEmoji = mk('emoji', 'Emoji or text:');
    const emojiInput = document.createElement('input');
    emojiInput.type = 'text';
    emojiInput.style.width = '130px';
    emojiInput.maxLength = 24;
    emojiInput.placeholder = '🚀 / Dev';
    rEmoji.parentElement.appendChild(emojiInput);
    emojiInput.addEventListener('focus', () => (rEmoji.checked = true));

    const rImage = mk('image', 'Custom image:');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    rImage.parentElement.appendChild(fileInput);
    fileInput.addEventListener('change', () => (rImage.checked = true));

    if (current?.type === 'emoji') {
      rEmoji.checked = true;
      emojiInput.value = current.value;
    } else if (current?.type === 'image') {
      rImage.checked = true;
    } else if (current?.type === 'local' && rLocal) {
      rLocal.checked = true;
    } else if (current?.type === 'source' && rSource) {
      rSource.checked = true;
      sourceSelect.value = current.value;
    } else {
      rDefault.checked = true;
    }

    dlg.appendChild(box);

    const buttons = document.createElement('div');
    buttons.className = 'buttons';
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => dlg.close());
    const ok = document.createElement('button');
    ok.className = 'primary';
    ok.textContent = 'Save';
    buttons.append(cancel, ok);
    dlg.appendChild(buttons);

    let result = null;
    ok.addEventListener('click', async () => {
      const type = box.querySelector('input[name=icontype]:checked')?.value;
      if (type === 'default') {
        result = 'reset';
      } else if (type === 'local') {
        result = { type: 'local' };
      } else if (type === 'source') {
        result = { type: 'source', value: sourceSelect.value };
      } else if (type === 'emoji' && emojiInput.value.trim()) {
        result = { type: 'emoji', value: emojiInput.value.trim() };
      } else if (type === 'image') {
        const file = fileInput.files[0];
        if (file) result = { type: 'image', value: await fileToIcon(file) };
        else if (current?.type === 'image') result = current; // keep existing
      }
      dlg.close();
    });

    dlg.addEventListener('close', () => resolve(result), { once: true });
    dlg.showModal();
  });
}

// Read an image file and downscale it to a 128px data URL so storage stays small.
export function fileToIcon(file, size = 128) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        // Fit inside the square, keep aspect ratio, center.
        const scale = Math.min(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
