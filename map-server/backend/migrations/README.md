# Database Migrations

This project uses `migrate-mongo` for MongoDB database migrations.

## Setup

The migrate-mongo configuration is in `migrate-mongo-config.cjs` and uses the `MONGO_URI` environment variable from `.env`.

## Available Commands

```bash
# Check migration status
npm run migrate:status

# Create a new migration
npm run migrate:create <migration-name>

# Run all pending migrations
npm run migrate:up

# Rollback the last migration
npm run migrate:down
```

## Migration Files

Migration files are stored in the `migrations/` directory with `.cjs` extension (CommonJS format).

Each migration has two methods:
- `up()`: Apply the migration
- `down()`: Rollback the migration

## Example: Creating a New Migration

```bash
# 1. Create migration file
npm run migrate:create add-new-field

# 2. Edit the generated file in migrations/
# migrations/YYYYMMDDHHMMSS-add-new-field.cjs

# 3. Run the migration
npm run migrate:up

# 4. Check status
npm run migrate:status
```

## Applied Migrations

### 1. `20251102094401-add-userId-to-pixels.cjs`
**Date:** November 2, 2025  
**Purpose:** Add user tracking to pixels

**Changes:**
- Added `userId` field to existing pixels (nullable)
- Created index on `userId` field
- Ensured unique compound index on `(gx, gy)`
- Created index on `updatedAt` field

**Collections affected:** `pixels`

---

### 2. `20251120101450-add-pixelevent-and-team-models.cjs`
**Date:** November 20, 2025  
**Purpose:** Add team system and pixel event tracking for leaderboards

**Changes:**
- Created `teams` collection with indexes: `name` (unique), `createdBy`, `createdAt`
- Added `teamId` field to `users` collection (nullable) with index
- Created `pixelevents` collection for tracking all pixel placements
  - Indexes: `createdAt`, `userId + createdAt`, `teamId + createdAt`

**Collections affected:** `teams` (new), `users` (modified), `pixelevents` (new)

**Enables:** Team management, Leaderboard tracking (top players/teams by time period)

---

## Current Schema

After all migrations:

```
📦 Collections:
├── users (username, email, password, teamId*, createdAt, updatedAt)
├── teams (name, createdBy, createdAt, updatedAt)
├── pixels (gx, gy, color, userId*, updatedAt)
├── pixelevents (gx, gy, color, userId*, teamId*, createdAt)
└── sessions (expires, session)

* nullable fields
```

- `20251102094401-add-userId-to-pixels.cjs`: Add userId field to pixels collection and create indexes

## Notes

- Migrations are tracked in the `changelog` collection in MongoDB
- Migration files must use `.cjs` extension due to ES modules in package.json
- Always test migrations in development before running in production
- The `down()` method should safely rollback changes when possible

## Database Schema

See the main README or Prisma schema for the current database structure.
