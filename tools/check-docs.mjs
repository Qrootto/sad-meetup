/* check-docs.mjs — служебные md не разрастаются (правило 6.6 глобального
   CLAUDE.md, решения Артёма 25.10.2026). Падает, если md репозитория
   превышает потолок.

     node tools/check-docs.mjs

   Входит в проверки перед вливанием (CLAUDE.md проекта, «Режим проверок»,
   п. 3). Тот же разбор — в глобальном хуке ~/.claude/hooks/md-ceiling.py
   (предупреждает после каждой записи md).

   Потолки:
   - по умолчанию — здесь: SESSION.md 80 строк и 6 КБ, DECISIONS.md 20 КБ;
   - остальные md — только если потолок указан в шапке файла (строки до
     первого заголовка «## »): строка со словом «потолок» и числами
     «N строк» / «N КБ»;
   - исключение — в шапке: «потолок: 90 строк — <причина>, ГГГГ-ММ-ДД,
     разрешено Артёмом»; действует, только если есть все три части, иначе у
     SESSION.md / DECISIONS.md — потолок по умолчанию.
   Превышен потолок — сначала ужать, потом писать (правило 6.6). */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DEFAULTS = { 'SESSION.md': { lines: 80, kb: 6 }, 'DECISIONS.md': { kb: 20 } };

const NUM = /(\d+(?:[.,]\d+)?)\s*(строк|КБ|KB|Кб)/gi;
const DATE = /\d{4}-\d{2}-\d{2}/;
const ALLOWED = /разрешено\s+Арт[её]мом/i;

const valuesOf = (line) => {
  const out = {};
  for (const [, n, unit] of line.matchAll(NUM)) {
    const v = Number(n.replace(',', '.'));
    if (unit.toLowerCase().startsWith('строк')) out.lines = Math.trunc(v); else out.kb = v;
  }
  return Object.keys(out).length ? out : null;
};
// Причина — текст после тире до даты, хотя бы одно слово из букв.
const hasReason = (line) => {
  const m = line.match(new RegExp(`[—–-]\\s*(.+?)${DATE.source}`));
  return Boolean(m && /[A-Za-zА-Яа-яЁё]{3,}/.test(m[1]));
};

// → { limit, kind: 'exception' | 'plain' | 'incomplete' } или null.
function headerCeiling(text) {
  const head = [];
  for (const [i, line] of text.split('\n').entries()) {
    if ((i && line.startsWith('## ')) || i > 40) break;
    head.push(line);
  }
  let plain = null, incomplete = null;
  for (const line of head) {
    if (!line.toLowerCase().includes('потолок')) continue;
    const v = valuesOf(line);
    if (!v) continue;
    const tried = DATE.test(line) || /разрешено/i.test(line);
    if (tried && DATE.test(line) && ALLOWED.test(line) && hasReason(line)) return { limit: v, kind: 'exception' };
    if (tried) incomplete ??= v; else plain ??= v;
  }
  if (plain) return { limit: plain, kind: 'plain' };
  if (incomplete) return { limit: incomplete, kind: 'incomplete' };
  return null;
}

const files = execFileSync('git', ['ls-files', '-z', '--', '*.md'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
let failed = 0, checked = 0;
for (const file of files) {
  const text = readFileSync(resolve(ROOT, file), 'utf8');
  const head = headerCeiling(text);
  const name = basename(file);
  let limit, source, note = '';
  if (DEFAULTS[name] && head?.kind !== 'exception') {
    limit = DEFAULTS[name]; source = 'по умолчанию';
    if (head?.kind === 'incomplete') note = ' — строка исключения неполная (нужны причина, дата и «разрешено Артёмом»)';
  } else if (head && head.kind !== 'incomplete') {
    limit = head.limit; source = head.kind === 'exception' ? 'исключение в шапке' : 'из шапки';
  } else continue;
  checked++;
  const lines = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
  const kb = Buffer.byteLength(text) / 1024;
  const over = (limit.lines && lines > limit.lines) || (limit.kb && kb > limit.kb);
  if (over) failed++;
  const lim = [limit.lines && `${limit.lines} строк`, limit.kb && `${limit.kb} КБ`].filter(Boolean).join(' и ');
  console.log(`${over ? 'FAIL' : '  ok'}  ${file}: ${lines} строк, ${kb.toFixed(1)} КБ (потолок ${lim}, ${source}${note})`);
}
console.log(failed ? `\nпревышен потолок: ${failed} из ${checked} — сначала ужать (правило 6.6)` : `\nвсе в пределах (${checked} файлов с потолком)`);
process.exit(failed ? 1 : 0);
