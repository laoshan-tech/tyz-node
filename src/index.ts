import { Hono } from "hono";
import gostRouter, { supabaseService } from "@/routers/gost";
import { loadConfig } from "@/utils/config";
import { logger } from "@/utils/logger";

// Load configuration
const config = loadConfig();

// Create Hono app
const app = new Hono();

// Middleware: Request logging
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  logger.info("HTTP request", {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration: `${duration}ms`,
  });
});

app.route("/gost", gostRouter);

// Health check endpoint
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "tyz-node",
  });
});

// Start server
const server = Bun.serve({
  port: config.port,
  hostname: config.host,
  fetch: app.fetch,
});

logger.info(`Server started`, {
  url: `http://${config.host}:${config.port}`,
  gostApi: config.gostApiUrl,
  supabaseUrl: config.supabaseUrl,
});

// Start Supabase realtime subscription
supabaseService.start().catch((error) => {
  logger.error("Failed to start Supabase service", { error });
  process.exit(1);
});

// Graceful shutdown
let isShuttingDown = false;

const shutdown = async () => {
  // Prevent duplicate shutdown calls
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info("Shutting down...");

  try {
    await supabaseService.stop();
    await server.stop();
    logger.info("Shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown", { error });
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
