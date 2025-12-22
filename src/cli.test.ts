/**
 * Waitrose CLI Integration Tests
 * 
 * Tests the CLI commands using Bun shell.
 * Run with: bun test cli.test.ts
 * 
 * Requires environment variables:
 *   WAITROSE_USERNAME - Your Waitrose account email
 *   WAITROSE_PASSWORD - Your Waitrose account password
 */

import { describe, test, expect, beforeAll } from "bun:test";
import { $ } from "bun";

// Helper to run CLI commands
async function cli(args: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const result = await $`bun run src/cli.ts ${args.split(" ")}`.quiet().nothrow();
  return {
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
    exitCode: result.exitCode,
  };
}

// Helper to run CLI and get JSON output
async function cliJson<T>(args: string): Promise<T> {
  const result = await cli(`${args} --json`);
  if (result.exitCode !== 0) {
    throw new Error(`CLI failed: ${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout);
}

// Strip ANSI codes for cleaner assertions
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

describe("CLI Basic Commands", () => {
  test("help shows usage", async () => {
    const result = await cli("help");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("waitrose");
    expect(result.stdout).toContain("AUTHENTICATION");
    expect(result.stdout).toContain("TROLLEY");
    expect(result.stdout).toContain("SEARCH");
  });

  test("version shows version", async () => {
    const result = await cli("version");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/waitrose v\d+\.\d+\.\d+/);
  });

  test("--help flag works", async () => {
    const result = await cli("--help");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("waitrose");
  });

  test("unknown command shows error", async () => {
    const result = await cli("unknowncommand");
    expect(result.exitCode).toBe(1);
    expect(stripAnsi(result.stderr)).toContain("Unknown command");
  });
});

describe("CLI Authentication", () => {
  test("check shows auth status", async () => {
    const result = await cli("check");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Authentication Status");
    expect(result.stdout).toContain("Environment Variables");
    expect(result.stdout).toContain("Config Location");
  });

  test("login with env vars succeeds", async () => {
    const result = await cli("login");
    expect(result.exitCode).toBe(0);
    expect(stripAnsi(result.stdout)).toContain("Logged in");
  });

  test("check shows valid token after login", async () => {
    const result = await cli("check");
    expect(result.exitCode).toBe(0);
    expect(stripAnsi(result.stdout)).toContain("Token valid");
  });
});

describe("CLI Account", () => {
  test("whoami shows account info", async () => {
    const result = await cli("whoami");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Account Info");
    expect(result.stdout).toContain("Email:");
  });

  test("whoami --json returns valid JSON", async () => {
    const data = await cliJson<{ profile: { email: string; id: string } }>("whoami");
    expect(data.profile).toBeDefined();
    expect(typeof data.profile.email).toBe("string");
    expect(typeof data.profile.id).toBe("string");
  });

  test("context shows shopping context", async () => {
    const result = await cli("context");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Shopping Context");
    expect(result.stdout).toContain("Customer ID:");
    expect(result.stdout).toContain("Order ID:");
  });

  test("context --json returns valid JSON", async () => {
    const data = await cliJson<{ customerId: string; customerOrderId: string }>("context");
    expect(typeof data.customerId).toBe("string");
    expect(typeof data.customerOrderId).toBe("string");
  });
});

describe("CLI Trolley", () => {
  test("trolley shows contents", async () => {
    const result = await cli("trolley");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Trolley");
  });

  test("trolley --json returns valid JSON", async () => {
    const data = await cliJson<{ trolley: { trolleyItems: unknown[]; orderId: string } }>("trolley");
    expect(data.trolley).toBeDefined();
    expect(typeof data.trolley.orderId).toBe("string");
    expect(Array.isArray(data.trolley.trolleyItems)).toBe(true);
  });

  // Use a known test product
  const TEST_LINE_NUMBER = "088903"; // Waitrose Fairtrade Bananas

  test("add item to trolley", async () => {
    const result = await cli(`add ${TEST_LINE_NUMBER} 1`);
    expect(result.exitCode).toBe(0);
    expect(stripAnsi(result.stdout)).toContain("Added");
  });

  test("verify item in trolley", async () => {
    const data = await cliJson<{ trolley: { trolleyItems: Array<{ lineNumber: string }> } }>("trolley");
    const item = data.trolley.trolleyItems.find(i => i.lineNumber === TEST_LINE_NUMBER);
    expect(item).toBeDefined();
  });

  test("remove item from trolley", async () => {
    const result = await cli(`remove ${TEST_LINE_NUMBER}`);
    expect(result.exitCode).toBe(0);
    expect(stripAnsi(result.stdout)).toContain("Removed");
  });
});

describe("CLI Search", () => {
  test("search returns results", async () => {
    const result = await cli("search milk -n 5");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Search:");
    expect(result.stdout).toContain("results");
  });

  test("search --json returns valid JSON", async () => {
    const data = await cliJson<{ products: unknown[]; totalMatches: number }>("search milk -n 5");
    expect(Array.isArray(data.products)).toBe(true);
    expect(typeof data.totalMatches).toBe("number");
    expect(data.products.length).toBeGreaterThan(0);
  });

  test("search with sorting", async () => {
    const data = await cliJson<{ products: Array<{ name: string; displayPrice: string }> }>(
      "search bread -n 5 --sort PRICE_LOW_2_HIGH"
    );
    expect(data.products.length).toBeGreaterThan(0);
  });

  test("browse category returns results", async () => {
    const result = await cli("browse groceries/bakery -n 5");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Browse:");
  });

  test("browse --json returns valid JSON", async () => {
    const result = await cli("browse groceries/bakery -n 5 --json");
    // API sometimes times out, allow that
    if (result.exitCode !== 0 && result.stderr.includes("504")) {
      console.log("      (skipped due to API timeout)");
      return;
    }
    expect(result.exitCode).toBe(0);
    const data = JSON.parse(result.stdout);
    expect(Array.isArray(data.products)).toBe(true);
    expect(typeof data.totalMatches).toBe("number");
  });
});

describe("CLI Orders", () => {
  test("orders shows list", async () => {
    const result = await cli("orders");
    expect(result.exitCode).toBe(0);
    // Should show either orders or "No pending orders"
    const output = stripAnsi(result.stdout);
    expect(output.includes("Orders") || output.includes("No pending")).toBe(true);
  });

  test("orders --json returns valid JSON", async () => {
    const data = await cliJson<{ pending: unknown[]; previous: unknown[] }>("orders");
    expect(Array.isArray(data.pending)).toBe(true);
    expect(Array.isArray(data.previous)).toBe(true);
  });
});

describe("CLI Slots", () => {
  test("slot shows current slot", async () => {
    const result = await cli("slot");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Current Slot");
  });

  test("slot --json returns valid JSON or null", async () => {
    const result = await cli("slot --json");
    expect(result.exitCode).toBe(0);
    // Can be null or an object
    const data = JSON.parse(result.stdout);
    expect(data === null || typeof data === "object").toBe(true);
  });

  test("slots shows available slots", async () => {
    const result = await cli("slots --type DELIVERY --days 3");
    // May fail if no delivery address, that's OK
    if (result.exitCode === 0) {
      expect(result.stdout).toContain("Slots");
    }
  });
});

describe("CLI Campaigns", () => {
  test("campaigns shows list", async () => {
    const result = await cli("campaigns");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Campaigns");
  });

  test("campaigns --json returns valid JSON", async () => {
    const data = await cliJson<unknown[]>("campaigns");
    expect(Array.isArray(data)).toBe(true);
  });
});

describe("CLI Logout", () => {
  test("logout clears credentials", async () => {
    const result = await cli("logout");
    expect(result.exitCode).toBe(0);
    expect(stripAnsi(result.stdout)).toContain("Logged out");
  });

  test("check shows not logged in after logout", async () => {
    const result = await cli("check");
    expect(result.exitCode).toBe(0);
    expect(stripAnsi(result.stdout)).toContain("Not logged in");
  });

  // Re-login for any subsequent tests
  test("re-login succeeds", async () => {
    const result = await cli("login");
    expect(result.exitCode).toBe(0);
    expect(stripAnsi(result.stdout)).toContain("Logged in");
  });
});

