# SESSION.md — sad-meetup

**Назначение:** текущее состояние — файл состояния, переписывается целиком при
каждом обновлении; прежнее перед этим дописывается в `docs/journal/ГГГГ-ММ.md`
(правила 6.2 и 6.6 глобального CLAUDE.md). **Потолок — 80 строк и 6 КБ** (по умолчанию).

## Задача и ветка

Выкладка на GitHub Pages (2026-10-30). Закрыта, влита в `main` fast-forward,
ветка `chore/github-pages` удалена, `main` запушен в `origin`.

## Где остановились

- Репозиторий: https://github.com/Qrootto/sad-meetup (публичный).
- Лендинг: https://qrootto.github.io/sad-meetup/
- Витрина: https://qrootto.github.io/sad-meetup/library/
- Push в `main` = обновление публичного сайта (DEPLOY.md).
- CLAUDE.md всё ещё говорит «без GitHub» — оставлено сознательно, исключение
  в DECISIONS.md.
- `.claude/launch.json` (конфиг dev-сервера для панели) — не в git, решения нет.

## Следующий шаг

- Шейдер в хиро (BACKLOG.md); материалы — `~/Desktop/stream/shader/`.

## Не проверено вживую

- Hover кнопок (вход мгновенно, уход 160 ms), hover-suppression, кольца фокуса.
- Пипетка цвета и подсветка токенов в витрине.
- Onest: fonttools и живой Windows (BACKLOG, техдолг).

## Открытые вопросы

- Нет.

## Последние коммиты

- `57355a0` docs(deploy): describe GitHub Pages setup and record the exception
- `bd520cf` chore(deploy): build under /sad-meetup/ and deploy to GitHub Pages via Actions
- `57a9544` fix(library): prefix root asset paths in previews with base url
- `21fa8c8` docs(session): library edits merged

## Решения

DECISIONS.md — «Стек и устройство», «Лендинг», «Токены».
