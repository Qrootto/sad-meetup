import '../src/styles.js';
import './library.css';
import { initHoverSuppress } from '../src/hover-suppress.js';
import { fixOrphans } from '../src/fix-orphans.js';
import * as M from './model.js';
import * as D from './draft.js';

const THEME_KEY = 'sad-meetup:library-theme';
const FOUNDATIONS = [
  ['colors', 'Цвета'],
  ['sizes', 'Размеры'],
  ['type', 'Типографика'],
  ['motion', 'Движение'],
];
const SIZE_GROUPS = [
  ['space', 'Отступы'],
  ['radius', 'Скругления'],
  ['stroke', 'Обводки'],
  ['size', 'Высоты элементов управления'],
  ['width', 'Ширины'],
];
// Ширина лендинга: превью блоков масштабируется от неё под ширину области (вычисляемое значение, не токен).
const LANDING_WIDTH = 1440;
const COLOR_PROPS = new Set(['background-color', 'border-color', 'border-block-end-color', 'color', 'outline-color']);
// Тип цвета — по имени токена; кольцо фокуса (outline-color) — отдельно, в колонке focus.
const colorType = (d) => (d.prop === 'outline-color' ? 'ring' : d.varName.slice(2).split('-')[0]);
const isColorDecl = (d) => d.varName && COLOR_PROPS.has(d.prop) && M.tokenKind(d.varName) === 'color';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const primTitle = (name) => {
  const last = name.replace(/^--p-color-/, '');
  return last[0].toUpperCase() + last.slice(1);
};
const places = (n) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `в ${n} месте`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `в ${n} местах`;
  return `в ${n} местах`;
};

// ---------- Каркас ----------

document.querySelector('#app').innerHTML = `
  <div class="lib">
    <header class="lib-bar">
      <a class="lib-bar__title" href="#colors">САД · витрина</a>
      <label class="lib-bar__field">Тема
        <select class="lib-select" data-theme-select>
          <option value="light">Light</option>
          <option value="dark">Dark (пока пусто — значения Light)</option>
        </select>
      </label>
      <button class="lib-btn" type="button" data-show-changes>Показать изменения (<span data-count>0</span>)</button>
      <button class="lib-btn" type="button" data-copy>Скопировать изменения для Claude Code</button>
      <button class="lib-btn" type="button" data-reset>Сбросить</button>
    </header>
    <nav class="lib-nav" data-nav></nav>
    <main class="lib-main" data-main></main>
  </div>
  <dialog class="lib-dialog" data-dialog></dialog>
`;

const navEl = document.querySelector('[data-nav]');
const mainEl = document.querySelector('[data-main]');
const dialogEl = document.querySelector('[data-dialog]');
const themeSelect = document.querySelector('[data-theme-select]');
const copyBtn = document.querySelector('[data-copy]');

function initTheme() {
  let theme = 'light';
  try {
    theme = localStorage.getItem(THEME_KEY) || 'light';
  } catch {
    /* тема по умолчанию */
  }
  document.documentElement.dataset.theme = theme;
  themeSelect.value = theme;
  themeSelect.addEventListener('change', () => {
    document.documentElement.dataset.theme = themeSelect.value;
    try {
      localStorage.setItem(THEME_KEY, themeSelect.value);
    } catch {
      /* без запоминания */
    }
  });
}

// ---------- Маршрут ----------

function parseRoute() {
  const [path, query] = location.hash.slice(1).split('?');
  return { path: path || 'colors', params: new URLSearchParams(query || '') };
}
const routeKey = (unit) => M.routeOf(unit).slice(1);

// ---------- Какие пункты затронуты черновиком ----------

function dirtyKeys() {
  const keys = new Set();
  for (const name of D.changedVars()) {
    if (name.startsWith('--p-')) {
      const g = M.primitiveByName.get(name)?.group;
      keys.add(g === 'color' ? 'colors' : g === 'size' ? 'sizes' : ['duration', 'easing'].includes(g) ? 'motion' : 'type');
      continue;
    }
    const kind = M.tokenKind(name);
    keys.add(kind === 'color' ? 'colors' : kind === 'font' ? 'type' : kind === 'motion' ? 'motion' : 'sizes');
    for (const u of M.usages.get(name) || []) if (u.unit) keys.add(routeKey(u.unit));
  }
  const files = D.changedFiles();
  for (const unit of M.allUnits) if (files.has(unit.file)) keys.add(routeKey(unit));
  return keys;
}

