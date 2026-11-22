# Read-only MCP delivery tasks

These tasks break the read-only MCP server release into small, reviewable pull
requests. Complete them in numerical order. Each task is self-contained and
can be handed to an engineer who has repository access but no conversation
history.

| Order | Task                                                                               | Depends on | Intended result                                                               |
| ----- | ---------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| 0     | [Decide the release boundary](00-decide-release-boundary.md)                       | None       | The exposure model, supported clients, and credential lifecycle are recorded. |
| 1     | [Share bearer-token authentication](01-share-bearer-authentication.md)             | 0          | HTTP and MCP code can create the same authenticated actor safely.             |
| 2     | [Expose authenticated project listing](02-expose-project-listing.md)               | 1          | An HTTP MCP client can discover and call `list_my_projects`.                  |
| 3     | [Expose safe project details](03-expose-project-details.md)                        | 2          | A project member can call `get_project` without data leakage.                 |
| 4     | [Expose project task listing](04-expose-project-task-list.md)                      | 3          | A project member can call `list_project_tasks`.                               |
| 5     | [Expose one authorized task](05-expose-authorized-task.md)                         | 4          | A project member can call `get_task` safely.                                  |
| 6     | [Add local stdio and client instructions](06-add-stdio-and-client-instructions.md) | 5          | Codex and Claude Code can connect using documented configurations.            |

The parent [MCP server plan](../README.md) is the source of the architectural
decisions, risk register, and later write-tool roadmap. These task briefs do
not authorize write tools.
