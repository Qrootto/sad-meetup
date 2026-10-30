import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Prod-сборка живёт на GitHub Pages в подпапке репозитория (DEPLOY.md).
const PAGES_BASE = '/sad-meetup/';

// /library без слэша ведёт на витрину (глобальное правило 5.4).
const libraryRedirect = (base) => (req, res, next) => {
  if (req.url === `${base}library`) {
    res.statusCode = 301;
    res.setHeader('Location', `${base}library/`);
    res.end();
    return;
  }
  next();
};

export default defineConfig(({ command, isPreview }) => {
  const base = command === 'build' || isPreview ? PAGES_BASE : '/';
  return {
    base,
    server: { port: 5190 },
    preview: { port: 5191 },
    plugins: [
      {
        name: 'library-redirect',
        configureServer(server) {
          server.middlewares.use(libraryRedirect(base));
        },
        configurePreviewServer(server) {
          server.middlewares.use(libraryRedirect(base));
        },
      },
    ],
    build: {
      rollupOptions: {
        input: {
          main: fileURLToPath(new URL('./index.html', import.meta.url)),
          library: fileURLToPath(new URL('./library/index.html', import.meta.url)),
        },
      },
    },
  };
});
