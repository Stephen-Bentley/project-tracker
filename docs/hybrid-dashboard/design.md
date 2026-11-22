# Hybrid Personal Work Dashboard

> **Status:** Implemented on `codex/hybrid-dashboard`

## 1. Executive summary

The current dashboard is a simple launch page, so users must open a project board before they can see what needs attention. This change keeps the existing project navigation and admin actions, while adding a personal work view built from the application's existing tasks, comments, activities, and projects. The dashboard will show assigned work, attention signals, recent updates, and shortcuts into the relevant board or task. The main tradeoff is that signals such as blockers and replies needed must be inferred from the local task model until explicit fields are added.

## 2. Context and scope

Today, `frontend/src/pages/Dashboard.tsx` renders only a hero and action buttons. Tasks already support assignees, five workflow states, comments, activity history, timestamps, and project membership through the Express/Mongoose backend.

In scope:

- A dashboard summary for the signed-in user.
- Assigned active tasks grouped by actionable state.
- Search and filters for the user's tasks.
- Recent comments and activity updates on relevant tasks.
- A lightweight Today's focus and Watch list derived from existing data.
- Direct navigation to projects and task details.
- Loading, empty, error, and refresh states.

Out of scope for this change:

- External integrations or a backend technology migration.
- Pull requests, branches, story points, due dates, labels, or external blockers until the domain supports them.
- Management reporting, sprint analytics, or team-wide workload views.

## 3. System context

The change stays inside the current boundaries:

```text
React Dashboard
    | authenticated API request
    v
Express task/dashboard controller
    |
    v
TaskService + Project/User models
    |
    v
MongoDB
```

The backend remains responsible for authorization and shaping dashboard data. The frontend remains responsible for presentation, local search/filter state, and navigation. The existing project board and task mutation endpoints remain unchanged unless implementation identifies a necessary shared response type.

## 4. Proposed design

### How it works

After sign-in, the dashboard requests one authenticated dashboard payload. The backend finds projects the user belongs to, selects unresolved tasks assigned to that user, and derives summary counts, focus items, watch items, recent comments, and recent activity from those tasks. It returns stable frontend-friendly objects. The page renders the summary cards and work queue, and clicking a task opens its project board with the task detail flow available.

### Components and responsibilities

- `DashboardController` and dashboard routes own the authenticated read endpoint and response status codes. They do not contain ranking or MongoDB query details.
- `DashboardService` owns task selection, derived flags, ranking, truncation, and response shaping. It does not mutate tasks or bypass project membership checks.
- `Task` remains the source of truth for status, assignee, comments, activities, and timestamps. No duplicate dashboard records are introduced.
- `Dashboard.tsx` owns page layout, request state, search/filter controls, and navigation. It does not infer authorization or recalculate backend counts.
- Dashboard-specific types and API helpers define the contract shared by the page and tests.

### Decisions

The first version uses one aggregated endpoint rather than five independent requests. This keeps counts and lists consistent and reduces loading complexity; the cost is a larger response and less independent caching.

The first version treats `todo` and `in_progress` assigned tasks as active work, `code_review` as in review, and `completed`/`done` as closed. A task is blocked when its status is not actionable and its latest activity or comment contains an explicit blocked signal; this is a conservative approximation until a dedicated blocked field exists.

The first version derives “replies needed” when the latest comment is from another user and the task is assigned to the current user. Question-mark text may increase the signal but must not be the only condition. This gives useful behavior without claiming certainty.

The dashboard keeps the current green visual identity while adding restrained blue, purple, amber, and red accents for status meaning. Existing global theme variables and responsive patterns should be reused rather than adding a new UI dependency.

## 5. Invariants and requirements

### Invariants

- `INV-1`: Every dashboard result is limited to tasks in projects where the authenticated user is a member.
- `INV-2`: Active work contains only tasks assigned to the authenticated user and not in a terminal status.
- `INV-3`: Summary counts are calculated from the same task snapshot as the displayed dashboard response.
- `INV-4`: Dashboard reads do not expose image binary data or authentication secrets.
- `INV-5`: Existing project-board task creation, editing, commenting, assignment, and image flows continue to work.

### Requirements

- Show four summary cards: Waiting on me, Blocked, In review, and Replies needed.
- Show an active-work queue with project name, task title, status, assignee context, updated time, and latest relevant update.
- Provide search over task title, project name, status, and update text.
- Provide filters for All, Waiting on me, In progress, Code review, Blocked, and Comments.
- Show Today's focus and Recent updates, with a Watch list when matching items exist.
- Provide explicit refresh and retry behavior.
- Support narrow screens without horizontal scrolling.

