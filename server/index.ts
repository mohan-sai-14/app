import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { setupVite, serveStatic, log, setupSessionExpirationCheck } from "./vite";
import http from "http";

const app = express();

// CORS Configuration
app.use(cors({
  origin: ["http://localhost:5173", "https://attendance-edc45.web.app"], 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Initialize server
async function init() {
  // Create HTTP server
  const server = http.createServer(app);
  
  // Setup Vite in development mode
  if (process.env.NODE_ENV !== "production") {
    await setupVite(app, server);
  } else {
    // In production serve static files
    serveStatic(app);
  }

  // Register API routes
  await registerRoutes(app);
  
  // Add error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    res.status(status).json({ message });
    if (process.env.NODE_ENV !== 'production') {
      throw err;
    } else {
      console.error(err);
    }
  });

  // Setup session expiration checking
  await setupSessionExpirationCheck(storage);

  // Start the server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
  
  return server;
}

// Start the server
init().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
