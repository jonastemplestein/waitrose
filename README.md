# waitrose

Unofficial CLI and API client for Waitrose grocery shopping.

## Quick Start

```bash
bunx waitrose help
```

## Install

```bash
bun add -g waitrose   # CLI
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

```typescript
import { WaitroseClient } from "waitrose";

const client = new WaitroseClient();
await client.login(email, password);

// Search products
const results = await client.searchProducts("milk");

// Add to trolley
await client.addToTrolley("088903", 2);

// Get trolley
const trolley = await client.getTrolley();
```

## Authentication

The bearer token expires after **15 minutes**. For best results, set environment variables—the CLI will automatically re-authenticate when needed:

```bash
export WAITROSE_USERNAME=your@email.com
export WAITROSE_PASSWORD=yourpassword
```

Alternatively, run `waitrose login` which prompts for credentials and stores the token locally.

## Config

Credentials stored in `~/.waitrose/config.json`

## License

MIT
