// Висячие предлоги и короткие слова (глобальное правило 5.3): после слова из
// списка обычный пробел заменяется неразрывным. Обходит текстовые узлы и
// пропускает короткие надписи — кнопки, теги, пункты меню, ссылки, поля.

const SHORT_WORDS = [
  'в', 'на', 'у', 'к', 'с', 'о', 'об', 'по', 'от', 'до', 'из', 'за', 'для', 'без', 'над', 'под', 'при', 'про',
  'и', 'а', 'но', 'или', 'да', 'же', 'ли',
  'бы', 'не', 'ни',
  'я', 'ты', 'мы', 'вы', 'он', 'она', 'оно', 'они',
];
const SKIP = 'button, .button, .tag, .nav-item, .link, input, textarea, select, label, script, style, code';
const PATTERN = new RegExp(`(?<=^|[\\s(«"„])(${SHORT_WORDS.join('|')})[ \\t\\n]+(?=\\S)`, 'giu');

export function fixOrphansText(text) {
  return text.replace(PATTERN, '$1 ');
}

export function fixOrphans(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const next = fixOrphansText(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  }
}
