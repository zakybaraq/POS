# POS (Point of Sale) System

A comprehensive Point of Sale system for restaurants built with Clean Architecture principles.

## Overview

**Version:** 2.2.0  
**Status:** Production Ready  
**Architecture:** Clean Architecture (4 layers)

## Features

- ✅ Order Management
- ✅ Inventory Tracking  
- ✅ Payment Processing
- ✅ Business Intelligence
- ✅ Supplier Management
- ✅ Purchase Orders
- ✅ Cost Analytics
- ✅ Auto-Reorder System

## Tech Stack

- **Framework:** Elysia + Bun
- **Database:** MySQL + Drizzle ORM
- **Authentication:** JWT with Cookies
- **Testing:** Vitest + Playwright
- **Architecture:** Clean Architecture

## Quick Start

```bash
# Install dependencies
bun install

# Setup database
bun run db:push

# Run development server
bun run dev

# Run tests
bun test
```

## Architecture

This project follows **Clean Architecture** with 4 distinct layers:

```
src/
├── api/              # Presentation Layer (routes, middleware, pages)
├── domain/           # Business Logic Layer (repositories, services, schemas)
├── infrastructure/   # External Concerns (database, websocket, email)
├── shared/           # Utilities (utils, templates, types)
└── config/           # Configuration
```

**Key Principles:**
- Dependencies only flow inward
- Domain layer has no external dependencies
- Infrastructure layer is easily swappable
- Business logic is framework independent

**Learn More:**
- [Architecture Guide](docs/ARCHITECTURE.md)
- [Migration Guide](docs/MIGRATION-GUIDE.md)
- [ADR-001: Why Clean Architecture](docs/ADR-001-clean-architecture.md)

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md) - Clean Architecture explanation
- [Migration Guide](docs/MIGRATION-GUIDE.md) - Migration from old structure
- [ADR-001](docs/ADR-001-clean-architecture.md) - Architecture Decision Record

## Testing

```bash
# Run unit tests
bun test

# Run E2E tests
bun run test:e2e

# Run E2E tests with UI
bun run test:e2e:ui
```

## Project Structure

```
.
├── docs/                 # Documentation
├── src/
│   ├── api/             # Routes, middleware, pages
│   ├── domain/          # Business logic
│   ├── infrastructure/  # External services
│   ├── shared/          # Utilities
│   └── config/          # Configuration
├── test/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── e2e/            # E2E tests
├── .planning/          # Project planning docs
└── package.json
```

## Development

### Path Aliases

Use path aliases for cleaner imports:

```typescript
// ✅ Good
import { orderRepo } from '@/domain/repositories';
import { db } from '@/infrastructure/database';

// ❌ Avoid
import { orderRepo } from '../../../domain/repositories/order';
```

### Barrel Exports

Import from module roots using barrel exports:

```typescript
// Import multiple from one location
import { 
  orderRepo, 
  userRepo, 
  createOrder 
} from '@/domain/repositories';
```

### Adding New Features

1. Determine which layer the feature belongs to
2. Create files in appropriate layer
3. Export from barrel (index.ts)
4. Write tests
5. Update documentation

## Milestones

### ✅ v1.0 - Core System
- Data integrity
- Security
- Testing
- Observability
- Performance

### ✅ v2.1 - Advanced Inventory
- Supplier management
- Purchase orders
- Cost analytics
- Auto-reorder

### 🔄 v2.2 - Codebase Refactoring
- Clean Architecture
- Directory restructure
- Code quality improvements
- Documentation

## Contributing

1. Follow Clean Architecture principles
2. Use barrel exports for modules
3. Write tests for new features
4. Update documentation
5. Follow naming conventions (kebab-case files)

## License

MIT

## Links

- [Architecture](docs/ARCHITECTURE.md)
- [Migration Guide](docs/MIGRATION-GUIDE.md)
- [Planning Docs](.planning/)

---

**Built with ❤️ using Clean Architecture principles**
