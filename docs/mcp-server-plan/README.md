# Cross-client MCP server plan

## Purpose

Add a standards-compliant Model Context Protocol (MCP) server to Project Tracker.
The server must be usable by Codex, Claude Code, and any other compatible MCP
client without a provider-specific implementation. It will expose narrowly
defined Project Tracker capabilities, not arbitrary database access, shell
access, or generic HTTP proxying.

This document is a pickup point for the implementation. It records the chosen
direction, existing application boundaries, task order, expected interfaces,
security requirements, and verification work.

## Current application context

- The backend is an Express 5 application in `backend/src` using TypeScript,
  CommonJS modules, Mongoose, and MongoDB.
- `backend/src/server.ts` connects to MongoDB and starts the HTTP server.
- `backend/src/app.ts` configures middleware, mounts the `/api` routes, and
  exposes `/health`.
- Authentication is a JWT bearer token. `authenticate` in
  `backend/src/middleware/auth.middleware.ts` verifies it and attaches a
  `userId` and `role` (`admin` or `user`) to the request.
- `ProjectService` and `TaskService` contain persistence and domain rules.
  Project reads require membership, and task access is controlled through the
  project membership rules.
- Docker Compose currently publishes the backend on port 5000 and the frontend
  proxies `/api` to it. There is no MCP endpoint today.

The MCP server must call shared services or shared authorization helpers. Do
not duplicate the web route/controller logic or issue raw MongoDB queries from
MCP tool handlers.

## Decided direction

### Server and transports

1. Use the official TypeScript MCP SDK, `@modelcontextprotocol/sdk`.
2. Make Streamable HTTP the supported remote transport at `POST /mcp`.
   This is the portable remote endpoint for Codex, Claude Code, and other
   current MCP clients.
3. Provide a separate stdio entrypoint for a developer's local agent process.
   It must use the same tool registration and business-logic layer as the HTTP
   server, but it must not start an Express listener.
4. Do not add legacy HTTP+SSE unless a named client cannot use Streamable HTTP.
   If compatibility becomes necessary, add it as an explicitly tested adapter;
   do not replace the modern endpoint.
5. Start with a stateless HTTP transport. The first release does not need
   server-initiated requests, subscriptions, or retained transport sessions.

### Authentication and authorization

1. Require `Authorization: Bearer <JWT>` on all HTTP MCP requests, including
   initialization and tool calls. Use the existing JWT verification logic.
2. Preserve the current user identity and role when invoking tools. A tool
   caller may only read or change data that the equivalent authenticated web
   user may access.
3. Treat the MCP server as a new trust boundary. Do not accept a user ID, role,
   project membership, or database query from a tool argument as authority.
4. Configure CORS deliberately for the MCP route. Browser clients may require
   allowed origins, but a public wildcard is not an authorization mechanism.
5. Do not put JWTs or other secrets in committed configuration, example client
   configs, logs, tool results, or error details.
6. OAuth is out of scope for the first release. It becomes a follow-up when
   third-party users need long-lived delegated access without manually managing
   Project Tracker JWTs.

### Tool design

The initial release is read-only. This gives clients useful project context
without allowing an agent to mutate work unexpectedly.

| Tool                 | Input       | Required rule                                  | Result                                                    |
| -------------------- | ----------- | ---------------------------------------------- | --------------------------------------------------------- |
| `list_my_projects`   | none        | Caller identity comes from JWT.                | Projects where the caller is a member.                    |
| `get_project`        | `projectId` | Caller must be a project member.               | Project details and safe member fields.                   |
| `list_project_tasks` | `projectId` | Caller must be a project member.               | Tasks for that project; omit image bytes.                 |
| `get_task`           | `taskId`    | Caller must be a member of the task's project. | One task and safe activity/comment metadata if available. |

Tool inputs must use explicit JSON schemas with required fields, format
descriptions, and length limits where appropriate. Tool results should be
structured JSON or concise text plus structured content; they must never expose
password hashes, refresh tokens, JWTs, raw image buffers, or stack traces.

After read-only tools are proven, add write tools only as a separate release:

- `create_task`
- `update_task`
- `assign_task`
- `add_task_comment` (only if comments are implemented in the application)

Each write tool must use the same validation and authorization as the existing
API, have an idempotency strategy where a retry could duplicate data, return
the changed record, and be configured to require client-side confirmation when
the client supports it. File/image upload tools are explicitly deferred.

### Endpoint and operations contract

- MCP endpoint: `/mcp` on the backend origin; example:
  `https://tracker.example.com/mcp`.
- Health endpoint remains `/health`. Add a lightweight MCP readiness check only
  if it can confirm route registration without exposing tool details or calling
  the database unnecessarily.
