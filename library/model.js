// Модель витрины: всё собирается из исходного CSS токенов, компонентов и блоков.
// Руками здесь ничего не ведётся — только правила разбора.

import primitivesCss from '../src/tokens/primitives.css?raw';
import tokensCss from '../src/tokens/tokens.css?raw';
import baseCss from '../src/base.css?raw';
import landingHtml from '../index.html?raw';

const componentCss = import.meta.glob('../src/components/*.css', { query: '?raw', import: 'default', eager: true });
const componentDemo = import.meta.glob('../src/components/*.demo.js', { import: 'default', eager: true });
const blockCss = import.meta.glob('../src/blocks/*/*.css', { query: '?raw', import: 'default', eager: true });

export const FILES = {
  primitives: 'src/tokens/primitives.css',
  tokens: 'src/tokens/tokens.css',
  base: 'src/base.css',
};

export const STATE_ORDER = ['default', 'hovered', 'active', 'disabled', 'focus'];
export const COLOR_TYPES = ['surface', 'border', 'text', 'icon', 'effect'];
export const TEXT_STYLES = ['h1', 'h2', 'h3', 'body', 'small', 'caption'];
export const FONT_PARTS = ['family', 'size', 'leading', 'weight', 'tracking'];
const FONT_PROPS = {
  'font-family': 'family',
  'font-size': 'size',
  'line-height': 'leading',
  'font-weight': 'weight',
  'letter-spacing': 'tracking',
};
export const FONT_PROP_BY_PART = Object.fromEntries(Object.entries(FONT_PROPS).map(([p, k]) => [k, p]));

// Служебные классы, которые не являются компонентами.
const UTILITY_CLASSES = new Set(['squircle', 'no-hover']);

const relPath = (key) => key.replace(/^\.\.\//, '');
const fileBase = (key) => key.split('/').pop().replace(/\.(demo\.js|css)$/, '');

// ---------- Разбор CSS ----------

function parseHeader(css) {
  const header = {};
  const m = css.match(/^\s*\/\*([\s\S]*?)\*\//);
  if (!m) return header;
  for (const t of m[1].matchAll(/@(\w+)\s+([^@]*)/g)) header[t[1]] = t[2].trim().replace(/\s+/g, ' ');
  return header;
}

// Правила верхнего уровня: селектор + объявления (одно на строку, подпись — комментарий в той же строке).
export function parseRules(css) {
  const rules = [];
  let i = 0;
  let depth = 0;
  let selector = '';
  let body = '';
  while (i < css.length) {
    if (css.startsWith('/*', i)) {
      const end = css.indexOf('*/', i + 2);
      const stop = end === -1 ? css.length : end + 2;
      if (depth > 0) body += css.slice(i, stop);
      i = stop;
      continue;
    }
    const ch = css[i];
    if (ch === '{') {
      depth += 1;
      if (depth === 1) body = '';
      else body += ch;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        rules.push({ selector: selector.trim().replace(/\s+/g, ' '), decls: parseDecls(body) });
        selector = '';
      } else body += ch;
    } else if (depth === 0) selector += ch;
    else body += ch;
    i += 1;
  }
  return rules;
}

function parseDecls(body) {
  const decls = [];
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*(--[\w-]+|[a-z-]+)\s*:\s*(.+?)\s*;\s*(?:\/\*\s*(.*?)\s*\*\/)?\s*$/);
    if (!m) continue;
    const v = m[2].match(/^var\((--[\w-]+)\)$/);
    decls.push({ prop: m[1], value: m[2], varName: v ? v[1] : null, label: m[3] || '' });
  }
  return decls;
}

// ---------- Примитивы и токены ----------

const PRIMITIVE_GROUPS = {
  color: 'Цвет',
  size: 'Размер',
  font: 'Кегль',
  leading: 'Интерлиньяж',
  tracking: 'Трекинг',
  family: 'Семейство',
  weight: 'Начертание',
  duration: 'Длительность',
  easing: 'Кривая',
};
export const PRIMITIVE_GROUP_TITLES = PRIMITIVE_GROUPS;

export const primitives = [];
for (const rule of parseRules(primitivesCss)) {
  for (const d of rule.decls) {
    if (!d.prop.startsWith('--p-')) continue;
    primitives.push({ name: d.prop, value: d.value, group: d.prop.split('-')[3], selector: rule.selector });
  }
}
export const primitiveByName = new Map(primitives.map((p) => [p.name, p]));

