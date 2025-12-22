# waitrose

Unofficial CLI for Waitrose grocery shopping.

## Quick Start

```bash
bunx waitrose help
```

## Install

```bash
bun add -g waitrose
```

## Usage

```bash
# Login
waitrose login

# View trolley
waitrose trolley

# Search products
waitrose search "milk"

# Add to trolley
waitrose add <line-number> [quantity]

# See all commands
waitrose help
```

## Environment Variables

```
WAITROSE_USERNAME=your@email.com
WAITROSE_PASSWORD=yourpassword
```

## License

MIT