- Apply a route-specific rate limit to `/mcp`. Tune it separately from `/api`
  because MCP clients can make several protocol requests for one user action.
- Log a request/correlation ID, authenticated user ID, tool name, outcome, and
  duration. Redact authorization headers and tool arguments that may contain
  task text or other sensitive content.
- Return protocol-safe errors. Authorization failures must not reveal whether a
  protected project or task exists to an unauthorized caller.

## Delivery plan

### Milestone 1: Shared authorization and MCP foundation

**Goal:** An authenticated MCP client can initialize against the backend and
discover a small read-only tool catalog without any new authorization path.

**Work:**

1. Add the MCP SDK and any required compatible HTTP transport dependencies to
   `backend/package.json`; update the lockfile.
2. Create `backend/src/mcp/` with a factory that registers the MCP server name,
   version, tools, and error translation. The factory must not reference
   Express request objects directly.
3. Extract or adapt a shared function that verifies an existing bearer JWT and
   creates an application actor (`userId`, `role`). Keep the existing HTTP
   authentication middleware working unchanged.
4. Add `backend/src/mcp/http.ts` that attaches the stateless Streamable HTTP
   transport at `/mcp` to the existing Express app. Ensure protocol POST,
   accepted headers, content negotiation, and response streaming are handled
   by the SDK, not custom JSON-RPC code.
5. Add a separate `backend/src/mcp/stdio.ts` command entrypoint. It reads the
   JWT from a named environment variable such as `MCP_ACCESS_TOKEN`; it must
   not print non-protocol output to stdout. Human-readable logs belong on
   stderr.
6. Add route-specific rate limiting, security headers/CORS review, redacted
   structured logging, and a clear startup log that does not disclose secrets.
7. Add an environment-variable section to `.env.example` and deployment
   configuration only for non-secret switches such as an enable flag or MCP
   rate limit. Do not make the HTTP endpoint unauthenticated in development.

**Acceptance criteria:**

- `POST /mcp` rejects missing, malformed, and expired bearer tokens with a
  protocol-safe unauthorized response.
- A valid JWT can initialize and list the read-only tools.
- The existing `/api` authentication and `/health` behavior remain unchanged.
- The stdio command can initialize and list the same tools when it receives a
  valid token through its environment.
- No token appears in logs or server output.

**Checks:**

- `npm run build --prefix backend`
- `npm test --prefix backend`
- A targeted MCP integration test using an in-memory MongoDB server.
- A manual protocol check with MCP Inspector or a small authenticated MCP test
  client against the local HTTP endpoint.

### Milestone 2: Read-only project and task tools

**Goal:** Authorized agents can obtain useful project and task context through
the four initial tools, while receiving the same data boundaries as web users.

**Depends on:** Milestone 1.

**Work:**

1. Define Zod input schemas and result serializers for the four initial tools.
   The serializers must be explicit allow-lists rather than raw Mongoose
   document serialization.
2. Reuse `ProjectService.getProjectsByMember` and
   `ProjectService.getProjectById`, or make small service changes where needed
   to keep authorization centralized and testable.
3. Add a service method for retrieving one task with project-membership
   enforcement before exposing `get_task`. Do not rely on a caller-provided
   project ID to authorize task access.
4. Use the existing task listing behavior for `list_project_tasks`, preserving
   membership checks and status compatibility (`done` remains readable as the
   legacy stored value unless an explicitly documented MCP normalization rule
   is chosen).
5. Map expected domain failures to stable MCP errors: invalid input, unauthenticated,
   forbidden/not found, and internal error. Do not return controller-shaped
   HTTP messages or database implementation details.
6. Add focused tests for member access, non-member denial, admin behavior,
   malformed IDs, result redaction, and tool error mapping.

**Acceptance criteria:**

- `list_my_projects` never returns projects outside the caller's membership.
- `get_project` and `list_project_tasks` deny a valid user who is not a member.
- `get_task` verifies membership based on the task's stored project.
- Read results omit password fields, refresh-token fields, image binary data,
  and unneeded database internals.
- Existing API tests still pass.

**Checks:**

- Milestone 1 checks.
- MCP integration tests for every tool using at least two users and two
  projects, one of which the caller cannot access.
- Manual invocation from one configured local client.

### Milestone 3: Client setup and deployment documentation

**Goal:** A developer or operator can run and connect a compatible client
without reading source code or copying credentials into version control.

**Depends on:** Milestone 2.

**Work:**

1. Add `docs/mcp-server-plan/client-setup.md` during implementation (or move
   it to the main docs area once stable). Include exact, secret-free examples
   for Codex, Claude Code, and a generic Streamable HTTP MCP client.
2. Document local stdio setup and remote HTTP setup separately. Explain that
   the protocol server is shared but each client maintains its own connection
   configuration.
