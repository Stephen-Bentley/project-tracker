require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const newId = () => crypto.randomBytes(12).toString('hex');
const email =
  process.env.MCP_AUTOMATION_EMAIL || 'mcp-automation@project-tracker.local';
const label =
  process.env.MCP_TOKEN_LABEL || 'Primary MCP automation credential';
const outputPath =
  process.env.MCP_AUTOMATION_TOKEN_FILE ||
  path.resolve(process.cwd(), '.mcp-automation-token.local');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must be set.');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    let user = (
      await client.query('SELECT id FROM users WHERE email = $1', [email])
    ).rows[0];
    if (!user) {
      const passwordHash = await bcrypt.hash(
        crypto.randomBytes(32).toString('base64url'),
        12
      );
      user = { id: newId() };
      await client.query(
        'INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())',
        [user.id, 'MCP Automation', email, passwordHash, 'user']
      );
    }
    await client.query(
      'INSERT INTO project_members (project_id, user_id) SELECT id, $1 FROM projects ON CONFLICT DO NOTHING',
      [user.id]
    );
    const token = `mcp_${crypto.randomBytes(32).toString('base64url')}`;
    const tokenId = newId();
    await client.query(
      'INSERT INTO api_tokens (id, user_id, label, token_hash, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [
        tokenId,
        user.id,
        label,
        crypto.createHash('sha256').update(token).digest('hex'),
      ]
    );
    await client.query('COMMIT');
    fs.writeFileSync(
      outputPath,
      `MCP_AUTOMATION_EMAIL=${email}\nMCP_AUTOMATION_TOKEN=${token}\n`,
      { encoding: 'utf8', mode: 0o600 }
    );
    console.log(
      JSON.stringify({
        userId: user.id,
        email,
        tokenId,
        tokenFile: outputPath,
        projectsGranted: 'all',
      })
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
