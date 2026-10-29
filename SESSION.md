# SESSION.md — sad-meetup

**Назначение:** текущее состояние — файл состояния, переписывается целиком при
каждом обновлении; прежнее перед этим дописывается в `docs/journal/ГГГГ-ММ.md`
(правила 6.2 и 6.6 глобального CLAUDE.md). **Потолок — 80 строк и 6 КБ** (по умолчанию).

## Задача и ветка

Задача 2 — элементы, блоки, лендинг (2026-10-29). Ветка `feature/landing` →
влить в `main` в конце задачи.

## Где остановились

- Элементы: schedule-row, speaker-card, price-card, faq-item, link.
- Блоки: header (внутри hero), hero (пустой canvas под шейдер), program,
  speakers, tickets, faq, footer (подписка с проверкой адреса).
- `index.html` — лендинг из компонентов и блоков; fixOrphans().
- Витрина: группа «Блоки» с элементами, превью из `index.html` с масштабом,
  фон сцены из `@surface`.
- Проверено скриптом на prod-preview и dev: консоль чистая, сетка, выравнивание.

## Следующий шаг

- Шейдер в хиро (BACKLOG.md).

## Открытые вопросы

- Нет.

## Последние коммиты

- `853b48b` fix(vite): keep library redirect hooks from returning the middleware
- `fc431bf` docs(session): design system task closed and merged
- `911288f` feat(design-system): add primitives, tokens, scales, text styles, base components and library editor

## Решения

DECISIONS.md — «Стек и устройство», «Лендинг», «Токены».
