# Expose one authorized task over MCP

## Summary

The project task list supplies summaries, but an agent may need the full safe
details of one selected task. Add `get_task(taskId)` and enforce access through
the task's stored project. This avoids an authorization gap where a caller
could combine an arbitrary task identifier with a project identifier they do
belong to.

## User stories

- As a project member, I want my agent to inspect one task I can access so that
  it can help me understand its description, assignment, and status.

## Outcome

An authenticated project member can retrieve an allow-listed task detail
representation by task ID. The server derives the task's project itself and
denies a user outside that project.

## Depends on

[Expose project task lists over MCP](04-expose-project-task-list.md).

## Context

`Task` documents refer to one project, an optional assignee, and a creator.
Existing task access follows project membership checks. No existing service
method is documented for an MCP-safe single-task read, so this task may add one
to `TaskService` or a shared authorization-focused service function. The task
may also contain images and activity data that must not be returned wholesale.

## Constraints

- The tool accepts only a required `taskId` object-ID string; it must not take
  a project ID for authorization.
- Load the task, derive its stored project, and enforce membership for the
  JWT-derived actor before serializing task information.
- Use one explicit, size-bounded response representation. Include only fields
  required for task understanding, such as title, description, status, project
  ID, safe assignee/creator display details, and timestamps.
- Exclude image bytes, raw activity records unless a bounded approved summary
  is defined, database internals, credentials, and token-related fields.
- Return the same safe non-disclosing failure for a nonexistent task and a task
  outside the caller's accessible projects where practical.

## Acceptance criteria

- `get_task` is discoverable with one required `taskId` input.
- An authorized member receives the documented safe task detail fields.
- A user who belongs to Project A cannot retrieve a task belonging to Project B
  by changing only the task ID.
- A nonexistent or malformed ID does not produce a stack trace or raw database
  error.
- The response does not contain task image binary data or unbounded activity
  data.

## Checks

- `npm run build --prefix backend`
- `npm test --prefix backend -- --runInBand`
- Add MCP integration tests for authorized access, unauthorized cross-project
  access, nonexistent ID, and malformed ID.
- Assert the success result excludes image fields and other disallowed fields.

## Out of scope

Task updates, comments, assignment changes, task image retrieval, and stdio.
