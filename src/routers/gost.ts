import { Hono } from "hono";
import { generateGostConfig } from "@/services/gost/builder";
import { GostClient } from "@/services/gost/client";
import { SupabaseService } from "@/services/supabase";
import type { NodeConfigData } from "@/types/database";
import type { GostObserverStats } from "@/types/gost";
import { loadConfig } from "@/utils/config";
import { logger } from "@/utils/logger";

// Load configuration
const config = loadConfig();

// Build API URL for internal communication
const apiUrl = `http://${config.host === "0.0.0.0" ? "localhost" : config.host}:${config.port}`;

const gostClient = new GostClient(config.gostApiUrl, config.gostApiAuth);
const supabaseService = new SupabaseService(
  config.supabaseUrl,
  config.supabaseKey,
  config.supabaseTable,
  apiUrl,
);

const gostRouter = new Hono();

// Config update endpoint - converts database config to GOST format and applies it
gostRouter.post("/config/update", async (c) => {
  try {
    const configData: NodeConfigData = await c.req.json();

    // Validate config data structure
    if (!configData.node || !configData.rules) {
      return c.json(
        { ok: false, error: "Invalid config data: missing node or rules" },
        400,
      );
    }

    logger.info("Processing config update via API", {
      nodeId: configData.node.id,
      rulesCount: configData.rules.length,
      tunnelsCount: configData.tunnels?.length || 0,
      chainsCount: configData.chains?.length || 0,
    });

    // Generate GOST configuration from database data
    const gostConfig = generateGostConfig(configData);

    logger.debug("GOST config generated", {
      servicesCount: gostConfig.services?.length || 0,
      chainsCount: gostConfig.chains?.length || 0,
      limitersCount:
        (gostConfig.limiters?.length || 0) +
        (gostConfig.rlimiters?.length || 0) +
        (gostConfig.climiters?.length || 0),
    });

    // Apply GOST configuration
    await gostClient.updateConfig(gostConfig);

    logger.info("GOST config applied successfully via API");
    return c.json({ ok: true });
  } catch (error) {
    logger.error("Error updating config via API", { error });
    return c.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

// GOST Observer endpoint - receives statistics from GOST
gostRouter.post("/observer", async (c) => {
  try {
    const stats: GostObserverStats = await c.req.json();

    logger.debug("Received GOST observer stats", {
      service: stats.service,
      totalConns: stats.totalConns,
      currentConns: stats.currentConns,
      inputBytes: stats.inputBytes,
      outputBytes: stats.outputBytes,
      totalErrs: stats.totalErrs,
    });

    // Save stats to Supabase
    const nodeId = process.env.NODE_ID || "default";
    await supabaseService.saveStats(nodeId, stats);

    return c.json({ ok: true });
  } catch (error) {
    logger.error("Error processing observer stats", { error });
    return c.json({ ok: false });
  }
});

export { supabaseService };
export default gostRouter;
