# Expose safe project details over MCP

## Summary

After an agent identifies a project, it needs its name, description, and member
context. The web API already provides this to project members. Add a
`get_project` MCP tool that returns equivalent safe project details without
allowing callers to infer the contents of projects they do not belong to.

## User stories

- As a project member, I want my agent to inspect one of my projects so that I
  can ask questions with the correct project context.

## Outcome

An authenticated project member can call `get_project` with a valid
`projectId`. Non-members and invalid requests receive a stable safe failure,
and the response excludes sensitive/internal fields.

## Depends on

[Expose authenticated project listing over MCP](02-expose-project-listing.md).

## Context

`ProjectService.getProjectById(projectId, userId)` loads a project, populates
member display fields, and verifies that the supplied user is a member.
`Project` records include a creator reference and member list. Current service
errors use status-bearing `Error` objects; MCP needs a protocol-safe error
mapping rather than controller-formatted JSON.

## Constraints

- Define a strict Zod input schema containing a required MongoDB object ID
  string named `projectId`.
- Authorize with the JWT-derived actor only; never trust a caller-supplied user
  ID, role, or membership assertion.
- Reuse `ProjectService.getProjectById` or move its authorization-preserving
  logic into a shared service helper. Do not make a raw model query in the MCP
  handler.
- Serialize an explicit allow-list of project fields and safe member display
  fields. Exclude database internals and any binary avatar data.
- Map unauthorized and absent records to a response that does not disclose a
  protected record's existence to a non-member.

## Acceptance criteria

- The MCP tool catalog describes `get_project` and requires `projectId`.
- A member receives the selected project's safe details.
- A valid user who is not a project member cannot retrieve its name,
  description, members, or creator information.
- Malformed object IDs do not reach Mongoose and produce a stable input error.
- The tool returns no raw Mongoose document, token, password, refresh-token,
  avatar binary field, or stack trace.

## Checks

- `npm run build --prefix backend`
- `npm test --prefix backend -- --runInBand`
- Add MCP integration tests for a member, non-member, nonexistent ID, and
  malformed ID.
- Assert the response's serialized field set in at least one successful test.

## Out of scope

Task listing, task detail, project mutation, member administration, and stdio.
