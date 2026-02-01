import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { NodeConfigData } from "@/types/database";
import { logger } from "@/utils/logger";

export class SupabaseService {
  private client: SupabaseClient;
  private channel?: RealtimeChannel;
  private tableName: string;
  private apiUrl: string;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    tableName: string,
    apiUrl: string,
  ) {
    this.client = createClient(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    this.tableName = tableName;
    this.apiUrl = apiUrl;
  }

  /**
   * Start listening to database changes
   */
  async start(): Promise<void> {
    logger.info("Starting Supabase realtime subscription", {
      table: this.tableName,
    });

    this.channel = this.client
      .channel("db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: this.tableName,
        },
        async (payload) => {
          logger.info("Database change received", {
            event: payload.eventType,
            table: payload.table,
          });

          await this.handleDatabaseChange(payload);
        },
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          logger.info("Supabase subscription active");
        } else if (status === "CHANNEL_ERROR") {
          logger.error("Supabase subscription error", { error: err });
        } else if (status === "TIMED_OUT") {
          logger.warn("Supabase subscription timed out, will retry");
        } else {
          logger.debug("Supabase subscription status", { status });
        }
      });
  }

  /**
   * Handle database change events
   */
  private async handleDatabaseChange(payload: any): Promise<void> {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    try {
      switch (eventType) {
        case "INSERT":
        case "UPDATE":
          await this.handleConfigUpdate(newRecord);
          break;

        case "DELETE":
          logger.info("Node deleted", { id: oldRecord.id });
          break;

        default:
          logger.warn("Unknown event type", { eventType });
      }
    } catch (error) {
      logger.error("Failed to handle database change", {
        error,
        eventType,
        recordId: newRecord?.id || oldRecord?.id,
      });
    }
  }

  /**
   * Handle configuration update from database
   * Sends config data to API endpoint for processing
   */
  private async handleConfigUpdate(record: any): Promise<void> {
    if (!record.config_data) {
      logger.warn("No config data in database record", { id: record.id });
      return;
    }

    logger.info("Processing config update from database", { id: record.id });

    try {
      // Parse config data from database
      const configData: NodeConfigData =
        typeof record.config_data === "string"
          ? JSON.parse(record.config_data)
          : record.config_data;

      logger.debug("Config data received", {
        nodeId: configData.node?.id,
        rulesCount: configData.rules?.length || 0,
        tunnelsCount: configData.tunnels?.length || 0,
        chainsCount: configData.chains?.length || 0,
      });

      // Send config update to API endpoint
      const response = await fetch(`${this.apiUrl}/gost/config/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(configData),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          `API request failed: ${response.status} ${errorData.error || response.statusText}`,
        );
      }

      logger.info("Config update sent to API successfully", { id: record.id });
    } catch (error) {
      logger.error("Failed to send config update to API", {
        error,
        id: record.id,
      });
      throw error;
    }
  }

  /**
   * Save statistics to database
   */
  async saveStats(nodeId: string, stats: any): Promise<void> {
    try {
      const { error } = await this.client.from("gost_stats").insert({
        node_id: nodeId,
        stats,
        timestamp: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      logger.debug("Stats saved to database", { nodeId });
    } catch (error) {
      logger.error("Failed to save stats", { error, nodeId });
    }
  }

  /**
   * Stop the realtime subscription
   */
  async stop(): Promise<void> {
    if (this.channel) {
      await this.client.removeChannel(this.channel);
      logger.info("Supabase subscription stopped");
    }
  }
}
