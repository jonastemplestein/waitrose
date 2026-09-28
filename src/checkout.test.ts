import { afterEach, describe, expect, test } from "bun:test";
import WaitroseClient, { CheckoutOutcomeUnknownError } from "../waitrose.ts";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function setup(overrides: { eligibility?: string; total?: number; currentOrder?: string; slot?: boolean; conflicts?: number; minimum?: boolean; status?: number; malformed?: boolean; network?: boolean } = {}) {
  const client = new WaitroseClient();
  Object.assign(client, { accessToken: "secret", customerOrderId: "stale-order" });
  const calls: { url: string; body: any; headers: Headers; redirect?: string }[] = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    const body = JSON.parse(init?.body as string);
    calls.push({ url, body, headers: new Headers(init?.headers), redirect: init?.redirect });
    if (url.endsWith("/place")) {
      if (overrides.network) throw new Error("secret network failure");
      if (overrides.status) return new Response("secret provider failure", { status: overrides.status });
      if (overrides.malformed) return Response.json({ ok: true });
      return Response.json({ customerOrderId: "order-1", totals: { estimated: {}, actual: {} }, slots: [] });
    }
    if (body.query.includes("query GetShoppingContext")) return Response.json({ data: { shoppingContext: { customerOrderId: overrides.currentOrder ?? "order-1", defaultBranchId: "branch" } } });
    if (body.query.includes("query GetTrolley")) {
      expect(body.variables.orderId).toBe(overrides.currentOrder ?? "order-1");
      return Response.json({ data: { getTrolley: {
        instantCheckout: overrides.eligibility ?? "ALLOWED", checkoutReadiness: { slotTypeValid: true }, failures: [], products: [],
        trolley: { orderId: overrides.currentOrder ?? "order-1", trolleyItems: [{ lineNumber: "milk" }], conflicts: [],
          trolleyTotals: { totalEstimatedCost: { amount: overrides.total ?? 50, currencyCode: "GBP" }, minimumSpendThresholdMet: overrides.minimum ?? true, trolleyItemCounts: { hardConflicts: overrides.conflicts ?? 0 } } },
      } } });
    }
    if (body.query.includes("query CurrentSlot")) {
      expect(body.variables.input.customerOrderId).toBe(overrides.currentOrder ?? "order-1");
      return Response.json({ data: { currentSlot: overrides.slot === false ? null : { id: "slot-1" } } });
    }
    throw new Error("Unexpected request");
  }) as typeof fetch;
  return { client, calls, placements: () => calls.filter(c => c.url.endsWith("/place")) };
}
const order = { orderId: "order-1", expectedTotal: { amount: 50, currencyCode: "GBP" } };

describe("APK instant checkout", () => {
  test("review is read-only and refreshes stale session context", async () => {
    const { client, placements } = setup();
    const review = await client.getCheckout();
    expect(review.canPlaceOrder).toBe(true);
    expect(review.orderId).toBe("order-1");
    expect(placements()).toHaveLength(0);
  });
  test("places once using APK endpoint, bearer and exact native body", async () => {
    const { client, placements } = setup();
    expect((await client.placeOrder(order)).customerOrderId).toBe("order-1");
    expect(placements()).toHaveLength(1);
    const call = placements()[0]!;
    expect(call.url).toBe("https://www.waitrose.com/api/order-orchestration-prod/v1/orders/order-1/place");
    expect(call.body).toEqual({ instantCheckout: true, event: "PLACE" });
    expect(call.headers.get("authorization")).toBe("Bearer secret");
    expect(call.redirect).toBe("manual");
  });
  for (const [label, options] of Object.entries({
    ineligible: { eligibility: "NOT_ALLOWED" }, threshold: { eligibility: "THRESHOLD_EXCEEDED" },
    unknown: { eligibility: "NEW_STATE" }, price: { total: 51 }, order: { currentOrder: "order-2" },
    slot: { slot: false }, conflicts: { conflicts: 1 }, minimum: { minimum: false },
  })) test(`blocks ${label} before placement`, async () => {
    const { client, placements } = setup(options);
    await expect(client.placeOrder(order)).rejects.toThrow();
    expect(placements()).toHaveLength(0);
  });
  test("currency mismatch cannot place", async () => {
    const { client, placements } = setup();
    await expect(client.placeOrder({ ...order, expectedTotal: { amount: 50, currencyCode: "EUR" } })).rejects.toThrow("total has changed");
    expect(placements()).toHaveLength(0);
  });
  for (const options of [{ network: true }, { malformed: true }, { status: 500 }, { status: 408 }]) {
    test(`ambiguous outcome is never retried: ${JSON.stringify(options)}`, async () => {
      const { client, placements } = setup(options);
      await expect(client.placeOrder(order)).rejects.toBeInstanceOf(CheckoutOutcomeUnknownError);
      expect(placements()).toHaveLength(1);
    });
  }
  test("rejection is redacted and never retried", async () => {
    const { client, placements } = setup({ status: 409 });
    await expect(client.placeOrder(order)).rejects.toThrow("Waitrose checkout rejected (409)");
    expect(placements()).toHaveLength(1);
  });
});