3. Update `README.md` with endpoint purpose, prerequisites, how to run the
   server locally, tool catalog, authentication requirements, and troubleshooting.
4. Update `docker-compose.yml` / deployment documentation if `/mcp` needs a
   reverse-proxy rule. The current frontend Nginx proxy only needs adjustment
   if the public MCP URL is served through the frontend origin; direct backend
   publication does not need that proxy rule.
5. Document operational ownership: JWT secret rotation implications, rate
   limits, logging/redaction, supported protocol transport, and client
   compatibility test cadence.

**Acceptance criteria:**

- A fresh developer can connect Codex and Claude Code to a locally running
  server using the documented approach.
- Documentation contains no real token, password, host, or user identifier.
- Deployment instructions identify the public `/mcp` URL and required HTTPS
  termination for remote use.

**Checks:**

- Follow the documentation in a clean local configuration for Codex.
- Follow the documentation in a clean local configuration for Claude Code.
- Verify a remote/proxied deployment preserves streaming response behavior.

### Milestone 4: Controlled write tools (separate approval)

**Goal:** Agents can make narrowly scoped task changes after the read-only
server has been deployed and reviewed.

**Depends on:** Milestone 3 and explicit product approval of every write tool.

**Work:**

1. Decide which existing task actions are safe to automate and define their
   confirmation behavior for each supported client.
2. Implement one write tool at a time through existing validation and service
   rules. Do not expose project member administration, user creation, password
   changes, or file upload in this milestone.
3. Add idempotency/request identifiers for create operations if the transport
   or client can retry after an uncertain response.
4. Add audit events or sufficiently detailed structured logs before enabling
   mutations in production.
5. Test unauthorized, invalid, duplicate/retried, and successful requests.

**Acceptance criteria:**

- Each write tool has a documented authorization rule, confirmation expectation,
  validation path, and observable audit trail.
- Retried create requests do not silently create duplicate tasks.
- A client cannot use a write tool to modify a project it cannot access.

## Open decisions before implementation

These decisions change behavior or operations and must be made before the
associated milestone begins.

1. **Exposure model:** Is `/mcp` private to the local network/VPN, published
   behind an internet-facing HTTPS gateway, or connected to OpenAI products
   through a private tunnel? The answer determines reverse-proxy, TLS, and
   client-discovery configuration.
2. **Initial client set:** Confirm whether the first compatibility target is
   Codex desktop/CLI and Claude Code, or whether Claude Desktop, Cursor, VS
   Code, and ChatGPT Plugins are also release targets. Test only committed
   targets as compatibility promises.
3. **Credential lifecycle:** Existing access JWTs expire after 15 minutes.
   Decide whether local clients will refresh tokens manually for the first
   release, whether an MCP-specific short-lived token issuer is needed, or
   whether OAuth is required before remote adoption.
4. **Write permissions:** Confirm whether the first release is read-only as
   specified here. Do not infer permission to mutate project data merely
   because a client supports tool confirmations.
5. **Audit retention:** Decide where MCP audit records live, retention period,
   and who may read them before adding write tools.

## Risks and safeguards

| Risk                                                            | Safeguard                                                                                                                    |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Agent receives more access than its user.                       | Authenticate every request and enforce project membership from server-owned data.                                            |
| Prompt injection persuades an agent to call a destructive tool. | Begin read-only; add explicit, narrow write tools only with client confirmation and auditability.                            |
| Sensitive data enters client context or logs.                   | Use allow-list serializers and redact headers, tokens, image buffers, passwords, and refresh tokens.                         |
| Client transport incompatibility.                               | Use Streamable HTTP plus optional stdio; test each explicitly supported client before claiming support.                      |
| Reverse proxy buffers protocol responses.                       | Test the deployed path with streaming enabled; configure proxy buffering/timeouts only if the chosen SDK/client requires it. |
| Token expiry breaks long agent sessions.                        | Decide credential lifecycle before release; document failure and reconnection behavior.                                      |
| MCP handlers drift from API rules.                              | Route handlers through shared service and authorization logic; add cross-boundary regression tests.                          |

## Definition of done for the read-only release

The read-only release is complete when the HTTP and stdio transports expose the
same four tools, authenticated callers see only authorized data, automated
tests cover the authorization matrix and redaction, builds and existing tests
pass, Codex and Claude Code have been connected using documented configurations,
and deployment/operational documentation is present.

## Reference material

- MCP TypeScript SDK server and transport documentation:
  <https://ts.sdk.modelcontextprotocol.io/server>
- OpenAI MCP server guidance:
  <https://developers.openai.com/api/docs/mcp>
- OpenAI documentation MCP cross-client configuration examples:
  <https://developers.openai.com/learn/docs-mcp>
