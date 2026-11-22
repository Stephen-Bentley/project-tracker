# Expose authenticated project listing over MCP

## Summary

Members can currently obtain their projects through the web API, but compatible
MCP clients have no way to discover Project Tracker data. Add a Streamable HTTP
MCP endpoint and one useful read-only tool, `list_my_projects`, so a signed-in
caller can retrieve only their own project list.

## User stories

- As a project member, I want my agent to list my accessible projects so that I
  can ask it for project-specific help without copying project data manually.

## Outcome

An authenticated caller can initialize against `POST /mcp`, discover
`list_my_projects`, and receive a safe serialized list of projects where they
are a member. An unauthenticated caller cannot initialize or list tools.

## Depends on

[Share bearer-token authentication safely](01-share-bearer-authentication.md).

## Context

The backend is Express 5 in `backend/src/app.ts`; `/health` is mounted outside
`/api`. `ProjectService.getProjectsByMember(userId)` already queries projects
whose `members` contain the supplied user and populates safe member display
fields. MCP must be vendor-neutral, use the official TypeScript MCP SDK, and
use a stateless Streamable HTTP transport at `/mcp`.

## Constraints

- Add `@modelcontextprotocol/sdk` and use its transport/JSON-RPC handling;
  do not implement MCP framing by hand.
- Keep MCP registration in `backend/src/mcp/` and keep Express wiring thin.
- Authenticate every MCP HTTP request before tool discovery or execution using
  the shared actor helper from Task 1.
- Register `list_my_projects` through a reusable MCP server factory; the
  factory must not depend on Express request objects.
- Use an explicit output serializer. Do not return raw Mongoose documents,
  password fields, refresh-token fields, avatar binary data, or internal
  version fields.
- Add an MCP-specific rate limit. It must be separate from the existing
  `/api` limit and allow ordinary protocol initialization plus one tool call.
- Do not add legacy SSE, write tools, or a public unauthenticated mode.

## Acceptance criteria

- `POST /mcp` accepts a valid authenticated MCP initialization request and
  advertises `list_my_projects` with a no-argument schema and clear description.
- An authenticated member receives only projects returned by
  `ProjectService.getProjectsByMember(actor.userId)`.
- A caller with no valid bearer token cannot enumerate tool names or project
  data.
- Tool results contain only documented project and member display fields.
- `/api` routes and `/health` continue to work as before.
- Protocol errors do not contain a token, stack trace, database query, or raw
  Mongoose document.

## Checks

- `npm run build --prefix backend`
- `npm test --prefix backend -- --runInBand`
- Add an integration test that starts the Express app with in-memory MongoDB,
  initializes an authenticated MCP client, and invokes `list_my_projects`.
- Add negative integration tests for missing and invalid bearer tokens.
- Manually initialize with MCP Inspector or a small MCP client against local
  `http://localhost:<port>/mcp` using a test JWT.

## Out of scope

Project detail, task tools, stdio, reverse-proxy deployment changes, and client
documentation.
