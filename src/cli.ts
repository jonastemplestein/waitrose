#!/usr/bin/env bun
/**
 * Waitrose CLI
 * 
 * A command-line interface for the Waitrose grocery API.
 * 
 * Usage:
 *   waitrose login <username> <password>
 *   waitrose whoami
 *   waitrose trolley
 *   waitrose search "milk"
 *   ...
 */

import WaitroseClient, { type SlotType, type UnitOfMeasure } from "../waitrose.js";
import { loadConfig, saveConfig, clearConfig, CONFIG_FILE } from "./config.js";
import { withAuth, getAuthenticatedClient } from "./auth.js";

const VERSION = "1.0.0";

// ANSI colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

/**
 * Read a line from stdin, optionally hiding input (for passwords)
 */
async function readLine(hidden = false): Promise<string> {
  const stdin = Bun.stdin.stream();
  const reader = stdin.getReader();
  
  // If hiding input, disable echo
  if (hidden && process.stdin.isTTY) {
    await Bun.$`stty -echo`.quiet();
  }

  let result = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const text = new TextDecoder().decode(value);
      result += text;
      
      // Check for newline
      if (result.includes("\n")) {
        result = result.split("\n")[0]?.trim() ?? "";
        break;
      }
    }
  } finally {
    reader.releaseLock();
    // Restore echo if we disabled it
    if (hidden && process.stdin.isTTY) {
      await Bun.$`stty echo`.quiet();
    }
  }

  return result;
}

function log(message: string) {
  console.log(message);
}

function success(message: string) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function error(message: string) {
  console.error(`${colors.red}✗${colors.reset} ${message}`);
}

function warn(message: string) {
  console.log(`${colors.yellow}!${colors.reset} ${message}`);
}

function header(title: string) {
  console.log(`\n${colors.bold}${colors.cyan}${title}${colors.reset}`);
}

function formatPrice(price: { amount: number; currencyCode: string } | null | undefined): string {
  if (!price) return "—";
  // API returns amounts in GBP (pounds), not pence
  return `£${price.amount.toFixed(2)}`;
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString();
}

// =============================================================================
// Commands
// =============================================================================

async function cmdHelp() {
  log(`
${colors.bold}waitrose${colors.reset} — CLI for Waitrose grocery shopping

${colors.bold}USAGE${colors.reset}
  waitrose <command> [options]

${colors.bold}AUTHENTICATION${colors.reset}
  login [email] [password]     Log in (uses env vars or prompts if not provided)
  logout                       Log out and clear stored credentials
  whoami                       Show current account info
  check                        Check authentication status

${colors.bold}TROLLEY${colors.reset}
  trolley                      View your trolley contents
  add <lineNumber> [qty]       Add item to trolley (default qty: 1)
  remove <lineNumber>          Remove item from trolley
  empty                        Empty the entire trolley

${colors.bold}SEARCH${colors.reset}
  search <term> [-n count]     Search for products
  browse <category> [-n count] Browse products by category

${colors.bold}ORDERS${colors.reset}
  orders                       List pending and previous orders
  order <orderId>              View order details
  cancel-order <orderId>       Cancel an order

${colors.bold}SLOTS${colors.reset}
  slot                         View currently booked slot
  slots [--type delivery|collection] [--days 7]
                               View available delivery/collection slots
  book-slot <slotId> [--type delivery|collection]
                               Book a delivery/collection slot

${colors.bold}OTHER${colors.reset}
  campaigns                    List active campaigns
  context                      Show shopping context
  help                         Show this help message
  version                      Show version

${colors.bold}OPTIONS${colors.reset}
  --json                       Output as JSON
  -n, --count <number>         Limit results (default: 10)

${colors.bold}ENVIRONMENT${colors.reset}
  WAITROSE_USERNAME            Email for auto-login
  WAITROSE_PASSWORD            Password for auto-login
  WAITROSE_ACCESS_TOKEN        Bearer token (overrides stored token)

${colors.bold}CONFIG${colors.reset}
  Credentials stored in: ${CONFIG_FILE}
`);
}