// ---------- Навигация ----------

function renderNav() {
  const { path } = parseRoute();
  const dirty = dirtyKeys();
  const item = (key, title, nested = false) => `
    <a class="lib-nav__item${nested ? ' lib-nav__item--nested' : ''}" href="#${key}"${path === key ? ' aria-current="page"' : ''}>
      ${esc(title)}${dirty.has(key) ? '<span class="lib-dot" title="Есть правки черновика">●</span>' : ''}
    </a>`;
  const blocks = M.blocks.length
    ? M.blocks
        .map((b) => item(routeKey(b.main), b.main.title) + b.elements.map((e) => item(routeKey(e), e.title, true)).join(''))
        .join('')
    : '<p class="lib-nav__empty">Появятся вместе с блоками лендинга</p>';
  navEl.innerHTML = `
    <p class="lib-nav__group">Основа</p>
    ${FOUNDATIONS.map(([k, t]) => item(k, t)).join('')}
    <p class="lib-nav__group">Блоки</p>
    ${blocks}
    <p class="lib-nav__group">Базовые компоненты</p>
    ${M.components.map((c) => item(routeKey(c), c.title)).join('')}
  `;
}

// ---------- Общие кусочки ----------

function usageLabel(u) {
  if (!u.unit) return `Страница · ${u.part}`;
  const parts = [u.unit.title, u.variant || 'общее'];
  if (u.state !== 'default') parts.push(u.state);
  if (u.part && u.unit.kind === 'component') parts.push(u.part);
  return parts.join(' · ');
}
function usageHref(u) {
  if (!u.unit) return null;
  const q = new URLSearchParams();
  if (u.variant) q.set('v', u.variant);
  q.set('s', u.state);
  return `${M.routeOf(u.unit)}?${q}`;
}
function usageWidget(key, list) {
  if (!list.length) return '<span class="lib-muted">не используется</span>';
  const items = list
    .map((u) => {
      const href = usageHref(u);
      const text = esc(usageLabel(u));
      return `<li>${href ? `<a href="${href}">${text}</a>` : text} <span class="lib-muted">${esc(u.prop)}</span></li>`;
    })
    .join('');
  return `<details class="lib-usage" data-key="${esc(key)}"><summary>${places(list.length)} ▾</summary><ul>${items}</ul></details>`;
}
function primitiveOptions(group, current) {
  return M.primitives
    .filter((p) => p.group === group)
    .map((p) => `<option value="${p.name}"${p.name === current ? ' selected' : ''}>${esc(p.group === 'color' ? primTitle(p.name) : p.name)}</option>`)
    .join('');
}
function tokenSelect(name) {
  const current = D.tokenPrimitive(name);
  const group = M.primitiveByName.get(M.tokenByName.get(name).primitive)?.group;
  return `<select class="lib-select" data-set-token="${name}">${primitiveOptions(group, current)}</select>`;
}
function tokenValue(name) {
  return D.primitiveValue(D.tokenPrimitive(name)) ?? '';
}

function tokenRow(name, { swatch = false, usage = true } = {}) {
  const list = M.usages.get(name) || [];
  return `
    <div class="lib-row" id="row${name}" data-uses="${D.tokenPrimitive(name)}" data-uses-of="${name}">
      ${swatch ? `<span class="lib-swatch squircle" style="background-color: var(${name})"></span>` : ''}
      <code class="lib-row__name">${name}</code>
      ${tokenSelect(name)}
      <span class="lib-muted" data-value-of="${name}">${esc(tokenValue(name))}</span>
      ${usage ? usageWidget(`u:${name}`, list) : ''}
    </div>`;
}

function primitiveRow(p) {
  const editable = p.group === 'color';
  const value = D.primitiveValue(p.name);
  return `
    <div class="lib-prim" data-prim="${p.name}">
      ${editable ? `<input class="lib-picker" type="color" value="${value.toLowerCase()}" data-set-prim="${p.name}" aria-label="${p.name}">` : ''}
      <span class="lib-prim__name">${editable ? esc(primTitle(p.name)) : ''}<code>${p.name}</code></span>
      <span class="lib-muted" data-value-of="${p.name}">${esc(value)}</span>
    </div>`;
}

