import type { GostConfig } from '../../types/gost';
import { logger } from '../../utils/logger';

export class GostClient {
  private baseUrl: string;
  private authHeader?: string;

  constructor(baseUrl: string, auth?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    if (auth) {
      this.authHeader = `Basic ${btoa(auth)}`;
    }
  }

  /**
   * Get current GOST configuration
   */
  async getConfig(): Promise<GostConfig> {
    try {
      const response = await fetch(`${this.baseUrl}/api/config`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`GOST API error: ${response.status} ${response.statusText}`);
      }

      return await response.json() as GostConfig;
    } catch (error) {
      logger.error('Failed to get GOST config', { error });
      throw error;
    }
  }

  /**
   * Update GOST configuration (hot reload)
   * GOST v3 supports hot reload via POST /api/config + POST /api/config/reload
   */
  async updateConfig(config: GostConfig): Promise<void> {
    try {
      const updateResponse = await fetch(`${this.baseUrl}/api/config/reload`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to update config: ${updateResponse.status} ${updateResponse.statusText}`);
      }

      logger.info('GOST config updated and reloaded successfully');
    } catch (error) {
      logger.error('Failed to update GOST config', { error });
      throw error;
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.authHeader) {
      headers['Authorization'] = this.authHeader;
    }
    return headers;
  }
}
