/**
 * Config management for Waitrose CLI
 * Stores credentials and tokens in ~/.config/waitrose/config.json
 */

import { homedir } from "os";
import { join } from "path";

const CONFIG_DIR = join(homedir(), ".waitrose");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export interface WaitroseConfig {
  accessToken?: string;
  refreshToken?: string;
  customerId?: string;
  customerOrderId?: string;
  defaultBranchId?: string;
  username?: string;
  expiresAt?: number; // Unix timestamp
}

async function ensureConfigDir(): Promise<void> {
  const dir = Bun.file(CONFIG_DIR);
  try {
    await Bun.$`mkdir -p ${CONFIG_DIR}`;
  } catch {
    // Directory might already exist
  }
}

export async function loadConfig(): Promise<WaitroseConfig> {
  try {
    const file = Bun.file(CONFIG_FILE);
    if (await file.exists()) {
      const text = await file.text();
      return JSON.parse(text);
    }
  } catch {
    // File doesn't exist or is invalid
  }
  return {};
}

export async function saveConfig(config: WaitroseConfig): Promise<void> {
  await ensureConfigDir();
  await Bun.write(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function clearConfig(): Promise<void> {
  await saveConfig({});
}

/**
 * Get credentials from config or environment variables
 * Environment variables take precedence
 */
export function getCredentialsFromEnv(): { accessToken?: string; username?: string; password?: string } {
  return {
    accessToken: process.env.WAITROSE_ACCESS_TOKEN || process.env.WAITROSE_TOKEN,
    username: process.env.WAITROSE_USERNAME || process.env.WAITROSE_EMAIL,
    password: process.env.WAITROSE_PASSWORD,
  };
}

/**
 * Check if stored token is expired
 */
export function isTokenExpired(config: WaitroseConfig): boolean {
  if (!config.expiresAt) return true;
  // Add 60 second buffer
  return Date.now() > (config.expiresAt - 60000);
}

export { CONFIG_FILE, CONFIG_DIR };

