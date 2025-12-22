/**
 * Waitrose API Smoke Tests
 * 
 * Tests the WaitroseClient directly.
 * Run with: bun test api.test.ts
 * 
 * Requires environment variables:
 *   WAITROSE_USERNAME - Your Waitrose account email
 *   WAITROSE_PASSWORD - Your Waitrose account password
 */

import { describe, test, expect, beforeAll } from "bun:test";
import { WaitroseClient } from "../waitrose";
import type { Session, TrolleyResponse, UnitOfMeasure } from "../waitrose";

const username = process.env.WAITROSE_USERNAME!;
const password = process.env.WAITROSE_PASSWORD!;

// Shared client instance
let client: WaitroseClient;
let session: Session;

// Test product line numbers
const TEST_PRODUCT_LINE_NUMBER = "088903"; // Waitrose Fairtrade Bananas

describe("Authentication", () => {
  beforeAll(() => {
    client = new WaitroseClient();
  });

  test("login with username/password", async () => {
    expect(username).toBeDefined();
    expect(password).toBeDefined();

    session = await client.login(username, password);

    expect(session.accessToken).toBeDefined();
    expect(typeof session.accessToken).toBe("string");
    expect(session.customerId).toBeDefined();
    expect(session.customerOrderId).toBeDefined();
    expect(session.expiresIn).toBeGreaterThan(0);
  });

  test("client is authenticated after login", () => {
    expect(client.isAuthenticated()).toBe(true);
  });

  test("getOrderId returns order ID", () => {
    expect(client.getOrderId()).toBeDefined();
    expect(typeof client.getOrderId()).toBe("string");
  });

  test("getCustomerId returns customer ID", () => {
    expect(client.getCustomerId()).toBeDefined();
    expect(typeof client.getCustomerId()).toBe("string");
  });
});

describe("Account & Context", () => {
  test("getAccountInfo returns profile and memberships", async () => {
    const { profile, memberships } = await client.getAccountInfo();

    expect(profile).toBeDefined();
    expect(typeof profile.id).toBe("string");
    expect(typeof profile.email).toBe("string");
    expect(profile.email).toContain("@");

    // memberships can be null
    if (memberships) {
      expect(Array.isArray(memberships)).toBe(true);
    }
  });

  test("getShoppingContext returns context", async () => {
    const context = await client.getShoppingContext();

    expect(context).toBeDefined();
    expect(typeof context.customerId).toBe("string");
    expect(typeof context.customerOrderId).toBe("string");
    expect(typeof context.customerOrderState).toBe("string");
    expect(typeof context.defaultBranchId).toBe("string");
  });
});

describe("Trolley Operations", () => {
  let initialTrolley: TrolleyResponse;
  let testItemInitialQty: number = 0;

  test("getTrolley returns trolley data", async () => {
    initialTrolley = await client.getTrolley();

    expect(initialTrolley).toBeDefined();
    expect(initialTrolley.trolley).toBeDefined();
    expect(typeof initialTrolley.trolley.orderId).toBe("string");
    expect(Array.isArray(initialTrolley.trolley.trolleyItems)).toBe(true);
    expect(initialTrolley.trolley.trolleyTotals).toBeDefined();

    // Record initial quantity of test item
    const existing = initialTrolley.trolley.trolleyItems.find(
      i => i.lineNumber === TEST_PRODUCT_LINE_NUMBER
    );
    testItemInitialQty = existing?.quantity?.amount ?? 0;
  });

  test("addToTrolley adds item", async () => {
    const newQty = testItemInitialQty + 1;
    const result = await client.addToTrolley(TEST_PRODUCT_LINE_NUMBER, newQty);

    expect(result).toBeDefined();
    expect(result.failures).toBeNull();

    const item = result.trolley.trolleyItems.find(
      i => i.lineNumber === TEST_PRODUCT_LINE_NUMBER
    );
    expect(item).toBeDefined();
    expect(item!.quantity.amount).toBe(newQty);
  });

  test("updateTrolleyItems updates item with note", async () => {
    const result = await client.updateTrolleyItems([{
      lineNumber: TEST_PRODUCT_LINE_NUMBER,
      quantity: { amount: testItemInitialQty + 1, uom: "C62" as UnitOfMeasure },
      noteToShopper: "Test note - please ignore",
      canSubstitute: false,
    }]);

    expect(result).toBeDefined();
    expect(result.failures).toBeNull();
  });

  test("restore original trolley state", async () => {
    if (testItemInitialQty === 0) {
      const result = await client.removeFromTrolley(TEST_PRODUCT_LINE_NUMBER);
      expect(result.failures).toBeNull();
    } else {
      const result = await client.updateTrolleyItems([{
        lineNumber: TEST_PRODUCT_LINE_NUMBER,
        quantity: { amount: testItemInitialQty, uom: "C62" as UnitOfMeasure },
      }]);
      expect(result.failures).toBeNull();
    }
  });

  test("verify trolley restored", async () => {
    const trolley = await client.getTrolley();
    const item = trolley.trolley.trolleyItems.find(
      i => i.lineNumber === TEST_PRODUCT_LINE_NUMBER
    );

    if (testItemInitialQty === 0) {
      expect(item?.quantity?.amount ?? 0).toBe(0);
    } else {
      expect(item?.quantity.amount).toBe(testItemInitialQty);
    }
  });
});

