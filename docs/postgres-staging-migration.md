# PostgreSQL staging migration

This migration copies Project Tracker data from MongoDB to a separate local
PostgreSQL staging database. It never deletes or updates MongoDB. The backend
now uses PostgreSQL through `DATABASE_URL`; MongoDB remains the rollback source
until the cutover has been accepted.

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

## Run the application on PostgreSQL

Set `DATABASE_URL` in `backend/.env` to the PostgreSQL database you intend to
use, then run the normal development command. For the local staging container,
the URL uses port `5433` and the database/user values from
`.env.postgres-staging`. Do not remove the MongoDB settings until the
PostgreSQL-backed application has been accepted and backed up.

The migration may be run again before cutover. It replaces only the guarded
staging tables with a fresh MongoDB snapshot, so it carries newly created
projects and tasks across without changing MongoDB.
