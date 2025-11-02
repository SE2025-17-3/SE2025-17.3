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

- `20251102094401-add-userId-to-pixels.cjs`: Add userId field to pixels collection and create indexes

## Notes

- Migrations are tracked in the `changelog` collection in MongoDB
- Migration files must use `.cjs` extension due to ES modules in package.json
- Always test migrations in development before running in production
- The `down()` method should safely rollback changes when possible

## Database Schema

See the main README or Prisma schema for the current database structure.
