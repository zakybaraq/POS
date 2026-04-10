# Technology Stack

**Analysis Date:** 2026-04-10

## Languages

**Primary:**
- TypeScript (5.x) - Used throughout the codebase with `.ts` files
- JavaScript/HTML/CSS - Frontend pages served as static files

## Runtime

**Environment:**
- Bun 1.x - JavaScript runtime and package manager
- Node.js - Not explicitly listed, but compatible with Bun

**Package Manager:**
- Bun (built-in)
- Lockfile: Not detected (Bun uses `bun.lockb`)

## Frameworks

**Core:**
- Elysia 1.4.28 - Web framework for building REST APIs
- @elysiajs/cookie 0.8.0 - Cookie management for session handling

**Database:**
- Drizzle ORM 0.45.2 - TypeScript ORM for database operations
- mysql2 3.20.0 - MySQL driver for Node.js/Bun

**Authentication:**
- jsonwebtoken 9.0.3 - JWT token generation and verification
- bcryptjs 3.0.3 - Password hashing

**Validation:**
- zod 4.3.6 - Schema validation for request bodies

**Development:**
- drizzle-kit 0.31.10 - Database migration and schema generation
- @types/bun - TypeScript types for Bun runtime
- @types/jsonwebtoken - TypeScript types for JWT
- @types/bcryptjs - TypeScript types for bcrypt

## Key Dependencies

**Critical:**
- `elysia` - HTTP server and routing
- `drizzle-orm` - Database ORM
- `mysql2` - MySQL connection
- `jsonwebtoken` - JWT authentication
- `bcryptjs` - Password hashing

**Infrastructure:**
- `zod` - Input validation

## Configuration

**Environment:**
- Environment variables required:
  - `DB_HOST` - Database host (default: localhost)
  - `DB_USER` - Database user (default: root)
  - `DB_PASSWORD` - Database password (default: empty)
  - `DB_NAME` - Database name (default: pos_db)
  - `JWT_SECRET` - JWT signing secret (default: pos-secret-key-change-in-production)
  - `PORT` - Server port (default: 3000)

**Build:**
- `drizzle.config.ts` - Database schema and migration config

## Platform Requirements

**Development:**
- Bun runtime installed
- MySQL server running
- TypeScript

**Production:**
- MySQL database
- Bun runtime
- Environment variables configured

---

*Stack analysis: 2026-04-10*