# SESSION.md — sad-meetup

**Назначение:** текущее состояние — файл состояния, переписывается целиком при
каждом обновлении; прежнее перед этим дописывается в `docs/journal/ГГГГ-ММ.md`
(правила 6.2 и 6.6 глобального CLAUDE.md). **Потолок — 80 строк и 6 КБ** (по умолчанию).

## Задача и ветка

Правки из витрины (2026-10-29). Закрыта, влита в `main` fast-forward, ветка
`fix/library-edits` удалена.

## Где остановились

- Coral темнее: `#FF8C69` → `#F47C57`. Задевает и ошибку поля в подвале.
- Главная кнопка на тёмном (`inverse-primary`) в default — Coral: фон и обводка.
  Hovered (Paper) и active (Slate) не трогали.
- Меню шапки: промежуток `--space-l` → `--space-2xl`.
- Проверено: dev и prod-preview совпадают, консоль чистая.
- `.claude/launch.json` (конфиг dev-сервера для панели браузера) — не в git,
  решение не принято.

## Следующий шаг

- Шейдер в хиро (BACKLOG.md); материалы — `~/Desktop/stream/shader/`.

## Не проверено вживую

- Hover кнопок (вход мгновенно, уход 160 ms), hover-suppression, кольца фокуса.
- Пипетка цвета и подсветка токенов в витрине.
- Onest: fonttools и живой Windows (BACKLOG, техдолг).

## Открытые вопросы

- Нет.

## Последние коммиты

- `506f759` style(header): widen gap between nav items to space-2xl
- `a9d3d72` style(tokens): darken coral and make inverse primary button coral
- `d0d7929` docs(session): landing task closed and merged
- `fbf091c` feat(landing): add block elements, landing blocks and assembled landing page

## Решения

DECISIONS.md — «Стек и устройство», «Лендинг», «Токены».