async function cmdVersion() {
  log(`waitrose v${VERSION}`);
}

async function cmdLogin(args: string[], flags: Record<string, string | boolean>) {
  // Priority: args > env vars > prompt
  let email = args[0] || process.env.WAITROSE_USERNAME || process.env.WAITROSE_EMAIL;
  let password = args[1] || process.env.WAITROSE_PASSWORD;

  // Prompt for missing credentials
  if (!email) {
    process.stdout.write("Email: ");
    email = await readLine();
  }
  
  if (!password) {
    process.stdout.write("Password: ");
    password = await readLine(true);
    console.log(); // newline after hidden input
  }

  if (!email || !password) {
    error("Email and password are required");
    process.exit(1);
  }

  const client = new WaitroseClient();
  
  try {
    log("Logging in...");
    const session = await client.login(email, password);
    
    await saveConfig({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      customerId: session.customerId,
      customerOrderId: session.customerOrderId,
      defaultBranchId: session.defaultBranchId,
      username: email,
      expiresAt: Date.now() + (session.expiresIn * 1000),
    });

    success(`Logged in as customer ${session.customerId}`);
    log(`  Order ID: ${session.customerOrderId}`);
    log(`  Branch: ${session.defaultBranchId}`);
    log(`  Token expires in: ${Math.floor(session.expiresIn / 60)} minutes`);
  } catch (err) {
    error(`Login failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

async function cmdLogout() {
  try {
    const client = await getAuthenticatedClient();
    await client.logout();
  } catch {
    // Ignore errors - just clear local config
  }
  
  await clearConfig();
  success("Logged out and cleared stored credentials");
}

async function cmdWhoami(args: string[], flags: Record<string, string | boolean>) {
  const json = flags.json === true;

  await withAuth(async (client) => {
    const { profile, memberships } = await client.getAccountInfo();
    
    if (json) {
      log(JSON.stringify({ profile, memberships }, null, 2));
    } else {
      header("Account Info");
      log(`  Email: ${profile.email}`);
      log(`  ID: ${profile.id}`);
      
      if (profile.contactAddress) {
        log(`  Address: ${profile.contactAddress.line1}, ${profile.contactAddress.town} ${profile.contactAddress.postalCode}`);
      }
      
      if (memberships && memberships.length > 0) {
        header("Memberships");
        for (const m of memberships) {
          log(`  ${m.type}: ${m.number}`);
        }
      }
    }
  });
}

async function cmdCheck() {
  const config = await loadConfig();
  
  header("Authentication Status");
  
  if (config.accessToken) {
    const expired = config.expiresAt ? Date.now() > config.expiresAt : false;
    if (expired) {
      warn("Token expired");
    } else {
      success("Token valid");
      if (config.expiresAt) {
        const remaining = Math.floor((config.expiresAt - Date.now()) / 60000);
        log(`  Expires in: ${remaining} minutes`);
      }
    }
    log(`  Customer ID: ${config.customerId || "—"}`);
    log(`  Order ID: ${config.customerOrderId || "—"}`);
    log(`  Username: ${config.username || "—"}`);
  } else {
    warn("Not logged in");
  }

  header("Environment Variables");
  log(`  WAITROSE_USERNAME: ${process.env.WAITROSE_USERNAME ? "set" : "not set"}`);
  log(`  WAITROSE_PASSWORD: ${process.env.WAITROSE_PASSWORD ? "set" : "not set"}`);
  log(`  WAITROSE_ACCESS_TOKEN: ${process.env.WAITROSE_ACCESS_TOKEN ? "set" : "not set"}`);

  header("Config Location");
  log(`  ${CONFIG_FILE}`);
}

async function cmdTrolley(args: string[], flags: Record<string, string | boolean>) {
  const json = flags.json === true;

  await withAuth(async (client) => {
    const trolley = await client.getTrolley();
    
    if (json) {
      log(JSON.stringify(trolley, null, 2));
    } else {
      header("Trolley");
      
      if (trolley.trolley.trolleyItems.length === 0) {
        log("  Your trolley is empty");
        return;
      }

      for (const item of trolley.trolley.trolleyItems) {
        const product = trolley.products.find(p => p.lineNumber === item.lineNumber);
        const name = product?.name || item.lineNumber;
        log(`  ${item.quantity.amount}x ${name} — ${formatPrice(item.totalPrice)}`);
        log(`     Line: ${item.lineNumber}`);
      }

      header("Totals");
      log(`  Items: ${(trolley.trolley.trolleyTotals as any).trolleyItemCounts?.noConflicts || trolley.trolley.trolleyItems.length}`);
      log(`  Subtotal: ${formatPrice(trolley.trolley.trolleyTotals.itemTotalEstimatedCost)}`);
      if (trolley.trolley.trolleyTotals.savingsFromOffers) {
        log(`  Offer savings: ${formatPrice(trolley.trolley.trolleyTotals.savingsFromOffers)}`);
      }
      if (trolley.trolley.trolleyTotals.savingsFromMyWaitrose) {
        log(`  myWaitrose savings: ${formatPrice(trolley.trolley.trolleyTotals.savingsFromMyWaitrose)}`);
      }
      log(`  ${colors.bold}Total: ${formatPrice(trolley.trolley.trolleyTotals.totalEstimatedCost)}${colors.reset}`);
    }
  });
}

async function cmdAdd(args: string[], flags: Record<string, string | boolean>) {
  const lineNumber = args[0];
  const quantity = parseInt(args[1] || "1", 10);
  const uom = (flags.uom as UnitOfMeasure) || "C62";
  const json = flags.json === true;

  if (!lineNumber) {
    error("Usage: waitrose add <lineNumber> [quantity]");
    process.exit(1);
  }

  await withAuth(async (client) => {
    const result = await client.addToTrolley(lineNumber, quantity, uom);
    
    if (json) {
      log(JSON.stringify(result, null, 2));
    } else {
      const product = result.products.find(p => p.lineNumber === lineNumber);
      success(`Added ${quantity}x ${product?.name || lineNumber} to trolley`);
      log(`  Total: ${formatPrice(result.trolley.trolleyTotals.totalEstimatedCost)}`);
    }
  });
}

async function cmdRemove(args: string[], flags: Record<string, string | boolean>) {
  const lineNumber = args[0];
  const json = flags.json === true;

  if (!lineNumber) {
    error("Usage: waitrose remove <lineNumber>");
    process.exit(1);
  }

  await withAuth(async (client) => {
    const result = await client.removeFromTrolley(lineNumber);
    
    if (json) {
      log(JSON.stringify(result, null, 2));
    } else {
      success(`Removed ${lineNumber} from trolley`);
      log(`  Total: ${formatPrice(result.trolley.trolleyTotals.totalEstimatedCost)}`);
    }
  });
}

async function cmdEmpty(args: string[], flags: Record<string, string | boolean>) {
  const json = flags.json === true;

  await withAuth(async (client) => {
    const result = await client.emptyTrolley();
    
    if (json) {
      log(JSON.stringify(result, null, 2));
    } else {
      success("Trolley emptied");
    }
  });
}

async function cmdSearch(args: string[], flags: Record<string, string | boolean>) {
  const term = args.join(" ");
  const count = parseInt(flags.n as string || flags.count as string || "10", 10);
  const json = flags.json === true;
  const sortBy = flags.sort as string;

  if (!term) {
    error("Usage: waitrose search <term>");
    process.exit(1);
  }

  await withAuth(async (client) => {
    const results = await client.searchProducts(term, { 
      size: count,
      sortBy: sortBy as any,
    });
    
    if (json) {
      log(JSON.stringify(results, null, 2));
    } else {
      header(`Search: "${term}" (${results.totalMatches} results)`);
      
      if (results.products.length === 0) {
        log("  No products found");
        return;
      }

      for (const product of results.products) {
        log(`  ${colors.bold}${product.name}${colors.reset}`);
        log(`    ${product.displayPrice} — Line: ${product.lineNumber}`);
        if (product.promotions?.[0]) {
          log(`    ${colors.green}${product.promotions[0].promotionDescription}${colors.reset}`);
        }
      }
    }
  });
}

async function cmdBrowse(args: string[], flags: Record<string, string | boolean>) {
  const category = args.join("/");
  const count = parseInt(flags.n as string || flags.count as string || "10", 10);
  const json = flags.json === true;

  if (!category) {
    error("Usage: waitrose browse <category>");
    log("  Example: waitrose browse groceries/bakery/bread");
    process.exit(1);
  }

  await withAuth(async (client) => {
    const results = await client.browseProducts(category, { size: count });
    
    if (json) {
      log(JSON.stringify(results, null, 2));
    } else {
      header(`Browse: ${category} (${results.totalMatches} products)`);
      
      if (results.products.length === 0) {
        log("  No products found");
        return;
      }

      for (const product of results.products) {
        log(`  ${colors.bold}${product.name}${colors.reset}`);
        log(`    ${product.displayPrice} — Line: ${product.lineNumber}`);
      }
    }
  });
}

async function cmdOrders(args: string[], flags: Record<string, string | boolean>) {
  const count = parseInt(flags.n as string || flags.count as string || "10", 10);
  const json = flags.json === true;

  await withAuth(async (client) => {
    const orders = await client.getOrders(count);
    
    if (json) {
      log(JSON.stringify(orders, null, 2));
    } else {
      if (orders.pending.length > 0) {
        header("Pending Orders");
        for (const order of orders.pending) {
          log(`  ${colors.bold}${order.customerOrderId}${colors.reset} — ${order.status}`);
          log(`    Created: ${formatDate(order.created)}`);
          log(`    Total: ${formatPrice(order.totals.estimated?.totalPrice)}`);
          if (order.slots?.[0]) {
            log(`    Slot: ${formatDate(order.slots[0].startDateTime)} - ${formatDate(order.slots[0].endDateTime)}`);
          }
        }
      } else {
        header("Pending Orders");
        log("  No pending orders");
      }

      if (orders.previous.length > 0) {
        header("Previous Orders");
        for (const order of orders.previous) {
          log(`  ${colors.bold}${order.customerOrderId}${colors.reset} — ${order.status}`);
          log(`    Created: ${formatDate(order.created)}`);
          log(`    Total: ${formatPrice(order.totals.actual?.paid || order.totals.estimated?.totalPrice)}`);
        }
      }
    }
  });
}

async function cmdOrder(args: string[], flags: Record<string, string | boolean>) {
  const orderId = args[0];
  const json = flags.json === true;

  if (!orderId) {
    error("Usage: waitrose order <orderId>");
    process.exit(1);
  }

  await withAuth(async (client) => {
    const order = await client.getOrder(orderId);
    
    // Fetch product names for all line numbers
    const lineNumbers = order.orderLines.map(line => line.lineNumber);
    let productMap: Map<string, string> = new Map();
    
    try {
      const products = await client.getProductsByLineNumbers(lineNumbers);
      for (const product of products) {
        productMap.set(product.lineNumber, product.name);
      }
    } catch {
      // If product lookup fails, we'll just show line numbers
    }
    
    if (json) {
      // Include product names in JSON output
      const enrichedOrder = {
        ...order,
        orderLines: order.orderLines.map(line => ({
          ...line,
          productName: productMap.get(line.lineNumber) || null,
        })),
      };
      log(JSON.stringify(enrichedOrder, null, 2));
    } else {
      header(`Order ${order.customerOrderId}`);
      log(`  Status: ${order.status}`);
      log(`  Created: ${formatDate(order.created)}`);
      log(`  Updated: ${formatDate(order.lastUpdated)}`);
      
      if (order.slots?.[0]) {
        header("Delivery Slot");
        log(`  ${formatDate(order.slots[0].startDateTime)} - ${formatDate(order.slots[0].endDateTime)}`);
        log(`  Type: ${order.slots[0].type}`);
        log(`  Branch: ${order.slots[0].branchName}`);
      }

      header("Items");
      for (const line of order.orderLines) {
        const qty = line.quantity?.amount || line.estimatedQuantity?.amount || 1;
        const name = productMap.get(line.lineNumber) || line.lineNumber;
        log(`  ${qty}x ${name} — ${formatPrice(line.totalPrice || line.estimatedTotalPrice)}`);
        log(`     ${colors.dim}Line: ${line.lineNumber}${colors.reset}`);
      }

      header("Totals");
      if (order.totals.estimated) {
        log(`  Estimated: ${formatPrice(order.totals.estimated.totalPrice)}`);
      }
      if (order.totals.actual?.paid) {
        log(`  ${colors.bold}Paid: ${formatPrice(order.totals.actual.paid)}${colors.reset}`);
      }
    }
  });
}

async function cmdCancelOrder(args: string[], flags: Record<string, string | boolean>) {
  const orderId = args[0];

  if (!orderId) {
    error("Usage: waitrose cancel-order <orderId>");
    process.exit(1);
  }

  await withAuth(async (client) => {
    await client.cancelOrder(orderId);
    success(`Order ${orderId} cancelled`);
  });
}

async function cmdSlot(args: string[], flags: Record<string, string | boolean>) {
  const json = flags.json === true;
  const postcode = flags.postcode as string;

  await withAuth(async (client) => {
    const slot = await client.getCurrentSlot(postcode);
    
    if (json) {
      log(JSON.stringify(slot, null, 2));
    } else {
      header("Current Slot");
      
      if (!slot || !slot.startDateTime) {
        log("  No slot booked");
        return;
      }

      log(`  Type: ${slot.slotType}`);
      log(`  Time: ${formatDate(slot.startDateTime)} - ${formatDate(slot.endDateTime)}`);
      log(`  Expires: ${formatDate(slot.expiryDateTime)}`);
      log(`  Delivery charge: ${formatPrice(slot.deliveryCharge)}`);
      log(`  Branch: ${slot.branchId}`);
    }
  });
}

async function cmdSlots(args: string[], flags: Record<string, string | boolean>) {
  const json = flags.json === true;
  const slotType = (flags.type as SlotType) || "DELIVERY";
  const days = parseInt(flags.days as string || "7", 10);

  await withAuth(async (client) => {
    // Get user's address ID for delivery slot lookup
    const { profile } = await client.getAccountInfo();
    const addressId = profile.contactAddress?.id;
    
    // First get available dates
    const dates = await client.getSlotDates(slotType, undefined, addressId);
    
    if (dates.length === 0) {
      if (json) {
        log(JSON.stringify({ dates: [], slotDays: [] }, null, 2));
      } else {
        log("  No available slot dates");
      }
      return;
    }

    // Limit dates to requested number of days
    const datesToFetch = dates.slice(0, days);
    
    // Fetch slot days for each available date (API returns one day per call)
    const slotDays: Awaited<ReturnType<typeof client.getSlotDays>> = [];
    for (const date of datesToFetch) {
      const daySlots = await client.getSlotDays(slotType, date.id, undefined, addressId);
      slotDays.push(...daySlots);
    }
    
    if (json) {
      log(JSON.stringify({ dates, slotDays }, null, 2));
    } else {
      header(`Available ${slotType} Slots`);
      
      for (const day of slotDays) {
        log(`\n  ${colors.bold}${day.date}${colors.reset}`);
        
        const availableSlots = day.slots.filter(s => s.status === "AVAILABLE");
        if (availableSlots.length === 0) {
          log(`    No available slots`);
          continue;
        }

        for (const slot of availableSlots) {
          const start = new Date(slot.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const end = new Date(slot.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const charge = formatPrice(slot.charge);
          const badges = [
            slot.greenSlot ? "🌿" : "",
            slot.deliveryPassSlot ? "🎫" : "",
          ].filter(Boolean).join(" ");
          
          log(`    ${start}-${end} ${charge} ${badges} [${slot.id}]`);
        }
      }
    }
  });
}

async function cmdBookSlot(args: string[], flags: Record<string, string | boolean>) {
  const slotId = args[0];
  const slotType = (flags.type as SlotType) || "DELIVERY";
  const addressId = flags.address as string;
  const json = flags.json === true;

  if (!slotId) {
    error("Usage: waitrose book-slot <slotId> [--type delivery|collection]");
    process.exit(1);
  }

  await withAuth(async (client) => {
    const result = await client.bookSlot(slotId, slotType, addressId);
    
    if (json) {
      log(JSON.stringify(result, null, 2));
    } else {
      success("Slot booked!");
      log(`  Expires: ${formatDate(result.slotExpiryDateTime)}`);
      log(`  Order cutoff: ${formatDate(result.orderCutoffDateTime)}`);
      if (result.shopByDateTime) {
        log(`  Shop by: ${formatDate(result.shopByDateTime)}`);
      }
    }
  });
}

async function cmdCampaigns(args: string[], flags: Record<string, string | boolean>) {
  const json = flags.json === true;

  await withAuth(async (client) => {
    const campaigns = await client.getCampaigns();
    
    if (json) {
      log(JSON.stringify(campaigns, null, 2));
    } else {
      header("Active Campaigns");
      
      if (campaigns.length === 0) {
        log("  No active campaigns");
        return;
      }

      for (const campaign of campaigns) {
        log(`  ${colors.bold}${campaign.name}${colors.reset}`);
        log(`    ID: ${campaign.id}`);
        log(`    Period: ${campaign.startDate} — ${campaign.endDate}`);
      }
    }
  });
}

async function cmdContext(args: string[], flags: Record<string, string | boolean>) {
  const json = flags.json === true;

  await withAuth(async (client) => {
    const context = await client.getShoppingContext();
    
    if (json) {
      log(JSON.stringify(context, null, 2));
    } else {
      header("Shopping Context");
      log(`  Customer ID: ${context.customerId}`);
      log(`  Order ID: ${context.customerOrderId}`);
      log(`  Order State: ${context.customerOrderState}`);
      log(`  Branch: ${context.defaultBranchId}`);
    }
  });
}

// =============================================================================
// CLI Parser
// =============================================================================

function parseArgs(argv: string[]): { command: string; args: string[]; flags: Record<string, string | boolean> } {
  const command = argv[0] || "help";
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i]!;
    
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      
      if (next && !next.startsWith("-")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith("-") && arg.length === 2) {
      const key = arg.slice(1);
      const next = argv[i + 1];
      
      if (next && !next.startsWith("-")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      args.push(arg);
    }
  }

  return { command, args, flags };
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const { command, args, flags } = parseArgs(process.argv.slice(2));

  try {
    switch (command) {
      case "help":
      case "--help":
      case "-h":
        await cmdHelp();
        break;
      case "version":
      case "--version":
      case "-v":
        await cmdVersion();
        break;
      case "login":
        await cmdLogin(args, flags);
        break;
      case "logout":
        await cmdLogout();
        break;
      case "whoami":
        await cmdWhoami(args, flags);
        break;
      case "check":
        await cmdCheck();
        break;
      case "trolley":
      case "cart":
        await cmdTrolley(args, flags);
        break;
      case "add":
        await cmdAdd(args, flags);
        break;
      case "remove":
      case "rm":
        await cmdRemove(args, flags);
        break;
      case "empty":
      case "clear":
        await cmdEmpty(args, flags);
        break;
      case "search":
        await cmdSearch(args, flags);
        break;
      case "browse":
        await cmdBrowse(args, flags);
        break;
      case "orders":
        await cmdOrders(args, flags);
        break;
      case "order":
        await cmdOrder(args, flags);
        break;
      case "cancel-order":
        await cmdCancelOrder(args, flags);
        break;
      case "slot":
        await cmdSlot(args, flags);
        break;
      case "slots":
        await cmdSlots(args, flags);
        break;
      case "book-slot":
        await cmdBookSlot(args, flags);
        break;
      case "campaigns":
        await cmdCampaigns(args, flags);
        break;
      case "context":
        await cmdContext(args, flags);
        break;
      default:
        error(`Unknown command: ${command}`);
        log("Run 'waitrose help' for usage.");
        process.exit(1);
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();