function primitiveColumn(groups) {
  return groups
    .map((g) => {
      const list = M.primitives.filter((p) => p.group === g);
      if (!list.length) return '';
      return `<p class="lib-col-title">${esc(M.PRIMITIVE_GROUP_TITLES[g])}</p>${list.map(primitiveRow).join('')}`;
    })
    .join('');
}

const group = (key, title, body, open = true) =>
  `<details class="lib-group" data-key="${esc(key)}"${open ? ' open' : ''}><summary>${esc(title)}</summary>${body}</details>`;

const split = (title, left, right) => `
  <h1 class="lib-title">${esc(title)}</h1>
  <div class="lib-split" data-split>
    <div class="lib-split__left"><p class="lib-split__hint">Наведи на примитив — подсветятся токены; клик — оставить только их.</p>${left}</div>
    <div class="lib-split__right">${right}</div>
  </div>`;

// ---------- Экраны основы ----------

function elementOf(name) {
  let rest = name.slice(2).split('-').slice(1).join('-');
  if (rest.startsWith('inverse-')) rest = rest.slice('inverse-'.length);
  const ids = [...M.unitById.keys()].sort((a, b) => b.length - a.length);
  return ids.find((id) => rest === id || rest.startsWith(`${id}-`)) || null;
}

function colorsScreen() {
  const left = primitiveColumn(['color']);
  const right = M.COLOR_TYPES.map((type) => {
    const list = M.tokens.filter((t) => M.tokenKind(t.name) === 'color' && t.name.startsWith(`--${type}-`));
    if (!list.length) return '';
    const general = list.filter((t) => !elementOf(t.name));
    const byUnit = new Map();
    for (const t of list) {
      const el = elementOf(t.name);
      if (!el) continue;
      if (!byUnit.has(el)) byUnit.set(el, []);
      byUnit.get(el).push(t);
    }
    const sub = [];
    if (general.length) sub.push(group(`c:${type}:general`, 'Общие, без элемента', general.map((t) => tokenRow(t.name, { swatch: true })).join('')));
    for (const [id, items] of byUnit) {
      sub.push(group(`c:${type}:${id}`, `${M.unitById.get(id).title} · ${id}`, items.map((t) => tokenRow(t.name, { swatch: true })).join('')));
    }
    return group(`c:${type}`, type, sub.join(''));
  }).join('');
  return split('Цвета', left, right);
}

function sizesScreen() {
  const left = primitiveColumn(['size']);
  const right = SIZE_GROUPS.map(([scale, title]) => {
    const list = M.tokens.filter((t) => M.scaleOf(t.name) === scale);
    return group(`s:${scale}`, title, list.map((t) => tokenRow(t.name)).join(''));
  }).join('');
  return split('Размеры', left, right);
}

function typeScreen() {
  const left = primitiveColumn(['font', 'leading', 'tracking', 'family', 'weight']);
  const right = M.TEXT_STYLES.map((style) => {
    const sample = M.FONT_PARTS.map((p) => `${M.FONT_PROP_BY_PART[p]}: var(--font-${style}-${p})`).join('; ');
    const rows = M.FONT_PARTS.map((p) => tokenRow(`--font-${style}-${p}`, { usage: false })).join('');
    const body = `
      <p class="lib-sample" style="${sample}">Сообщество анонимных дизайнеров</p>
      ${rows}
      <div class="lib-row lib-row--usage"><span class="lib-muted">Где используется</span>${usageWidget(`u:style:${style}`, M.textStyleUsages(style))}</div>`;
    return group(`t:${style}`, style, body);
  }).join('');
  return split('Типографика', left, right);
}

function motionScreen() {
  const left = primitiveColumn(['duration', 'easing']);
  const list = M.tokens.filter((t) => M.tokenKind(t.name) === 'motion');
  const right = group('m:hover', 'Hover: вход мгновенно, уход плавно', list.map((t) => tokenRow(t.name)).join(''));
  return split('Движение', left, right);
}

// ---------- Экран компонента или блока ----------

function statesOf(unit, variant) {
  const set = new Set(['default']);
  for (const r of unit.rules) if (r.variant === variant || r.variant === null) set.add(r.state);
  return M.STATE_ORDER.filter((s) => set.has(s));
}