export const tokens = [];
for (const rule of parseRules(tokensCss)) {
  if (/data-theme="dark"/.test(rule.selector) && !/data-theme="light"/.test(rule.selector)) continue;
  for (const d of rule.decls) {
    if (!d.prop.startsWith('--') || !d.varName) continue;
    tokens.push({ name: d.prop, primitive: d.varName, selector: rule.selector });
  }
}
export const tokenByName = new Map(tokens.map((t) => [t.name, t]));

// Вид токена по имени: цвет (по типу), шаг шкалы, ширина, текстовый стиль, движение.
export function tokenKind(name) {
  const first = name.slice(2).split('-')[0];
  if (COLOR_TYPES.includes(first)) return 'color';
  if (['space', 'radius', 'stroke', 'size'].includes(first)) return 'scale';
  if (first === 'width') return 'width';
  if (first === 'font') return 'font';
  if (first === 'hover') return 'motion';
  return 'other';
}
export const scaleOf = (name) => name.slice(2).split('-')[0];
export const textStyleOf = (name) => name.match(/^--font-(\w+)-/)?.[1] ?? null;

// ---------- Компоненты и блоки ----------

function stateOf(selectors) {
  for (const s of selectors) {
    const m = s.match(/\[data-state="(\w+)"\]/);
    if (m) return m[1];
  }
  const s = selectors[0];
  if (/:hover/.test(s)) return 'hovered';
  if (/:active/.test(s)) return 'active';
  if (/:focus/.test(s)) return 'focus';
  if (/:disabled/.test(s)) return 'disabled';
  return 'default';
}

function analyzeRule(rule, root) {
  const selectors = rule.selector.split(',').map((s) => s.trim());
  const re = new RegExp(`\\.${root}--([\\w-]+)`);
  let variant = null;
  for (const s of selectors) {
    const m = s.match(re);
    if (m) variant = m[1];
  }
  const first = selectors[0];
  const el = first.match(new RegExp(`\\.${root}__([\\w-]+)`))?.[1];
  const pseudo = first.match(/::([\w-]+)/)?.[1];
  const part = [el, pseudo].filter(Boolean).join('::');
  const classes = new Set();
  for (const s of selectors) {
    for (const c of s.matchAll(/\.([a-z][\w-]*)/g)) classes.add(c[1].split(/--|__/)[0]);
  }
  return { ...rule, variant, state: stateOf(selectors), part, classes };
}

function buildUnit({ key, css, demo, kind, block }) {
  const id = fileBase(key);
  const header = parseHeader(css);
  const rules = parseRules(css)
    .map((r) => analyzeRule(r, id))
    .filter((r) => r.decls.some((d) => d.varName));
  const variants = [];
  for (const r of rules) if (r.variant && !variants.includes(r.variant)) variants.push(r.variant);
  // Базовый класс со своими цветами — отдельный вариант (например, обычная карточка тарифа рядом с inverse).
  const baseHasColor = rules.some((r) => r.variant === null && r.decls.some((d) => d.varName && tokenKind(d.varName) === 'color'));
  if (!variants.length || baseHasColor) variants.unshift('');
  return {
    id,
    kind,
    block,
    file: relPath(key),
    title: header.title || id,
    description: header.description || '',
    surface: header.surface || null,
    rules,
    variants,
    demo: demo || {},
  };
}

export const components = Object.entries(componentCss)
  .map(([key, css]) => buildUnit({ key, css, demo: componentDemo[key.replace(/\.css$/, '.demo.js')], kind: 'component' }))
  .sort((a, b) => ORDER(a.id) - ORDER(b.id));

function ORDER(id) {
  const order = ['button', 'tag', 'input', 'nav-item', 'container'];
  const i = order.indexOf(id);
  return i === -1 ? order.length : i;
}

