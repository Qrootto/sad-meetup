// Hover-suppression после клика (глобальное правило 5.5): пока курсор
// остаётся на элементе после клика, hover-стейт не показывается.
// CSS компонентов пишет hover как :hover:not(.no-hover).
const SELECTOR = '.button, .nav-item, .faq-item__question';

export function initHoverSuppress(root = document) {
  root.addEventListener('click', (event) => {
    const el = event.target.closest(SELECTOR);
    if (!el || el.classList.contains('no-hover')) return;
    el.classList.add('no-hover');
    el.addEventListener('pointerleave', () => el.classList.remove('no-hover'), { once: true });
  });
}
