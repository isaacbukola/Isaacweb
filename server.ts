import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Healing logic: If someone hits ?s=, redirect to #s=
  app.get("/", (req, res, next) => {
    const s = req.query.s;
    if (s && typeof s === 'string') {
      return res.redirect(`/#s=${s}`);
    }
    next();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the built files from 'dist'
    const distPath = path.resolve(__dirname, 'dist');
    console.log(`Production Mode: Serving static files from ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`IDB SECRET SERVER is alive at http://localhost:${PORT}`);
  });
}

startServer();
