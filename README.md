# Project Tracker

Project Tracker is a React and Express application for managing projects, members, and tasks. It uses PostgreSQL for the running application and supports a cross-client MCP server for Codex, Claude, and other compatible clients.

## Run locally

1. Start PostgreSQL. For the local staging database, use the instructions in [PostgreSQL staging migration](docs/postgres-staging-migration.md).
2. Set `DATABASE_URL` and `JWT_SECRET` in `backend/.env`.
3. Install dependencies and start the app:

```powershell
npm ci
npm ci --prefix backend
npm ci --prefix frontend
npm run dev
```

The frontend runs on `http://localhost:3000` and the API runs on `http://localhost:5000`.

## PostgreSQL data

The application stores users, projects, memberships, tasks, images, comments, activities, refresh tokens, and MCP credential hashes in PostgreSQL. The initial schema is in [postgres-schema.sql](backend/scripts/postgres-schema.sql).

The MongoDB copy tool is retained only for a guarded, copy-only migration into a PostgreSQL staging database. It never modifies the MongoDB source. See [PostgreSQL staging migration](docs/postgres-staging-migration.md) before using it.

## MCP

The MCP endpoint is `POST /mcp`. It provides project creation, project-scoped reads, and task writes through the official MCP SDK. Use the dedicated automation account and its revocable `mcp_...` credential rather than a personal JWT.

Provisioning, client setup, token rotation, and revocation are documented in [MCP server](docs/mcp.md).

## Deployment

`docker-compose.yml` runs PostgreSQL, the Express backend, and the frontend. It expects `DATABASE_URL`, `JWT_SECRET`, and PostgreSQL settings from an ignored environment file based on [.env.example](.env.example).

## Verification

Run the backend type check with:

```powershell
npm run build --prefix backend
```

With Docker running, execute the backend suite against PostgreSQL:

```powershell
npm run test:postgres --prefix backend
```

The runner starts a disposable PostgreSQL container on a random loopback port, loads the current schema, and stops the container when Jest exits. It generates its own database and credentials and ignores the application's configured `DATABASE_URL`.
