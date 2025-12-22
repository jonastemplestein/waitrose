/**
 * Authentication helpers for Waitrose CLI
 */

import WaitroseClient from "../waitrose.js";
import { loadConfig, saveConfig, getCredentialsFromEnv, isTokenExpired, type WaitroseConfig } from "./config.js";

/**
 * Create a client with authentication
 * Handles token refresh and re-authentication automatically
 */
export async function getAuthenticatedClient(): Promise<WaitroseClient> {
  const client = new WaitroseClient();
  const config = await loadConfig();
  const envCreds = getCredentialsFromEnv();

  // Try env var token first
  if (envCreds.accessToken) {
    // Use token from environment - caller will handle auth errors
    (client as any).accessToken = envCreds.accessToken;
    return client;
  }

  // Check if we have stored credentials
  if (config.accessToken && !isTokenExpired(config)) {
    // Use stored token
    (client as any).accessToken = config.accessToken;
    (client as any).refreshToken = config.refreshToken;
    (client as any).customerId = config.customerId;
    (client as any).customerOrderId = config.customerOrderId;
    (client as any).defaultBranchId = config.defaultBranchId;
    return client;
  }

  // Token expired or missing - try to re-authenticate
  const username = envCreds.username || config.username;
  const password = envCreds.password;

  if (username && password) {
    try {
      const session = await client.login(username, password);
      await saveConfig({
        ...config,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        customerId: session.customerId,
        customerOrderId: session.customerOrderId,
        defaultBranchId: session.defaultBranchId,
        username,
        expiresAt: Date.now() + (session.expiresIn * 1000),
      });
      return client;
    } catch (error) {
      throw new Error(`Re-authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error("Not authenticated. Run 'waitrose login' or set WAITROSE_USERNAME and WAITROSE_PASSWORD environment variables.");
}

/**
 * Execute a command with automatic re-authentication on auth errors
 */
export async function withAuth<T>(fn: (client: WaitroseClient) => Promise<T>): Promise<T> {
  let client: WaitroseClient;
  
  try {
    client = await getAuthenticatedClient();
  } catch (error) {
    throw error;
  }

  try {
    return await fn(client);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    
    // Check if it's an auth error
    if (message.includes("401") || message.includes("Unauthorized") || message.includes("UNAUTHENTICATED")) {
      // Try to re-authenticate from env vars
      const envCreds = getCredentialsFromEnv();
      const config = await loadConfig();
      const username = envCreds.username || config.username;
      const password = envCreds.password;

      if (username && password) {
        const newClient = new WaitroseClient();
        try {
          const session = await newClient.login(username, password);
          await saveConfig({
            ...config,
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            customerId: session.customerId,
            customerOrderId: session.customerOrderId,
            defaultBranchId: session.defaultBranchId,
            username,
            expiresAt: Date.now() + (session.expiresIn * 1000),
          });
          return await fn(newClient);
        } catch (retryError) {
          throw new Error(`Re-authentication failed: ${retryError instanceof Error ? retryError.message : String(retryError)}`);
        }
      }

      throw new Error("Authentication failed. Please run 'waitrose login' again.");
    }

    throw error;
  }
}

