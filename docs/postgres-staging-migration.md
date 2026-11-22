# PostgreSQL staging migration

This migration copies Project Tracker data from MongoDB to a separate local
PostgreSQL staging database. It never deletes or updates MongoDB. It is not an
application cutover; the running application continues to use MongoDB.

## Start PostgreSQL

Copy `.env.postgres-staging.example` to `.env.postgres-staging`, set a strong
password, then run:

```powershell
docker compose --env-file .env.postgres-staging -f docker-compose.postgres-staging.yml up -d
```

Wait for the container to be healthy before migrating.

## Copy and verify data

Load the normal MongoDB connection settings and the staging PostgreSQL values
into the same shell, then run:

```powershell
npm run migrate:postgres:staging --prefix backend
```

The migration refuses to run unless `MIGRATION_CONFIRM_COPY_ONLY=1` and the
target database name includes `staging`. It uses transactions and upserts, then
compares MongoDB and PostgreSQL counts for users, projects, memberships, tasks,
images, comments, and activities. It prints counts only, never record contents
or credentials.

Each run clears only the migration tables in the guarded PostgreSQL staging
database before copying. This makes every successful run an exact fresh snapshot
of MongoDB and never changes the MongoDB source.

MongoDB remains the rollback source. Do not point `POSTGRES_MIGRATION_URL` at
a production database.
