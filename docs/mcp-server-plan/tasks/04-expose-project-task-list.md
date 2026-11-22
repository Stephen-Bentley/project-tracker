# Expose authorized project task lists over MCP

## Summary

Project members can view a project's board tasks in the web application, but
agents cannot yet retrieve that work context. Add `list_project_tasks` so an
agent can list the tasks of one authorized project while preserving existing
membership rules and avoiding bulky image data.

## User stories

- As a project member, I want my agent to list a project's tasks so that I can
  review work status without manually transcribing the board.

## Outcome

An authenticated member can call `list_project_tasks(projectId)` and receive
a safe task summary list for that project. Users outside the project cannot use
the tool to learn whether its tasks exist.

## Depends on

[Expose safe project details over MCP](03-expose-project-details.md).

## Context

The task route `GET /api/tasks/project/:projectId` is protected and its
controller/service path already has project-membership behavior. Task records
have title, optional description, project, optional assignee, creator, status,
timestamps, activity, and up to three image subdocuments containing binary
data. The backend accepts legacy `done` status values; the frontend displays
them as Code review.

## Constraints

- Require `projectId` through a strict input schema and verify membership from
  server-owned project data before returning any task.
- Reuse existing task/project service behavior or factor a shared service
  method that preserves current authorization semantics.
- Return a documented summary representation, not raw task documents. Exclude
  image buffers, image content types, internal document fields, credentials,
  and unbounded activity/comment content.
- Preserve stored task status values in this release, including legacy `done`.
  Do not silently apply the frontend-only display normalization.
- Do not add filtering, pagination, sorting, search, task mutations, or image
  retrieval without an approved follow-up design.

## Acceptance criteria

- `list_project_tasks` is discoverable with a required `projectId` schema.
- A member receives only tasks that belong to the requested project.
- A non-member cannot retrieve task data for that project.
- Task summaries contain no image binary data or unbounded embedded content.
- A legacy `done` record is returned as its stored status, and current allowed
  statuses remain readable.
- Invalid project IDs produce a stable validation failure before a database
  query.

## Checks

- `npm run build --prefix backend`
- `npm test --prefix backend -- --runInBand`
- Add MCP integration tests using two users, two projects, and tasks in each.
- Add a serialization test proving image buffers are absent.
- Test a legacy `done` task and a normal `completed` task.

## Out of scope

Individual task detail, image tools, task writes, dashboard tools, and stdio.