describe("Orders", () => {
  test("getPendingOrders returns array", async () => {
    const orders = await client.getPendingOrders(5);
    expect(Array.isArray(orders)).toBe(true);

    if (orders.length > 0) {
      expect(typeof orders[0].customerOrderId).toBe("string");
      expect(typeof orders[0].status).toBe("string");
    }
  });

  test("getPreviousOrders returns array", async () => {
    const orders = await client.getPreviousOrders(5);
    expect(Array.isArray(orders)).toBe(true);

    if (orders.length > 0) {
      expect(typeof orders[0].customerOrderId).toBe("string");
    }
  });

  test("getOrders returns combined orders", async () => {
    const { pending, previous } = await client.getOrders(3);

    expect(Array.isArray(pending)).toBe(true);
    expect(Array.isArray(previous)).toBe(true);
  });
});

describe("Slots", () => {
  test("getCurrentSlot returns slot or null", async () => {
    const slot = await client.getCurrentSlot();

    // Can be null if no slot booked
    if (slot?.startDateTime) {
      expect(typeof slot.slotType).toBe("string");
      expect(typeof slot.startDateTime).toBe("string");
    }
  });

  test("getSlotDates returns array of dates", async () => {
    try {
      const dates = await client.getSlotDates("DELIVERY");
      expect(Array.isArray(dates)).toBe(true);

      if (dates.length > 0) {
        expect(typeof dates[0].id).toBe("string");
        expect(typeof dates[0].dayOfWeek).toBe("string");
      }
    } catch (err) {
      // May fail if no delivery address configured
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toContain("address");
    }
  });
});

describe("Campaigns", () => {
  test("getCampaigns returns array", async () => {
    const campaigns = await client.getCampaigns();
    expect(Array.isArray(campaigns)).toBe(true);

    if (campaigns.length > 0) {
      expect(typeof campaigns[0].id).toBe("string");
      expect(typeof campaigns[0].name).toBe("string");
    }
  });
});

describe("Product Search (REST API)", () => {
  test("searchProducts returns results", async () => {
    const results = await client.searchProducts("milk");

    expect(results).toBeDefined();
    expect(Array.isArray(results.products)).toBe(true);
    expect(typeof results.totalMatches).toBe("number");
    expect(results.products.length).toBeGreaterThan(0);

    const product = results.products[0];
    expect(typeof product.id).toBe("string");
    expect(typeof product.lineNumber).toBe("string");
    expect(typeof product.name).toBe("string");
    expect(typeof product.displayPrice).toBe("string");
  });

  test("searchProducts with sorting", async () => {
    const results = await client.searchProducts("bread", {
      sortBy: "PRICE_LOW_2_HIGH",
      size: 10,
    });

    expect(Array.isArray(results.products)).toBe(true);
    expect(results.products.length).toBeGreaterThan(0);
  });

  test("searchProductsPage pagination works", async () => {
    const page1 = await client.searchProductsPage("cheese", 1, 10);
    const page2 = await client.searchProductsPage("cheese", 2, 10);

    expect(page1.products.length).toBeGreaterThan(0);
    
    // Verify pages are different if there are enough results
    if (page1.totalMatches > 10 && page2.products.length > 0) {
      const page1Ids = page1.products.map(p => p.lineNumber);
      const page2Ids = page2.products.map(p => p.lineNumber);
      const overlap = page1Ids.filter(id => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    }
  });

  test("browseProducts returns results", async () => {
    const results = await client.browseProducts("groceries/bakery");

    expect(results).toBeDefined();
    expect(Array.isArray(results.products)).toBe(true);
    expect(typeof results.totalMatches).toBe("number");
  });
});

describe("Session Management", () => {
  test("logout works", async () => {
    await client.logout();
    expect(client.isAuthenticated()).toBe(false);
  });

  test("can login again after logout", async () => {
    const newSession = await client.login(username, password);
    expect(newSession.accessToken).toBeDefined();
    expect(client.isAuthenticated()).toBe(true);
  });
});

