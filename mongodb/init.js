const databaseName = process.env.MONGO_INITDB_DATABASE || 'project_tracker';
const database = db.getSiblingDB(databaseName);

database.createUser({
  user: process.env.MONGO_APP_USERNAME,
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: 'readWrite', db: databaseName }],
});
