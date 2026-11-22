CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(24) PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  avatar_url TEXT,
  avatar_image BYTEA,
  avatar_content_type TEXT,
  refresh_token_hash TEXT,
  refresh_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(24) PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by VARCHAR(24) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id VARCHAR(24) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id VARCHAR(24) NOT NULL REFERENCES users(id),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(24) PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  project_id VARCHAR(24) NOT NULL REFERENCES projects(id),
  assigned_to VARCHAR(24) REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'code_review', 'completed', 'done')),
  created_by VARCHAR(24) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);

CREATE TABLE IF NOT EXISTS task_images (
  id VARCHAR(128) PRIMARY KEY,
  task_id VARCHAR(24) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  data BYTEA NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS task_comments (
  id VARCHAR(128) PRIMARY KEY,
  task_id VARCHAR(24) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id VARCHAR(24) NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS task_activities (
  id VARCHAR(128) PRIMARY KEY,
  task_id VARCHAR(24) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id VARCHAR(24) NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
