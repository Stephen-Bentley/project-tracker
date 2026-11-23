require('dotenv').config();

const { Client } = require('pg');
const tokenId = process.argv[2];

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must be set.');
if (!/^[a-f0-9]{24}$/i.test(tokenId || ''))
  throw new Error('Pass the 24-character token ID to revoke.');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const result = await client.query(
    'UPDATE api_tokens SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL RETURNING id',
    [tokenId]
  );
  await client.end();
  if (!result.rowCount) throw new Error('Active MCP token not found.');
  console.log(JSON.stringify({ revokedTokenId: tokenId }));
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