// Блоки: папка src/blocks/<NN-имя>/. Файл <имя>.css — сам блок, остальные — его элементы.
export const blocks = [];
{
  const byFolder = new Map();
  for (const [key, css] of Object.entries(blockCss)) {
    const folder = key.split('/').slice(-2)[0];
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder).push(
      buildUnit({ key, css, kind: 'element', block: folder }),
    );
  }
  for (const folder of [...byFolder.keys()].sort()) {
    const name = folder.replace(/^\d+-/, '');
    const units = byFolder.get(folder);
    const main = units.find((u) => u.id === name) || units[0];
    main.kind = 'block';
    blocks.push({ folder, main, elements: units.filter((u) => u !== main) });
  }
}

// ---------- Превью блоков и элементов — из разметки лендинга ----------

const landingDoc = new DOMParser().parseFromString(landingHtml, 'text/html');

// Блок — его корень целиком. Элемент — первое вхождение варианта, обёрнутое в
// пустые копии предков до корня блока: так работают сетка (subgrid) и селекторы блока.
export function landingPreview(unit, variant) {
  if (unit.kind === 'block') {
    const el = landingDoc.querySelector(`.${unit.id}`);
    return el ? { html: el.outerHTML, crop: false } : null;
  }
  const all = [...landingDoc.querySelectorAll(`.${unit.id}`)];
  const el = variant
    ? landingDoc.querySelector(`.${unit.id}--${variant}`)
    : all.find((e) => ![...e.classList].some((c) => c.startsWith(`${unit.id}--`))) || all[0];
  if (!el) return null;
  const blockRoot = blocks.find((b) => b.folder === unit.block)?.main.id;
  let node = el.cloneNode(true);
  node.setAttribute('data-preview-target', '');
  for (let a = el.parentElement; a && a !== landingDoc.body; a = a.parentElement) {
    const shell = a.cloneNode(false);
    shell.removeAttribute('id');
    shell.append(node);
    node = shell;
    if (blockRoot && a.classList.contains(blockRoot)) break;
  }
  return { html: node.outerHTML, crop: true };
}

export const allUnits = [...components, ...blocks.flatMap((b) => [b.main, ...b.elements])];
export const unitById = new Map(allUnits.map((u) => [u.id, u]));

export function routeOf(unit) {
  return unit.kind === 'component' ? `#c/${unit.id}` : `#b/${unit.block}/${unit.id}`;
}

// «Состоит из» и «Используется в» — по классам других компонентов в селекторах.
export function consistsOf(unit) {
  const ids = new Set();
  for (const r of rules(unit)) for (const c of r.classes) if (c !== unit.id && unitById.has(c) && !UTILITY_CLASSES.has(c)) ids.add(c);
  if (unit.kind === 'block') for (const b of blocks) if (b.main === unit) b.elements.forEach((e) => ids.add(e.id));
  return [...ids].map((id) => unitById.get(id));
}
function rules(unit) {
  // включает и правила без редактируемых значений — для связей важна любая раскладка
  const css = unit.kind === 'component'
    ? componentCss[`../${unit.file}`]
    : blockCss[`../${unit.file}`];
  return parseRules(css).map((r) => analyzeRule(r, unit.id));
}
export function usedIn(unit) {
  return allUnits.filter((u) => u !== unit && u.kind !== 'component' && consistsOf(u).includes(unit));
}

// ---------- Где используется ----------

const baseRules = parseRules(baseCss).map((r) => ({ ...r, variant: null, state: 'default', part: r.selector }));

// var-имя → список мест: { unit, variant, state, part, prop, selector }
export const usages = new Map();
function addUsage(varName, place) {
  if (!usages.has(varName)) usages.set(varName, []);
  usages.get(varName).push(place);
}
for (const unit of allUnits) {
  for (const r of unit.rules) {
    for (const d of r.decls) if (d.varName) addUsage(d.varName, { unit, variant: r.variant, state: r.state, part: r.part, prop: d.prop, selector: r.selector });
  }
}
for (const r of baseRules) {
  for (const d of r.decls) if (d.varName) addUsage(d.varName, { unit: null, variant: null, state: 'default', part: r.selector, prop: d.prop, selector: r.selector });
}

// Места использования текстового стиля (по одному на правило, а не на каждое из пяти свойств).
export function textStyleUsages(style) {
  const seen = new Set();
  const out = [];
  for (const part of FONT_PARTS) {
    for (const u of usages.get(`--font-${style}-${part}`) || []) {
      const k = `${u.unit?.id}|${u.selector}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(u);
    }
  }
  return out;
}
