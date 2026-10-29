import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// /library без слэша ведёт на витрину (глобальное правило 5.4).
const libraryRedirect = (req, res, next) => {
  if (req.url === '/library') {
    res.statusCode = 301;
    res.setHeader('Location', '/library/');
    res.end();
    return;
  }
  next();
};

export default defineConfig({
  server: { port: 5190 },
  preview: { port: 5191 },
  plugins: [
    {
      name: 'library-redirect',
      configureServer: (server) => server.middlewares.use(libraryRedirect),
      configurePreviewServer: (server) => server.middlewares.use(libraryRedirect),
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
});
