# Decide the read-only MCP release boundary

## Summary

Project Tracker has no MCP endpoint today. Before an endpoint is added, the
operator needs to decide where it will be reachable, which clients are a
compatibility promise, and how clients obtain valid credentials. Those choices
change the endpoint's network, TLS, proxy, and authentication behavior, so
implementation must not guess them.

## User stories

- As an operator, I want the intended MCP exposure and client support recorded
  so that the server is not accidentally deployed with unsuitable access.

## Outcome

A short approved decision record exists in `docs/mcp-server-plan/README.md` or
an adjacent dated decision file. It resolves every decision listed below and
is referenced by the implementation pull requests.

## Depends on

None.

## Context

The backend uses JWT bearer tokens that expire after 15 minutes. Docker Compose
publishes the backend on port 5000, while the frontend proxy currently forwards
only `/api`. The proposed portable endpoint is Streamable HTTP at `/mcp`, with
an optional local stdio entrypoint. Codex and Claude Code are the presently
named clients, but the user has not selected the production exposure model.

## Constraints

- This is a decision-only task. Do not add code, dependencies, secrets, client
  configurations, or public endpoints.
- The initial functional scope remains read-only: `list_my_projects`,
  `get_project`, `list_project_tasks`, and `get_task`.
- Do not select unauthenticated access.

## Acceptance criteria

- The record selects exactly one initial exposure model: local-only, private
  network/VPN, public HTTPS gateway, or a supported private tunnel.
- The record names the first supported clients and expressly labels other
  clients as untested rather than implied compatible.
- The record defines the first-release credential approach for 15-minute JWT
  expiry, including what a user does when it expires.
- The record states whether the public endpoint is direct-to-backend or
  proxied through Nginx, and who owns TLS termination.
- The record confirms that the first release has no write tools.

## Checks

- Review the decision record with the application operator.
- Verify the chosen exposure model is feasible with the deployed network and
  reverse-proxy arrangement before starting Task 1.

## Out of scope

OAuth implementation, write-tool selection, audit retention design, and any
application code changes.
