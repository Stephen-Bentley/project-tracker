# Project Tracker MCP server

Project Tracker provides a read-only MCP server for compatible clients. It has
four tools: `list_my_projects`, `get_project`, `list_project_tasks`, and
`get_task`. Every request is authorized as the Project Tracker user represented
by an existing JWT; the server does not provide arbitrary database access or
write operations.

## HTTP

Start the backend normally and connect an MCP client to:

```text
http://localhost:5000/mcp
```

Send the normal Project Tracker access JWT as a bearer token in the
`Authorization` header. The token expires after 15 minutes; obtain a new token
by signing in again when the client reports an authorization failure. Production
deployments must use HTTPS and preserve the `Authorization` header.

## Local stdio

Set a valid access token in your shell environment, then run:

```text
npm run mcp:stdio --prefix backend
```

The stdio process writes only MCP protocol messages to standard output. Do not
put the token in a committed client configuration file.

## Client configuration

Configure Codex or Claude Code with either the HTTP endpoint and its bearer
token support, or the local stdio command above. The MCP protocol implementation
is client-neutral; each client still requires its own connection configuration.
