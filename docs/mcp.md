# Project Tracker MCP server

Project Tracker exposes project-scoped MCP tools to compatible clients such as Codex and Claude. The server is client-neutral: each request is authorized as a Project Tracker user and can access only projects that user belongs to.

## Dedicated automation account

Use a dedicated `MCP Automation` user rather than a personal admin account. Provision it after `DATABASE_URL` has been configured:

```powershell
npm run mcp-token:provision --prefix backend
```

The command creates the account if necessary, adds it to all existing projects, creates a new opaque `mcp_...` credential, and writes that credential only to an ignored local file named `.mcp-automation-token.local`. The command output contains the token ID but never the token itself. Store the token in the client configuration, then move or securely delete that local file.

New projects add the automation account automatically when it exists. Send `addAutomationMember: false` while creating a project to opt out.

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
