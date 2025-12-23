# waitrose

Unofficial CLI and API client for Waitrose grocery shopping.

## Quick Start

```bash
bunx waitrose help
```

## Install

```bash
bun add -g waitrose   # CLI (global install)
bun add waitrose      # Library
```

## CLI Usage

```bash
waitrose login          # Login (prompts for email/password)
waitrose trolley        # View trolley
waitrose search "milk"  # Search products
waitrose add <line-number> [quantity]
waitrose help           # All commands
```

## Library Usage

The library exports a `WaitroseClient` class and all TypeScript types.

### Basic Setup

```typescript
import WaitroseClient from "waitrose";

const client = new WaitroseClient();
await client.login("email@example.com", "password");
```

### Search Products

```typescript
// Simple search
const results = await client.searchProducts("milk");
console.log(`Found ${results.totalMatches} products`);

for (const product of results.products) {
  console.log(`${product.name} - ${product.displayPrice} (${product.lineNumber})`);
}

// Search with options
const sorted = await client.searchProducts("bread", {
  size: 20,
  sortBy: "PRICE_LOW_2_HIGH",
});

// Paginated search
const page1 = await client.searchProductsPage("cheese", 1, 10);
const page2 = await client.searchProductsPage("cheese", 2, 10);

// Browse by category
const bakery = await client.browseProducts("groceries/bakery");
```

### Trolley Operations

```typescript
// Get current trolley
const trolley = await client.getTrolley();
console.log(`Items in trolley: ${trolley.trolley.trolleyItems.length}`);

// Add item to trolley (lineNumber, quantity)
await client.addToTrolley("088903", 2);

// Update item with note
await client.updateTrolleyItems([{
  lineNumber: "088903",
  quantity: { amount: 3, uom: "C62" },
  noteToShopper: "Ripe ones please",
  canSubstitute: true,
}]);

// Remove item
await client.removeFromTrolley("088903");

// Empty trolley
await client.emptyTrolley();
```

### Orders

```typescript
// Get all orders
const { pending, previous } = await client.getOrders(10);

// Get specific order with full details
const order = await client.getOrder("WEB-123456789");
console.log(`Order status: ${order.status}`);
console.log(`Total: £${order.totals.estimated?.totalPrice?.amount}`);

// Get product names for order lines
const lineNumbers = order.orderLines.map(line => line.lineNumber);
const products = await client.getProductsByLineNumbers(lineNumbers);

// Cancel an order
await client.cancelOrder("WEB-123456789");
```

### Delivery Slots

```typescript
// Get current booked slot
const currentSlot = await client.getCurrentSlot();
if (currentSlot?.startDateTime) {
  console.log(`Booked: ${currentSlot.startDateTime}`);
}

// Get available slot dates
const dates = await client.getSlotDates("DELIVERY");

// Get slots for a specific date
const slotDays = await client.getSlotDays("DELIVERY", dates[0].id);
for (const day of slotDays) {
  for (const slot of day.slots) {
    if (slot.status === "AVAILABLE") {
      console.log(`${slot.startDateTime} - £${slot.charge?.amount}`);
    }
  }
}

// Book a slot
await client.bookSlot(slotId, "DELIVERY", addressId);
```

### Account Info

```typescript
// Get account profile and memberships
const { profile, memberships } = await client.getAccountInfo();
console.log(`Email: ${profile.email}`);
console.log(`Address: ${profile.contactAddress?.line1}`);

// Get shopping context
const context = await client.getShoppingContext();
console.log(`Customer ID: ${context.customerId}`);
console.log(`Order ID: ${context.customerOrderId}`);
```

### Campaigns & Promotions

```typescript
const campaigns = await client.getCampaigns();
for (const campaign of campaigns) {
  console.log(`${campaign.name}: ${campaign.startDate} - ${campaign.endDate}`);
}
```

### Session Management

```typescript
// Check if authenticated
if (client.isAuthenticated()) {
  console.log(`Customer: ${client.getCustomerId()}`);
  console.log(`Order: ${client.getOrderId()}`);
}

// Logout
await client.logout();
```

### TypeScript Types

All types are exported for use in your application:

```typescript
import type {
  // Core types
  Session,
  ShoppingContext,
  Price,
  Quantity,
  
  // Trolley
  TrolleyResponse,
  TrolleyItem,
  TrolleyProduct,
  TrolleyItemInput,
  
  // Orders
  Order,
  OrderDetails,
  OrderLine,
  
  // Slots
  CurrentSlot,
  SlotDate,
  SlotDay,
  SlotType,
  BookSlotResult,
  
  // Search
  SearchProduct,
  SearchResponse,
  SearchSortBy,
  SearchQueryParams,
  ProductDetail,
  
  // Account
  AccountProfile,
  Membership,
  
  // Other
  Campaign,
  UnitOfMeasure,
  ApiFailure,
} from "waitrose";
```

## Authentication

The bearer token expires after **15 minutes**. For best results, set environment variables—the CLI will automatically re-authenticate when needed:

```bash
export WAITROSE_USERNAME=your@email.com
export WAITROSE_PASSWORD=yourpassword
```

For library usage, you can re-authenticate when needed:

```typescript
try {
  await client.getTrolley();
} catch (err) {
  // Token expired, re-authenticate
  await client.login(username, password);
  await client.getTrolley();
}
```

Alternatively, run `waitrose login` which prompts for credentials and stores the token locally.

## Config

Credentials stored in `~/.waitrose/config.json`

## License

MIT
