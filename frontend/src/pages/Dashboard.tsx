import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutSession } from '../api/session';
import { getDashboard } from '../api/dashboard';
import { DashboardData, DashboardTask } from '../types/dashboard';
import { formatCalendarDate } from '../utils/calendarDate';
import './Dashboard.css';

type Filter =
  'all' | 'waiting' | 'in_progress' | 'code_review' | 'blocked' | 'comments';

const statusLabels: Record<DashboardTask['status'], string> = {
  todo: 'To do',
  in_progress: 'In progress',
  code_review: 'Code review',
  completed: 'Completed',
  done: 'Completed',
};

const formatRelativeTime = (value: string) => {
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 60000)
  );
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const loadDashboard = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setData(await getDashboard());
    } catch {
      setError('We could not load your dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const visibleTasks = useMemo(() => {
    if (!data) return [];
    const normalizedQuery = query.trim().toLowerCase();
    return data.activeWork.filter((task) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'waiting' && task.waitingOnMe) ||
        (filter === 'blocked' && task.blocked) ||
        (filter === 'comments' && task.hasComments) ||
        task.status === filter;
      const matchesQuery =
        !normalizedQuery ||
        `${task.title} ${task.projectName} ${statusLabels[task.status]} ${task.latestUpdate || ''}`
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesFilter && matchesQuery;
    });
  }, [data, filter, query]);

  const logout = async () => {
    await logoutSession();
    window.location.replace('/login');
  };

  const openTask = (task: { taskId?: string; projectId: string }) => {
    if (task.taskId) {
      navigate(`/projects/${task.projectId}/task/${task.taskId}`);
    } else {
      navigate(`/projects/${task.projectId}`);
    }
  };

  if (loading) {
    return (
      <main className="dashboard-page dashboard-page--loading">
        <p>Loading your dashboard...</p>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p>Personal work dashboard</p>
          <h1>What needs your attention?</h1>
          <span>
            See your assigned work, recent updates, and the next useful action
            in one place.
          </span>
        </div>
        <button
          className="dashboard-refresh"
          onClick={() => void loadDashboard(true)}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      {error && (
        <section
          className="dashboard-message dashboard-message--error"
          role="alert"
        >
          <span>{error}</span>
          <button onClick={() => void loadDashboard()}>Try again</button>
        </section>
      )}

      {data && (
        <>
          <section className="dashboard-metrics" aria-label="Work summary">
            <Metric
              label="Waiting on me"
              value={data.summary.waitingOnMe}
              tone="blue"
            />
            <Metric label="Blocked" value={data.summary.blocked} tone="red" />
            <Metric
              label="In review"
              value={data.summary.inReview}
              tone="purple"
            />
            <Metric
              label="Replies needed"
              value={data.summary.repliesNeeded}
              tone="amber"
            />
          </section>

          <section className="dashboard-layout">
            <div className="dashboard-main-column">
              <div className="dashboard-section-heading">
                <div>
                  <p className="dashboard-eyebrow">Your working queue</p>
                  <h2>My active work</h2>
                </div>
                <span>{visibleTasks.length} shown</span>
              </div>
              <div className="dashboard-controls">
                <label className="dashboard-search">
                  <span className="sr-only">Search active work</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search your tasks"
                  />
                </label>
                <label className="dashboard-filter">
                  <span className="sr-only">Filter active work</span>
                  <select
                    value={filter}
                    onChange={(event) =>
                      setFilter(event.target.value as Filter)
                    }
                  >
                    <option value="all">All</option>
                    <option value="waiting">Waiting on me</option>
                    <option value="in_progress">In progress</option>
                    <option value="code_review">Code review</option>
                    <option value="blocked">Blocked</option>
                    <option value="comments">Comments</option>
                  </select>
                </label>
              </div>
              <div className="dashboard-task-list">
                {visibleTasks.map((task) => (
                  <button
                    className="dashboard-task-card"
                    key={task.id}
                    onClick={() => openTask(task)}
                  >
                    <div className="dashboard-task-topline">
                      <span>{task.projectName}</span>
                      <time dateTime={task.updatedAt}>
                        {formatRelativeTime(task.updatedAt)}
                      </time>
                    </div>
                    <h3>{task.title}</h3>
                    <div className="dashboard-task-meta">
                      <span
                        className={`status-badge status-badge--${task.status}`}
                      >
                        {statusLabels[task.status]}
                      </span>
                      {task.waitingOnMe && (
                        <span className="attention-badge">Needs attention</span>
                      )}
                      {task.blocked && (
                        <span className="attention-badge attention-badge--danger">
                          Blocked
                        </span>
                      )}
                    </div>
                    {task.latestUpdate && <p>{task.latestUpdate}</p>}
                    {task.latestUpdateAuthor && (
                      <small>{task.latestUpdateAuthor} · latest update</small>
                    )}
                  </button>
                ))}
                {!visibleTasks.length && (
                  <div className="dashboard-empty">
                    No active tasks match this view.
                  </div>
                )}
              </div>
            </div>

            <aside className="dashboard-side-column">
              {!!data.overdueWork?.length && (
                <DashboardList
                  title="Overdue work"
                  items={data.overdueWork.map((task) => ({
                    ...task,
                    label: `Due ${formatCalendarDate(task.dueDate)}`,
                    detail: task.projectName,
                  }))}
                  onOpen={openTask}
                />
              )}
              <DashboardList
                title="Today's focus"
                items={data.todaysFocus}
                onOpen={(item) =>
                  openTask({ taskId: item.taskId, projectId: item.projectId })
                }
              />
              <section className="dashboard-panel">
                <div className="dashboard-section-heading dashboard-section-heading--compact">
                  <div>
                    <p className="dashboard-eyebrow">Stay aware</p>
                    <h2>Watch list</h2>
                  </div>
                </div>
                {data.watchList.length ? (
                  data.watchList.map((item) => (
                    <button
                      className="dashboard-watch-item"
                      key={item.taskId}
                      onClick={() => openTask(item)}
                    >
                      <strong>{item.title}</strong>
                      <span>{item.reason}</span>
                    </button>
                  ))
                ) : (
                  <p className="dashboard-panel-empty">
                    Nothing needs watching right now.
                  </p>
                )}
              </section>
            </aside>
          </section>

          <section className="dashboard-panel dashboard-updates">
            <div className="dashboard-section-heading dashboard-section-heading--compact">
              <div>
                <p className="dashboard-eyebrow">Keep context</p>
                <h2>Recent updates</h2>
              </div>
            </div>
            {data.recentUpdates.length ? (
              data.recentUpdates.map((task) => (
                <button
                  className="dashboard-update-item"
                  key={task.id}
                  onClick={() => openTask(task)}
                >
                  <span className="dashboard-update-dot" aria-hidden="true" />
                  <span>
                    <strong>{task.projectName}</strong> ·{' '}
                    {task.latestUpdate || 'Task updated'}
                    <small>
                      {task.title} · {formatRelativeTime(task.updatedAt)}
                    </small>
                  </span>
                </button>
              ))
            ) : (
              <p className="dashboard-panel-empty">No recent updates yet.</p>
            )}
          </section>
        </>
      )}

      <section className="dashboard-actions">
        <button
          onClick={() => navigate('/projects')}
          className="dashboard-action dashboard-action--primary"
        >
          <strong>My projects</strong>
          <span>Open your boards and keep work moving.</span>
        </button>
        {role === 'admin' && (
          <button
            onClick={() => navigate('/admin/projects')}
            className="dashboard-action"
          >
            <strong>Admin tools</strong>
            <span>Create users and start a new project.</span>
          </button>
        )}
        <button
          onClick={logout}
          className="dashboard-action dashboard-action--danger"
        >
          <strong>Log out</strong>
          <span>End this session on this device.</span>
        </button>
      </section>
    </main>
  );
};

const Metric = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) => (
  <article className={`dashboard-metric dashboard-metric--${tone}`}>
    <span>{label}</span>
    <strong>{value}</strong>
  </article>
);

const DashboardList = ({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: Array<{
    taskId: string;
    projectId: string;
    label: string;
    title: string;
    detail: string;
  }>;
  onOpen: (item: { taskId: string; projectId: string }) => void;
}) => (
  <section className="dashboard-panel">
    <div className="dashboard-section-heading dashboard-section-heading--compact">
      <div>
        <p className="dashboard-eyebrow">Prioritised</p>
        <h2>{title}</h2>
      </div>
    </div>
    {items.length ? (
      items.map((item) => (
        <button
          className="dashboard-focus-item"
          key={item.taskId}
          onClick={() => onOpen(item)}
        >
          <strong>{item.label}</strong>
          <span>{item.title}</span>
          <small>{item.detail}</small>
        </button>
      ))
    ) : (
      <p className="dashboard-panel-empty">No focus items yet.</p>
    )}
  </section>
);

export default Dashboard;