function stepOptions(varName, current) {
  const kind = M.tokenKind(varName);
  const group = M.primitiveByName.get(M.tokenByName.get(varName)?.primitive)?.group;
  return M.tokens
    .filter((t) => {
      if (M.tokenKind(t.name) !== kind) return false;
      if (kind === 'scale' || kind === 'width') return M.scaleOf(t.name) === M.scaleOf(varName);
      return M.primitiveByName.get(t.primitive)?.group === group;
    })
    .map((t) => `<option value="${t.name}"${t.name === current ? ' selected' : ''}>${t.name}</option>`)
    .join('');
}

// Редактируемые свойства (не цвет) одного набора правил — столбиком, как таблица.
function propRows(unit, rules) {
  const rows = [];
  for (const r of rules) {
    const hint = [r.part, r.state !== 'default' ? r.state : ''].filter(Boolean).join(' · ');
    for (const d of r.decls) {
      if (!d.varName || M.tokenKind(d.varName) === 'color') continue;
      const style = M.textStyleOf(d.varName);
      if (M.tokenKind(d.varName) === 'font') {
        if (d.prop !== 'font-family') continue;
        const current = D.propValue(unit.file, r.selector, 'font', style);
        const options = M.TEXT_STYLES.map((s) => `<option value="${s}"${s === current ? ' selected' : ''}>${s}</option>`).join('');
        rows.push(propRow('текстовый стиль', d.label, hint, `<select class="lib-select" data-set-prop="${esc(r.selector)}" data-prop="font" data-file="${unit.file}" data-from="${style}">${options}</select>`));
        continue;
      }
      const current = D.propValue(unit.file, r.selector, d.prop, d.varName);
      rows.push(propRow(d.prop, d.label, hint, `<select class="lib-select" data-set-prop="${esc(r.selector)}" data-prop="${d.prop}" data-file="${unit.file}" data-from="${d.varName}">${stepOptions(d.varName, current)}</select>`));
    }
  }
  return rows.join('');
}
const propRow = (name, label, hint, control) => `
  <div class="lib-prop">
    <div class="lib-prop__text">
      <code>${esc(name)}</code>${hint ? ` <span class="lib-muted">${esc(hint)}</span>` : ''}
      ${label ? `<span class="lib-prop__label">${esc(label)}</span>` : ''}
    </div>
    ${control}
  </div>`;

// Компоненты — пример из <имя>.demo.js; блоки и элементы — разметка лендинга (index.html).
// Широкое превью ставится в кадр шириной лендинга и масштабируется под область (layoutFrames).
function demoNode(unit, variant, state) {
  const fromLanding = unit.kind !== 'component';
  const preview = fromLanding ? M.landingPreview(unit, variant) : { html: unit.demo[variant], crop: false };
  if (!preview?.html) {
    const where = fromLanding ? 'index.html' : unit.file.replace(/\.css$/, '.demo.js');
    return `<span class="lib-muted">Нет примера в ${esc(where)}</span>`;
  }
  const tpl = document.createElement('template');
  tpl.innerHTML = preview.html.trim();
  const target = tpl.content.querySelector('[data-preview-target]') || tpl.content.firstElementChild;
  if (state !== 'default') target.setAttribute('data-state', state);
  const framed = fromLanding || unit.id === 'container';
  if (!framed) return tpl.innerHTML;
  return `<div class="lib-frame" data-frame${preview.crop ? ' data-crop' : ''}><div class="lib-frame__page">${tpl.innerHTML}</div></div>`;
}

function sceneAttrs(unit, variant) {
  const classes = ['lib-scene', 'squircle'];
  if (!unit.surface && variant.startsWith('inverse')) classes.push('lib-scene--inverse');
  if (unit.kind === 'block' || unit.id === 'container') classes.push('lib-scene--page');
  const style = unit.surface ? ` style="background-color: var(${unit.surface}); border-color: var(${unit.surface})"` : '';
  return `class="${classes.join(' ')}"${style}`;
}

