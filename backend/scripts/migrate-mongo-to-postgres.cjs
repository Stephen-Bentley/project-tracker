require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { Client } = require('pg');

const requireValue = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set.`);
  return value;
};

const id = (value) => (value == null ? null : String(value));
const nestedId = (value, fallback) => (value?._id ? String(value._id) : fallback);
const timestamp = (value) => (value ? new Date(value) : new Date(0));
const toBuffer = (value) => {
  if (value == null) return null;
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (Buffer.isBuffer(value.buffer)) return Buffer.from(value.buffer);
  if (typeof value.value === 'function') return Buffer.from(value.value(true));
  throw new Error('Unsupported MongoDB binary value.');
};

const assertStagingTarget = (connectionString) => {
  const databaseName = new URL(connectionString).pathname.replace(/^\//, '');
  if (!databaseName.includes('staging')) {
    throw new Error('POSTGRES_MIGRATION_URL must target a database whose name includes "staging".');
  }
};

const readSource = async (db) => {
  const [users, projects, tasks] = await Promise.all([
    db.collection('users').find({}).toArray(),
    db.collection('projects').find({}).toArray(),
    db.collection('tasks').find({}).toArray(),
  ]);
  return { users, projects, tasks };
};

const executeSchema = async (client) => {
  const schemaPath = path.join(__dirname, 'postgres-schema.sql');
  await client.query(fs.readFileSync(schemaPath, 'utf8'));
};

const resetStagingData = async (client) => {
  await client.query(
    'TRUNCATE TABLE task_activities, task_comments, task_images, project_members, tasks, projects, users'
  );
};

const copyData = async (client, source) => {
  for (const user of source.users) {
    await client.query(
      `INSERT INTO users (id, name, email, password_hash, role, avatar_url, avatar_image, avatar_content_type, refresh_token_hash, refresh_token_expires_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, avatar_url = EXCLUDED.avatar_url, avatar_image = EXCLUDED.avatar_image, avatar_content_type = EXCLUDED.avatar_content_type, refresh_token_hash = EXCLUDED.refresh_token_hash, refresh_token_expires_at = EXCLUDED.refresh_token_expires_at, updated_at = EXCLUDED.updated_at`,
      [id(user._id), user.name, user.email, user.password, user.role, user.avatarUrl || null, toBuffer(user.avatarImage), user.avatarContentType || null, user.refreshTokenHash || null, user.refreshTokenExpiresAt || null, timestamp(user.createdAt), timestamp(user.updatedAt)]
    );
  }

  for (const project of source.projects) {
    await client.query(
      `INSERT INTO projects (id, name, description, created_by, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, created_by = EXCLUDED.created_by, updated_at = EXCLUDED.updated_at`,
      [id(project._id), project.name, project.description || null, id(project.createdBy), timestamp(project.createdAt), timestamp(project.updatedAt)]
    );
    for (const member of project.members || []) {
      await client.query(
        `INSERT INTO project_members (project_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [id(project._id), id(member)]
      );
    }
  }

  for (const task of source.tasks) {
    await client.query(
      `INSERT INTO tasks (id, title, description, project_id, assigned_to, status, created_by, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, project_id = EXCLUDED.project_id, assigned_to = EXCLUDED.assigned_to, status = EXCLUDED.status, created_by = EXCLUDED.created_by, updated_at = EXCLUDED.updated_at`,
      [id(task._id), task.title, task.description || null, id(task.project), id(task.assignedTo), task.status, id(task.createdBy), timestamp(task.createdAt), timestamp(task.updatedAt)]
    );
    for (const [index, image] of (task.images || []).entries()) {
      await client.query(
        `INSERT INTO task_images (id, task_id, filename, content_type, data, uploaded_at) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, content_type = EXCLUDED.content_type, data = EXCLUDED.data, uploaded_at = EXCLUDED.uploaded_at`,
        [nestedId(image, `${id(task._id)}:image:${index}`), id(task._id), image.filename, image.contentType, toBuffer(image.data), timestamp(image.uploadedAt)]
      );
    }
    for (const [index, comment] of (task.comments || []).entries()) {
      await client.query(
        `INSERT INTO task_comments (id, task_id, author_id, body, created_at) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO UPDATE SET author_id = EXCLUDED.author_id, body = EXCLUDED.body, created_at = EXCLUDED.created_at`,
        [nestedId(comment, `${id(task._id)}:comment:${index}`), id(task._id), id(comment.author), comment.body, timestamp(comment.createdAt)]
      );
    }
    for (const [index, activity] of (task.activities || []).entries()) {
      await client.query(
        `INSERT INTO task_activities (id, task_id, actor_id, type, message, created_at) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET actor_id = EXCLUDED.actor_id, type = EXCLUDED.type, message = EXCLUDED.message, created_at = EXCLUDED.created_at`,
        [nestedId(activity, `${id(task._id)}:activity:${index}`), id(task._id), id(activity.actor), activity.type, activity.message, timestamp(activity.createdAt)]
      );
    }
  }
};

const verify = async (client, source) => {
  const expected = {
    users: source.users.length,
    projects: source.projects.length,
    tasks: source.tasks.length,
    project_members: source.projects.reduce((count, project) => count + (project.members || []).length, 0),
    task_images: source.tasks.reduce((count, task) => count + (task.images || []).length, 0),
    task_comments: source.tasks.reduce((count, task) => count + (task.comments || []).length, 0),
    task_activities: source.tasks.reduce((count, task) => count + (task.activities || []).length, 0),
  };
  for (const [table, expectedCount] of Object.entries(expected)) {
    const { rows } = await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
    if (rows[0].count !== expectedCount) throw new Error(`Verification failed for ${table}.`);
  }
  console.log(JSON.stringify({ migration: 'verified', counts: expected }));
};

const main = async () => {
  if (process.env.MIGRATION_CONFIRM_COPY_ONLY !== '1') {
    throw new Error('Set MIGRATION_CONFIRM_COPY_ONLY=1 to run the copy-only migration.');
  }
  const mongoUri = requireValue('MONGO_URI');
  const postgresUrl = requireValue('POSTGRES_MIGRATION_URL');
  assertStagingTarget(postgresUrl);

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  const source = await readSource(mongoose.connection.db);
  const client = new Client({ connectionString: postgresUrl });
  await client.connect();

  try {
    await client.query('BEGIN');
    await executeSchema(client);
    await resetStagingData(client);
    await copyData(client, source);
    await verify(client, source);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  main().catch((error) => {
    console.error(`Migration failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { toBuffer };
