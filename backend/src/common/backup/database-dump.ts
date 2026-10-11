import mongoose from 'mongoose';

const { EJSON } = mongoose.mongo.BSON;

export interface Dump {
  database: string;
  exportedAt: string;
  collections: Record<string, any[]>;
}

// Every collection of the database as one Extended JSON document, so ObjectIds and dates
// survive the trip. Read back by `db-transfer import`.
export async function dumpDatabase(db: mongoose.mongo.Db): Promise<Dump> {
  const dump: Dump = { database: db.databaseName, exportedAt: new Date().toISOString(), collections: {} };
  const collections = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((name) => !name.startsWith('system.'))
    .sort();
  for (const name of collections) {
    dump.collections[name] = await db.collection(name).find().toArray();
  }
  return dump;
}

export function serializeDump(dump: Dump) {
  return EJSON.stringify(dump, { relaxed: false });
}

export function parseDump(json: string) {
  return EJSON.parse(json, { relaxed: false }) as Dump;
}
