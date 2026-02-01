/**
 * GOST Observer Statistics
 * Received from GOST at /observer endpoint (POST every 5s by default)
 */
export interface GostObserverStats {
  service: string;
  totalConns: number;
  currentConns: number;
  inputBytes: number;
  outputBytes: number;
  totalErrs: number;
  handler?: string; // Optional: for handler-level (per-user) statistics
}

/**
 * GOST Configuration
 */
export interface GostConfig {
  services?: GostService[];
  chains?: any[];
  limiters?: any[];
  rlimiters?: any[];
  climiters?: any[];
  tls?: {
    validity: string;
    commonName: string;
    organization: string;
  };
  api?: any;
  observers?: any[];
  [key: string]: any;
}

export interface GostService {
  name: string;
  addr: string;
  handler: any;
  listener: any;
  [key: string]: any;
}