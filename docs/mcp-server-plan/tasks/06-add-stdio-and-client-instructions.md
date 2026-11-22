# Add local stdio and client instructions

## Summary

The completed HTTP MCP endpoint provides portable remote access, but developers
also need a local process option and repeatable instructions for supported
clients. Add a stdio launcher that exposes the same read-only tools and publish
secret-free setup instructions for Codex and Claude Code.

## User stories

- As a developer, I want to connect my local Codex or Claude Code session to
  Project Tracker so that I can use the same authorized project tools during
  development.
- As an operator, I want documented remote connection requirements so that the
  shared MCP endpoint is deployed with the right URL, TLS, and proxy behavior.

## Outcome

The backend offers a documented stdio command using the same MCP tool factory
as HTTP. Codex and Claude Code have tested, copyable configuration examples
that keep tokens outside version control. Deployment documentation explains how
to publish the HTTP endpoint selected in Task 0.

## Depends on

[Expose one authorized task over MCP](05-expose-authorized-task.md).

## Context

The read-only tool catalog is now `list_my_projects`, `get_project`,
`list_project_tasks`, and `get_task`. Streamable HTTP is `/mcp` and authenticates
with an existing Project Tracker JWT. The stdio process cannot read a browser
authorization header, so it needs the raw access token through an environment
variable such as `MCP_ACCESS_TOKEN`. In stdio mode, stdout is reserved for MCP
JSON-RPC messages; diagnostic logs must go to stderr.

## Constraints

- Reuse the same MCP server factory and tool registrations as HTTP; do not
  duplicate tools or their authorization rules.
- The stdio launcher must fail safely when `MCP_ACCESS_TOKEN` is absent or
  invalid, without printing a token.
- Do not commit a real token, password, private host, or user identifier.
- Document only the clients named in Task 0 as supported. Other clients may be
  described as likely compatible but must not be promised without testing.
- The documentation must distinguish local stdio from remote Streamable HTTP
  configuration and state the 15-minute JWT expiry behavior selected in Task 0.
- If Nginx serves `/mcp`, configure and test the selected proxy behavior. Do
  not alter the existing `/api` proxy unintentionally.

## Acceptance criteria

- A command documented in `backend/package.json` starts the stdio server and
  exposes the four read-only tools with a valid `MCP_ACCESS_TOKEN`.
- The stdio process writes MCP protocol messages only to stdout and writes
  human-readable diagnostics only to stderr.
- Documentation contains setup examples for Codex and Claude Code using either
  the configured HTTP URL or the local stdio command, as appropriate.
- A developer can follow the instructions from a clean local client
  configuration and call every read-only tool successfully.
- Remote deployment instructions specify the public `/mcp` URL, HTTPS/TLS
  responsibility, authorization header requirement, rate-limit behavior, and
  known token-expiry recovery step.
- No examples or logs expose secrets.

## Checks

- `npm run build --prefix backend`
- `npm test --prefix backend -- --runInBand`
- Exercise the stdio command with an MCP test client; capture stdout and assert
  it contains no non-protocol logging.
- Follow the Codex setup instructions in a clean local configuration.
- Follow the Claude Code setup instructions in a clean local configuration.
- If HTTP is proxied, call all four tools through the deployed/proxied `/mcp`
  route and confirm responses are not buffered or truncated.

## Out of scope

OAuth, ChatGPT plugin submission, client-specific UI resources, write tools,
task file/image uploads, and support for clients not selected in Task 0.
