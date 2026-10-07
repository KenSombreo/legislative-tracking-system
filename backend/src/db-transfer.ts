// Copies the whole database to / from a single JSON file, without the MongoDB
// database tools. Uses Extended JSON so ObjectIds and dates survive the trip.
//
//   Export (on the PC):
//     npx ts-node src/db-transfer.ts export legislative_tracking.json
//   Import (on the server, inside the backend container):
//     docker exec legislative-tracking-backend node dist/db-transfer.js import /tmp/legislative_tracking.json
//
// Import refuses to touch a collection that already has documents unless
// --replace is given, which empties those collections first.
import * as fs from 'fs';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const { EJSON } = mongoose.mongo.BSON;

interface Dump {
  database: string;
  exportedAt: string;
  collections: Record<string, any[]>;
}

async function exportDb(db: mongoose.mongo.Db, file: string) {
  const dump: Dump = { database: db.databaseName, exportedAt: new Date().toISOString(), collections: {} };
  const collections = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((name) => !name.startsWith('system.'))
    .sort();
  for (const name of collections) {
    dump.collections[name] = await db.collection(name).find().toArray();
    console.log(`  ${name}: ${dump.collections[name].length}`);
  }
  fs.writeFileSync(file, EJSON.stringify(dump, { relaxed: false }));
  console.log(`Wrote ${file}`);
}

async function importDb(db: mongoose.mongo.Db, file: string, replace: boolean) {
  const dump = EJSON.parse(fs.readFileSync(file, 'utf8'), { relaxed: false }) as Dump;
  console.log(`Dump of "${dump.database}" taken ${dump.exportedAt}`);

  const entries = Object.entries(dump.collections);
  const occupied: string[] = [];
  for (const [name, docs] of entries) {
    if (docs.length && (await db.collection(name).estimatedDocumentCount()) > 0) occupied.push(name);
  }
  if (occupied.length && !replace) {
    console.error(`These collections already have data: ${occupied.join(', ')}. Re-run with --replace to overwrite them.`);
    process.exitCode = 1;
    return;
  }

  for (const [name, docs] of entries) {
    const col = db.collection(name);
    // deleteMany keeps the collection's indexes; the app recreates any missing ones on start.
    if (replace) await col.deleteMany({});
    if (docs.length) await col.insertMany(docs, { ordered: false });
    console.log(`  ${name}: ${docs.length}`);
  }
  console.log('Import finished. Restart the backend so it rebuilds any indexes.');
}

async function main() {
  const [mode, file] = process.argv.slice(2);
  const replace = process.argv.includes('--replace');
  if (!['export', 'import'].includes(mode) || !file) {
    console.error('Usage: db-transfer <export|import> <file.json> [--replace]');
    process.exit(1);
  }

  const uri = process.env.DATABASE_URL || 'mongodb://localhost:27017/legislative_tracking';
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  console.log(`Connected to database "${db.databaseName}"`);
  try {
    if (mode === 'export') await exportDb(db, file);
    else await importDb(db, file, replace);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('Transfer failed:', err?.message || err);
  process.exit(1);
});