// Кадр: страница шириной лендинга, масштаб = доступная ширина / ширина кадра (не больше 1).
// У элемента кадр обрезается по самому элементу — сцена обнимает его с полями.
function layoutFrames() {
  const available = mainEl.clientWidth - parseFloat(getComputedStyle(mainEl).paddingInlineStart) * 2;
  for (const frame of mainEl.querySelectorAll('[data-frame]')) {
    const page = frame.firstElementChild;
    const scene = frame.closest('.lib-scene');
    const scenePad = parseFloat(getComputedStyle(scene).paddingInlineStart) * 2;
    page.style.transform = 'none';
    page.style.inlineSize = `${LANDING_WIDTH}px`;
    const pageBox = page.getBoundingClientRect();
    let box = { x: 0, y: 0, w: LANDING_WIDTH, h: page.scrollHeight };
    const target = frame.hasAttribute('data-crop') && page.querySelector('[data-preview-target]');
    if (target) {
      const r = target.getBoundingClientRect();
      box = { x: r.left - pageBox.left, y: r.top - pageBox.top, w: r.width, h: r.height };
    }
    const k = Math.min(1, (available - scenePad) / box.w);
    frame.style.inlineSize = `${box.w * k}px`;
    frame.style.blockSize = `${box.h * k}px`;
    page.style.transform = `scale(${k}) translate(${-box.x}px, ${-box.y}px)`;
  }
}

function colorEntry(d, part) {
  return `
    <div class="lib-entry">
      <span class="lib-swatch lib-swatch--small squircle" style="background-color: var(${d.varName})"></span>
      <a href="#colors?t=${encodeURIComponent(d.varName)}"><code>${d.varName}</code></a>
      ${part ? `<span class="lib-muted">${esc(part)}</span>` : ''}
      ${tokenSelect(d.varName)}
    </div>`;
}

function colorTable(unit, variant, states) {
  const ownRules = unit.rules.filter((r) => r.variant === (variant || null));
  const entries = (state, type) =>
    ownRules
      .filter((r) => r.state === state)
      .flatMap((r) => r.decls.filter((d) => isColorDecl(d) && colorType(d) === type).map((d) => colorEntry(d, r.part)));
  const head = states.length > 1 ? `<tr><th></th>${states.map((s) => `<th>${s}</th>`).join('')}</tr>` : '';
  // Строки surface, border, text — всегда; icon и effect — если они есть у варианта.
  const present = new Set(ownRules.flatMap((r) => r.decls.filter(isColorDecl).map(colorType)));
  const types = M.COLOR_TYPES.filter((t) => ['surface', 'border', 'text'].includes(t) || present.has(t));
  const rows = types.map((type) => {
    const title = type;
    const cells = states.map((s) => {
      if (s === 'focus') {
        if (type !== 'border') return '<td class="lib-muted">как default</td>';
        const ring = entries(s, 'ring');
        return `<td>${ring.length ? ring.join('') : '—'}</td>`;
      }
      const list = entries(s, type);
      return `<td>${list.length ? list.join('') : '<span class="lib-muted">—</span>'}</td>`;
    });
    return `<tr><th>${title}</th>${cells.join('')}</tr>`;
  }).join('');
  return `<table class="lib-table">${head}${rows}</table>`;
}

function variantTokens(unit, variant, states) {
  const ownRules = unit.rules.filter((r) => r.variant === (variant || null));
  const hasColor = ownRules.some((r) => r.decls.some(isColorDecl));
  const sizes = variant ? propRows(unit, ownRules) : '';
  if (!hasColor && !sizes) return '';
  return `
    <details class="lib-tokens" data-key="v:${unit.id}:${variant}">
      <summary>Токены варианта ▾</summary>
      ${hasColor ? colorTable(unit, variant, states) : ''}
      ${sizes ? `<p class="lib-col-title">Размеры</p><div class="lib-props">${sizes}</div>` : ''}
    </details>`;
}

const links = (units) =>
  units.length ? units.map((u) => `<a href="${M.routeOf(u)}">${esc(u.title)}</a>`).join(', ') : '<span class="lib-muted">—</span>';

