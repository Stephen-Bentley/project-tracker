# Share bearer-token authentication safely

**Status: Complete — 22 November 2026.** Shared bearer-token authentication
now returns a typed actor for valid signed tokens, and the existing Express
middleware uses the same helper. Focused tests were added; the TypeScript build
and direct smoke checks passed. The full Jest suite still needs to run in an
environment where Jest can write its temporary transform cache.

## Summary

Protected HTTP routes currently authenticate through Express middleware in
`backend/src/middleware/auth.middleware.ts`. An MCP server must authenticate
the same Project Tracker user without creating a second, inconsistent JWT
verification path. This task extracts a reusable bearer-token-to-actor helper
while preserving current API behavior.

## User stories

- As a user, I want an MCP client to have exactly the permissions of my Project
  Tracker account so that it cannot access projects I cannot open in the web UI.

## Outcome

HTTP middleware and non-HTTP code can both obtain a validated application actor
containing only `userId` and `role` from an authorization header or a supplied
token. Existing protected API routes continue to work unchanged.

## Depends on

[Decide the read-only MCP release boundary](00-decide-release-boundary.md).

## Context

`authenticate` currently requires an `Authorization` header beginning with
`Bearer `, passes the token to `verifyToken`, and assigns the decoded result to
`AuthRequest.user`. The decoded application identity is a `userId` and role of
`admin` or `user`. MCP HTTP requests need this identity before a tool handler
is selected; stdio will later obtain the raw token from `MCP_ACCESS_TOKEN`.

## Constraints

- Reuse the existing `verifyToken` logic and `JWT_SECRET`; do not introduce a
  new signing key or a separate user identity format.
- Reject missing, empty, malformed, expired, and invalid bearer tokens.
- Do not accept `userId` or role as MCP tool input or from an environment
  variable other than the signed token.
- Preserve API status and response behavior expected by existing route tests.
- Error objects and logs must not include the token.

## Acceptance criteria

- A shared helper returns a typed actor only for a valid bearer token.
- The existing `authenticate` middleware uses the shared validation path or is
  demonstrably equivalent through tests.
- Missing or malformed bearer headers still produce an API `401` response.
- Invalid and expired tokens still produce an API `401` response.
- The helper exposes no JWT payload fields beyond the application actor fields
  required for authorization.

## Checks

- `npm run build --prefix backend`
- `npm test --prefix backend -- --runInBand`
- Add focused unit tests for valid, missing, malformed, invalid, and expired
  bearer tokens.

## Out of scope

MCP protocol handling, OAuth, refresh-token changes, user login changes, and
tool implementation.
