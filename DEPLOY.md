# DEPLOY.md — sad-meetup

Инструкция по выкладке проекта в production.

## Где живёт прод

- Платформа: GitHub Pages.
- Репозиторий: `Qrootto/sad-meetup`, публичный (Pages на бесплатном плане — только так).
- Лендинг: https://qrootto.github.io/sad-meetup/
- Витрина: https://qrootto.github.io/sad-meetup/library/
- Кастомного домена нет.

## Как деплоить

- Ветка: `main`.
- Триггер: автоматически при push в `main` (`.github/workflows/pages.yml`);
  вручную — Actions → Deploy to GitHub Pages → Run workflow.
- Build command: `npm ci && npm run build`, Node 20. Output directory: `dist`.
- Env vars: нет.
- Push в `main` = обновление публичного сайта, поэтому проверки перед вливанием
  (prod-preview и dev) обязательны.

## Особенности и лимиты тарифа

- Сайт лежит в подпапке `/sad-meetup/`: `base` в `vite.config.js` (только для
  build и preview; dev — на `/`). Локальный prod-preview:
  `npm run build && npx vite preview` → http://localhost:5191/sad-meetup/
- Корневые пути (`/speakers/…`) в `index.html` Vite переписывает сам; в витрине
  `index.html` приходит через `?raw` — там префикс ставит `library/model.js`.
- `/library` без слэша Pages сам редиректит на `/library/`.

## История миграций

- 2026-10-30 — первая выкладка на GitHub Pages; до этого проект был только локальным.