function unitScreen(unit) {
  const baseRows = propRows(unit, unit.rules.filter((r) => r.variant === null));
  const withStates = unit.variants.some((v) => statesOf(unit, v || null).length > 1);
  let variants;
  if (withStates) {
    variants = unit.variants
      .map((v) => {
        const states = statesOf(unit, v || null);
        const cells = states
          .map((s) => `<figure class="lib-cell" data-cell="${v}|${s}"><figcaption>${s}</figcaption>${demoNode(unit, v, s)}</figure>`)
          .join('');
        return `
          <section class="lib-variant" data-variant="${v}">
            ${unit.variants.length > 1 || v ? `<h2 class="lib-h">${esc(v || unit.id)}</h2>` : ''}
            <div ${sceneAttrs(unit, v)}><div class="lib-states">${cells}</div></div>
            ${variantTokens(unit, v, states)}
          </section>`;
      })
      .join('');
  } else {
    variants = `<div class="lib-variants-row">${unit.variants
      .map(
        (v) => `
        <section class="lib-variant lib-variant--inline" data-variant="${v}">
          ${unit.variants.length > 1 ? `<h2 class="lib-h">${esc(v || unit.id)}</h2>` : ''}
          <div ${sceneAttrs(unit, v)} data-cell="${v}|default">${demoNode(unit, v, 'default')}</div>
          ${variantTokens(unit, v, ['default'])}
        </section>`,
      )
      .join('')}</div>`;
  }
  const elements = unit.kind === 'block' ? M.blocks.find((b) => b.main === unit)?.elements || [] : [];
  return `
    <h1 class="lib-title">${esc(unit.title)} <code class="lib-muted">${esc(unit.file)}</code></h1>
    ${unit.description ? `<p class="lib-lead">${esc(unit.description)}</p>` : ''}
    <dl class="lib-links">
      <dt>Состоит из</dt><dd>${links(M.consistsOf(unit).filter((u) => !elements.includes(u)))}</dd>
      ${unit.kind === 'block' ? `<dt>Элементы</dt><dd>${links(elements)}</dd>` : ''}
      <dt>Используется в</dt><dd>${links(M.usedIn(unit))}</dd>
    </dl>
    ${baseRows ? `<section class="lib-common"><h2 class="lib-h">${unit.kind === 'block' ? 'Шаги шкал блока' : 'Общее для всех вариантов'}</h2><div class="lib-props">${baseRows}</div></section>` : ''}
    ${variants}`;
}

// ---------- Отрисовка ----------

let filterPrim = null;

function render() {
  const { path, params } = parseRoute();
  filterPrim = null;
  let html;
  if (path === 'colors') html = colorsScreen();
  else if (path === 'sizes') html = sizesScreen();
  else if (path === 'type') html = typeScreen();
  else if (path === 'motion') html = motionScreen();
  else {
    const id = path.split('/').pop();
    const unit = M.unitById.get(id);
    html = unit ? unitScreen(unit) : '<p class="lib-muted">Такого раздела нет.</p>';
  }
  mainEl.innerHTML = html;
  for (const page of mainEl.querySelectorAll('.lib-frame__page')) fixOrphans(page);
  layoutFrames();
  mainEl.scrollTop = 0;
  renderNav();
  refresh();
  flash(params);
}

function flash(params) {
  let target = null;
  const t = params.get('t');
  if (t) target = document.getElementById(`row${t}`);
  const v = params.get('v') ?? '';
  const s = params.get('s');
  if (!target && s) target = mainEl.querySelector(`[data-cell="${CSS.escape(`${v}|${s}`)}"]`);
  if (!target && params.has('v')) target = mainEl.querySelector(`[data-variant="${CSS.escape(v)}"]`);
  if (!target) return;
  for (let el = target.parentElement; el && el !== mainEl; el = el.parentElement) if (el.tagName === 'DETAILS') el.open = true;
  target.classList.add('is-flash');
  target.scrollIntoView({ block: 'center' });
}

// Обновить значения на экране без перерисовки (черновик поменялся).
function refresh() {
  for (const el of mainEl.querySelectorAll('[data-value-of]')) {
    const name = el.dataset.valueOf;
    el.textContent = name.startsWith('--p-') ? D.primitiveValue(name) : tokenValue(name);
  }
  for (const el of mainEl.querySelectorAll('[data-uses-of]')) el.dataset.uses = D.tokenPrimitive(el.dataset.usesOf);
  for (const el of mainEl.querySelectorAll('[data-set-token]')) el.value = D.tokenPrimitive(el.dataset.setToken);
  for (const el of mainEl.querySelectorAll('[data-set-prim]')) {
    if (document.activeElement !== el) el.value = D.primitiveValue(el.dataset.setPrim).toLowerCase();
  }
  for (const el of mainEl.querySelectorAll('[data-set-prop]')) {
    el.value = D.propValue(el.dataset.file, el.dataset.setProp, el.dataset.prop, el.dataset.from);
  }
  const changed = D.changedVars();
  for (const el of mainEl.querySelectorAll('[data-uses-of], [data-prim]')) {
    el.classList.toggle('is-changed', changed.has(el.dataset.usesOf || el.dataset.prim));
  }
  for (const el of mainEl.querySelectorAll('[data-set-prop]')) {
    el.closest('.lib-prop')?.classList.toggle('is-changed', el.value !== el.dataset.from);
  }
  document.querySelector('[data-count]').textContent = D.changes().length;
  renderNav();
  applyProbe();
  if (dialogEl.open) renderDialog();
}

