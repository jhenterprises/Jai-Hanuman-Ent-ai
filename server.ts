import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import path from "path";
import apiRouter from "./api/index.js";
import { errorHandler } from "./middleware/error.js";
import { env } from "./config/env.js";
import { logger } from "./loggers/index.js";
import morgan from "morgan";

const expressApp = express();

// Security and utility Middlewares
expressApp.use(helmet({
  contentSecurityPolicy: false, // disabled for vite dev
}));
expressApp.use(cors({ origin: true, credentials: true }));
expressApp.use(express.json());
expressApp.set('trust proxy', 1);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

expressApp.use('/api', apiLimiter);

// Logger
expressApp.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Proxy image route to bypass CORS
expressApp.get("/api/proxy-image", async (req, res) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl) return res.status(400).send("URL is required");

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    
    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    logger.error("Proxy image error:", error);
    res.status(500).send("Failed to proxy image: " + error.message);
  }
});

// Modular Routers
expressApp.use('/api', apiRouter);

// Global Error Handler
expressApp.use(errorHandler);

async function startServer() {
  const PORT = Number(env.PORT || 3000);

  if (env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    expressApp.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    expressApp.use(express.static(distPath));
    expressApp.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    expressApp.listen(PORT, "0.0.0.0", () => {
      logger.info(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default expressApp;
