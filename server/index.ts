import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { dbErrorHandler, isDatabaseUnavailable, DB_UNAVAILABLE_CODE } from "./db-error";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

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

      log(logLine);
    }
  });

  next();
});

(async () => {
  log(`Starting server in ${process.env.NODE_ENV || 'development'} mode...`);
  
  try {
    log("Registering routes...");
    await registerRoutes(httpServer, app);
    log("Routes registered successfully");

    app.use(dbErrorHandler);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      if (isDatabaseUnavailable(err)) {
        console.error("[DB_UNAVAILABLE] Final handler:", err.message);
        return res.status(503).json({ 
          code: DB_UNAVAILABLE_CODE, 
          message: "Database temporarily unavailable. Please try again shortly." 
        });
      }
      
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error(err);
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (process.env.NODE_ENV === "production") {
      log("Setting up static file serving for production...");
      serveStatic(app);
      log("Static file serving configured");
    } else {
      log("Setting up Vite for development...");
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
      log("Vite configured");
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || "5000", 10);
    const host = "0.0.0.0";
    
    log(`Attempting to listen on ${host}:${port}...`);
    
    httpServer.listen(
      {
        port,
        host,
        reusePort: true,
      },
      async () => {
        log(`Server successfully started and listening on http://${host}:${port}`);
        console.log(`Server is ready to accept connections on port ${port}`);

        // Auto-run force regeneration in DEV if env var is set
        if (process.env.FORCE_REGEN_ON_STARTUP === 'true' && process.env.NODE_ENV !== 'production') {
          // Check guard to prevent repeated runs
          const { db } = await import('./db');
          const { sql } = await import('drizzle-orm');
          
          try {
            // Check if we've already run force regen in this session
            const guardKey = 'FORCE_REGEN_STARTUP_COMPLETED';
            const existingGuard = process.env[guardKey];
            
            if (existingGuard === 'true') {
              log('[FORCE REGEN STARTUP] Already ran this session, skipping.');
              return;
            }
            
            log('[FORCE REGEN STARTUP] FORCE_REGEN_ON_STARTUP=true detected in DEV mode. Starting force regeneration...');
            
            // Set guard
            process.env[guardKey] = 'true';
            
            const { forceRegenerateAllTrainings } = await import('./manualAnalysisService');
            const report = await forceRegenerateAllTrainings();
            
            log(`[FORCE REGEN STARTUP] Completed: ${report.regeneratedCount} regenerated, ${report.skippedCount} skipped, ${report.failedCount} failed.`);
            log(`[FORCE REGEN STARTUP] Duration: ${report.totalDurationMs}ms`);
            
            if (report.failures.length > 0) {
              log(`[FORCE REGEN STARTUP] Failures:`);
              for (const failure of report.failures) {
                log(`  - ${failure.title}: ${failure.reason}`);
              }
            }
          } catch (error) {
            log(`[FORCE REGEN STARTUP] Error during force regeneration: ${error}`);
          }
        }
      },
    );
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