// ---------- Подсветка по примитиву ----------

let probePrim = null;
function applyProbe() {
  const split = mainEl.querySelector('[data-split]');
  if (!split) return;
  const prim = filterPrim || probePrim;
  split.classList.toggle('is-probing', Boolean(prim));
  split.classList.toggle('is-filtering', Boolean(filterPrim));
  for (const el of split.querySelectorAll('[data-uses]')) el.classList.toggle('is-hit', Boolean(prim) && el.dataset.uses === prim);
  for (const el of split.querySelectorAll('[data-prim]')) el.classList.toggle('is-picked', el.dataset.prim === filterPrim);
}

mainEl.addEventListener('mouseover', (e) => {
  const row = e.target.closest('[data-prim]');
  const next = row ? row.dataset.prim : null;
  if (next !== probePrim) {
    probePrim = next;
    applyProbe();
  }
});
mainEl.addEventListener('mouseleave', () => {
  probePrim = null;
  applyProbe();
});
mainEl.addEventListener('click', (e) => {
  const row = e.target.closest('[data-prim]');
  if (!row || e.target.closest('input')) return;
  filterPrim = filterPrim === row.dataset.prim ? null : row.dataset.prim;
  applyProbe();
});

// ---------- Правка ----------

mainEl.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.setPrim) D.setPrimitive(el.dataset.setPrim, el.value);
});
mainEl.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.setToken) D.setToken(el.dataset.setToken, el.value);
  if (el.dataset.setProp) D.setProp(el.dataset.file, el.dataset.setProp, el.dataset.prop, el.dataset.from, el.value);
});

// ---------- Панель ----------

function renderDialog() {
  const list = D.changes();
  const items = list
    .map(
      (c, i) => `
      <li class="lib-change">
        <code>${esc(c.file)}</code> <code>${esc(c.selector)}</code> → <code>${esc(c.prop)}</code>:
        <code>${esc(c.from)}</code> → <code>${esc(c.to)}</code>${c.note ? ` <span class="lib-muted">${esc(c.note)}</span>` : ''}
        <button class="lib-btn" type="button" data-revert="${i}">Вернуть</button>
      </li>`,
    )
    .join('');
  dialogEl.innerHTML = `
    <div class="lib-dialog__head">
      <h2 class="lib-h">Изменения черновика (${list.length})</h2>
      <button class="lib-btn" type="button" data-close>Закрыть</button>
    </div>
    ${list.length ? `<ul class="lib-changes">${items}</ul>` : '<p class="lib-muted">Правок нет.</p>'}
    <p class="lib-col-title">Текст для Claude Code</p>
    <textarea class="lib-markdown" readonly>${esc(D.markdown())}</textarea>`;
}

dialogEl.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]') || e.target === dialogEl) dialogEl.close();
  const revert = e.target.closest('[data-revert]');
  if (revert) D.revert(D.changes()[Number(revert.dataset.revert)]);
});
document.querySelector('[data-show-changes]').addEventListener('click', () => {
  renderDialog();
  dialogEl.showModal();
});
document.querySelector('[data-reset]').addEventListener('click', () => {
  if (D.changes().length && confirm('Сбросить все правки черновика?')) D.reset();
});
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(D.markdown());
    copyBtn.textContent = 'Скопировано ✓';
  } catch {
    renderDialog();
    dialogEl.showModal();
    dialogEl.querySelector('.lib-markdown').select();
  }
});

D.onDraftChange(() => {
  copyBtn.textContent = 'Скопировать изменения для Claude Code';
  refresh();
});

// ---------- Старт ----------

initTheme();
initHoverSuppress();
D.apply();
window.addEventListener('hashchange', render);
window.addEventListener('resize', layoutFrames);
// Шрифт и фото догружаются после первой раскладки — пересчитать кадры.
document.fonts?.ready.then(layoutFrames);
mainEl.addEventListener('load', layoutFrames, true);
render();
