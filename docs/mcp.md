# Project Tracker MCP server

Project Tracker exposes project-scoped MCP tools to compatible clients such as Codex and Claude. The server is client-neutral: each request is authorized as a Project Tracker user and can access only projects that user belongs to.

## Dedicated automation account

Use a dedicated `MCP Automation` user rather than a personal admin account. Provision it after `DATABASE_URL` has been configured:

```powershell
npm run mcp-token:provision --prefix backend
```

The command creates the account if necessary, adds it to all existing projects, creates a new opaque `mcp_...` credential, and writes that credential only to an ignored local file named `.mcp-automation-token.local`. The command output contains the token ID but never the token itself. Store the token in the client configuration, then move or securely delete that local file.

New projects add the automation account automatically when it exists. Send `addAutomationMember: false` while creating a project to opt out.

## Creating projects and completed tasks

`create_project` is available to admins and bearer tokens issued to the configured MCP automation account. It accepts `name`, optional `description`, and optional `addAutomationMember`. The authenticated account becomes the project creator and a member. When the automation account creates a project, an admin can add their own account from the admin project screen to open its board.

Use the returned project ID as `projectId` in `create_task`. To backfill work that is already finished, set `status` to `completed` when creating the task. Use `list_my_projects` and `list_project_tasks` to check for existing entries before creating new ones.

## Credentials and revocation

Use the opaque credential from the local token file as the HTTP bearer token. Only its SHA-256 hash is stored in PostgreSQL. The server records when it was last used and rejects revoked credentials immediately.

Create a replacement credential by running the provision command again. Revoke an old token by ID:

```powershell
npm run mcp-token:revoke --prefix backend -- <token-id>
```

Rotate a credential before sharing it widely, after a client is decommissioned, or whenever its secrecy is uncertain. Do not put the token in source control, ticket descriptions, command history, or logs.

## HTTP and local stdio

Start the backend and connect to:

```text
http://localhost:5000/mcp
```

Send either a normal Project Tracker JWT or a revocable `mcp_...` credential as a bearer token. Production deployments must use HTTPS and preserve the `Authorization` header.

For local stdio clients, set the token in the process environment and run:

```powershell
npm run mcp:stdio --prefix backend
```

The stdio process writes only MCP protocol messages to standard output.