## 6. Interfaces and data

Add an authenticated endpoint:

```http
GET /api/dashboard
```

The response should contain:

```ts
{
  summary: {
    waitingOnMe: number;
    blocked: number;
    inReview: number;
    repliesNeeded: number;
  };
  activeWork: DashboardTask[];
  todaysFocus: DashboardFocusItem[];
  watchList: DashboardWatchItem[];
  recentUpdates: DashboardUpdate[];
  generatedAt: string;
}
```

`DashboardTask` should use stable task and project IDs and include title, project name, status, updated time, latest comment/update preview, and derived flags. Dates remain ISO strings; the browser formats relative time.

The endpoint must use the existing bearer/session authentication middleware and return `401` when unauthenticated. It should return an empty, valid payload when the user has no projects or assigned work, not a `404`.

## 7. Failure behavior and lifecycle

On initial load, the page shows skeleton or loading content. On a failed request, it keeps the page shell visible with a retry action and a concise error message. Refresh replaces the payload only after a successful response, so a transient refresh failure does not erase usable data.

The backend should use bounded result sizes for active work, comments, activities, and focus items. Ranking and filtering must be deterministic for the same database snapshot. If a task has malformed or missing optional comments/activities, the task remains visible with those sections omitted.

## 8. Security, privacy, and operations

Authorization is enforced server-side using the authenticated user ID and project membership. Client-provided user IDs, project IDs, and filters must not broaden the query. The response contains task metadata and comment previews already visible to project members; image content and tokens are excluded.

Add indexes or query patterns only where profiling shows need, starting with `Task.project`, `Task.assignedTo`, `Task.status`, and `updatedAt`. Avoid unbounded population of image data. Log failures without comment bodies or credentials.

## 9. Acceptance criteria

- `AC-1`: An authenticated user sees summary counts and lists derived only from their permitted projects.
- `AC-2`: Assigned open tasks appear in My active work and terminal tasks do not.
- `AC-3`: Search and each required filter update the visible queue without another network request.
- `AC-4`: Recent comments and activity updates identify the task and provide a route to its project/task view.
- `AC-5`: Empty, loading, error, and retry states are usable and tested.
- `AC-6`: Existing project-board tests and backend security tests remain passing.
- `AC-7`: Frontend production build and backend TypeScript build complete successfully.

## 10. Test approach

Backend service tests cover `INV-1` through `INV-3`, derived flags, terminal statuses, empty users, and malformed optional activity data. Route tests cover authentication and that unrelated project tasks are excluded.

Frontend tests cover `AC-2` through `AC-5`, including search/filter behavior, navigation callbacks, refresh failure retention, and responsive-safe rendering at the component level. Existing test suites and both builds prove `INV-4`, `INV-5`, `AC-6`, and `AC-7`.

## 11. Risks and tradeoffs

- Derived blocked/reply signals may be imperfect. Keep them visibly labeled as attention signals and add explicit task fields in a later schema change.
- A single aggregated query may become slow as projects grow. Bound response lists and add pagination or caching only after measuring real data.
- Dashboard styles could drift from the board. Reuse existing CSS variables and status naming in one shared presentation layer where practical.

## 12. Open questions

- Should “blocked” be a manual task flag in the first implementation? Recommended default: no, use conservative derived signals and defer schema changes.
- Should the active queue include unassigned tasks created by the user? Recommended default: no, keep it personal and assignment-based.
- Should task detail open as a modal directly from the dashboard? Recommended default: reuse the project-board route and existing modal flow to avoid duplicate mutation logic. These questions do not block the initial task breakdown.

## 13. Out of scope

- External issue-tracker integration or account authorization flows.
- Pull-request or branch synchronization.
- New task fields for priority, story points, due dates, labels, or explicit blockers.
- Team, sprint, capacity, velocity, or release reporting.

## 14. Implementation plan

1. Add dashboard response types and an authenticated backend read endpoint.
2. Implement `DashboardService` queries and deterministic derived/ranking rules.
3. Add backend tests for membership isolation, counts, derived flags, and empty/error cases.
4. Add frontend API integration and replace the landing-only dashboard with the hybrid layout.
5. Add frontend tests for loading, empty, error, search, filters, refresh, and navigation.
6. Run formatting, backend/frontend builds, and the relevant test suites.
7. Review the final diff for scope creep and confirm the existing project board remains unchanged.
