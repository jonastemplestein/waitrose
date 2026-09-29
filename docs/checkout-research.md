# Android checkout evidence

Examined the previously downloaded Waitrose Android APK, version 3.9.1.14114.
SHA-256: `c3410642ab236ac7e03817e58edccde39caf7b62bafd1dfa7ef08cbe01113a58`.
The APK and decompiled sources are not distributed in this repository.

JADX references (case-insensitive macOS paths may have renamed class files):

- `gz/InterfaceC8061a`: POST
  `order-orchestration-{environment}/v1/orders/{customerOrderId}/place`.
- `ux/Y`, `vy/C11353a`, `wy/C11603b`: the orders service uses `restApiUrl`,
  which is `base_rest_url + "api/"`. Production resources specify
  `https://www.waitrose.com/` and environment `prod`.
- `lz/c`: authenticated access token and `PlaceOrderBody` for instant orders;
  400, 404 and 409 map to instant-checkout failures.
- `com/waitrose/sdk/services/orders/model/PlaceOrderBody`: JSON fields
  `instantCheckout: true` and `event: "PLACE"`.
- `com/waitrose/sdk/services/orders/service/rest/model/RemotePlacedOrder`:
  `customerOrderId`, `totals`, and `slots`.
- `com/waitrose/sdk/graphql/type/InstantCheckout`: `ALLOWED`, `NOT_ALLOWED`,
  `THRESHOLD_EXCEEDED`. CachedTrolley permits instant checkout only for ALLOWED.
- Resources `checkout_url` and `Ep/b`: separate web checkout and authenticated
  WebView cookie flow. The library provides the public checkout URL, never cookies.

The existing GetTrolley query already requested eligibility and readiness but
its TypeScript response omitted them. These fields are now typed and used in
checkout preflight. Missing/unknown readiness fails closed. The library refreshes
shopping context to avoid using a sealed/cached session's previous order ID.

This supports the native instant-checkout path with existing account payment
setup. When Waitrose denies eligibility, payment setup, challenges, or the full
web checkout must be completed at https://www.waitrose.com/ecom/checkout.
It does not implement raw card entry or bypass payment authentication.

`getCheckout` reads only. `placeOrder` checks the reviewed order and estimated
amount/currency again, then sends one placement POST without retries or redirects.
An ambiguous response/timeout/5xx raises CheckoutOutcomeUnknownError with the
order ID: query getOrder before deciding what to do next. This is not an atomic
price lock or payment settlement confirmation; upstream totals remain estimates.

Validation uses synthetic responses, including stale context, changed totals,
eligibility, missing slots, hard conflicts, provider rejection, malformed
success, and lost responses. No real order was submitted during development.
Run `bun test src/checkout.test.ts` (the other API tests can mutate a live trolley).
