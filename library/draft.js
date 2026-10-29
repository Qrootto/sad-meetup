// Черновик правок витрины: хранится в браузере, применяется поверх исходного CSS
// и превращается в текст правок для Claude Code.

import { FILES, FONT_PARTS, FONT_PROP_BY_PART, primitiveByName, tokenByName } from './model.js';

const KEY = 'sad-meetup:library-draft';
const listeners = new Set();

// vars: имя переменной → новое значение (у токена и шага — имя примитива, у цветового примитива — hex).
// props: «файл|селектор|свойство» → { file, selector, prop, from, to } (from/to — имя var или текстового стиля).
let draft = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && raw.vars && raw.props) return raw;
  } catch {
    /* пустой черновик */
  }
  return { vars: {}, props: {} };
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* черновик живёт до перезагрузки */
  }
  apply();
  listeners.forEach((fn) => fn());
}

export const onDraftChange = (fn) => listeners.add(fn);

// ---------- Значения с учётом черновика ----------

export function primitiveValue(name) {
  return draft.vars[name] ?? primitiveByName.get(name)?.value;
}
export function tokenPrimitive(name) {
  return draft.vars[name] ?? tokenByName.get(name)?.primitive;
}
export function propValue(file, selector, prop, original) {
  return draft.props[`${file}|${selector}|${prop}`]?.to ?? original;
}

export function setPrimitive(name, value) {
  const original = primitiveByName.get(name).value;
  if (value.toLowerCase() === original.toLowerCase()) delete draft.vars[name];
  else draft.vars[name] = value.toUpperCase();
  save();
}
export function setToken(name, primitive) {
  if (primitive === tokenByName.get(name).primitive) delete draft.vars[name];
  else draft.vars[name] = primitive;
  save();
}
// prop === 'font' — текстовый стиль: from/to — имя стиля (body, caption…).
export function setProp(file, selector, prop, from, to) {
  const key = `${file}|${selector}|${prop}`;
  if (from === to) delete draft.props[key];
  else draft.props[key] = { file, selector, prop, from, to };
  save();
}
export function revert(change) {
  if (change.kind === 'prop') delete draft.props[change.key];
  else delete draft.vars[change.name];
  save();
}
export function reset() {
  draft = { vars: {}, props: {} };
  save();
}

// ---------- Список правок ----------

export function changes() {
  const list = [];
  for (const [name, to] of Object.entries(draft.vars)) {
    if (name.startsWith('--p-')) {
      const p = primitiveByName.get(name);
      if (!p) continue;
      list.push({ kind: 'primitive', name, file: FILES.primitives, selector: p.selector, prop: name, from: p.value, to });
    } else {
      const t = tokenByName.get(name);
      if (!t) continue;
      list.push({ kind: 'token', name, file: FILES.tokens, selector: t.selector, prop: name, from: `var(${t.primitive})`, to: `var(${to})` });
    }
  }
  for (const [key, c] of Object.entries(draft.props)) {
    if (c.prop === 'font') {
      list.push({
        kind: 'prop', key, file: c.file, selector: c.selector,
        prop: FONT_PARTS.map((p) => FONT_PROP_BY_PART[p]).join(', '),
        from: `var(--font-${c.from}-…)`, to: `var(--font-${c.to}-…)`,
        note: `текстовый стиль ${c.from} → ${c.to}`,
      });
    } else {
      list.push({ kind: 'prop', key, file: c.file, selector: c.selector, prop: c.prop, from: `var(${c.from})`, to: `var(${c.to})` });
    }
  }
  return list;
}

export function changedVars() {
  return new Set(Object.keys(draft.vars));
}
export function changedFiles() {
  return new Set(Object.values(draft.props).map((c) => c.file));
}

export function markdown() {
  const list = changes();
  if (!list.length) return 'Правок в витрине нет.';
  const lines = ['## Правки из витрины', '', 'Внеси в исходники (значения — только через var):', ''];
  const byFile = new Map();
  for (const c of list) {
    if (!byFile.has(c.file)) byFile.set(c.file, []);
    byFile.get(c.file).push(c);
  }
  for (const [file, items] of byFile) {
    lines.push(`### \`${file}\``, '');
    for (const c of items) {
      const note = c.note ? ` (${c.note})` : '';
      lines.push(`- \`${c.selector}\` → \`${c.prop}\`: \`${c.from}\` → \`${c.to}\`${note}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim() + '\n';
}

// ---------- Применение черновика ----------

const style = document.createElement('style');
style.id = 'library-draft';

export function apply() {
  if (!style.isConnected) document.body.append(style);
  const vars = Object.entries(draft.vars)
    .map(([name, v]) => (name.startsWith('--p-') ? `${name}: ${v};` : `${name}: var(${v});`))
    .join(' ');
  const props = Object.values(draft.props)
    .map((c) => {
      if (c.prop === 'font') {
        const body = FONT_PARTS.map((p) => `${FONT_PROP_BY_PART[p]}: var(--font-${c.to}-${p});`).join(' ');
        return `${c.selector} { ${body} }`;
      }
      return `${c.selector} { ${c.prop}: var(${c.to}); }`;
    })
    .join('\n');
  style.textContent = `:root:root { ${vars} }\n${props}`;
}
