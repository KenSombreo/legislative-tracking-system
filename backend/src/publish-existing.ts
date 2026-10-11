// Releases already-enacted records to the public portal in one go. New records start hidden and
// are released one by one from their detail page; this is for the records that existed before the
// portal did. Only approved records that have an enactment, adoption or LCE approval date count.
//
//   npx ts-node src/publish-existing.ts            (shows how many would be released)
//   npx ts-node src/publish-existing.ts --apply
//   docker exec legislative-tracking-backend node dist/publish-existing.js --apply
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const apply = process.argv.includes('--apply');
  await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/legislative_tracking');
  const records = mongoose.connection.db!.collection('legislativedocuments');
  const filter = {
    isPublic: { $ne: true },
    approvalStatus: { $nin: ['PENDING', 'REJECTED'] },
    $or: [{ dateEnacted: { $ne: null } }, { dateAdopted: { $ne: null } }, { dateApprovedByLCE: { $ne: null } }],
  };
  try {
    const count = await records.countDocuments(filter);
    if (!apply) {
      console.log(`${count} enacted record(s) would be released. Re-run with --apply to release them.`);
      return;
    }
    const result = await records.updateMany(filter, { $set: { isPublic: true } });
    await mongoose.connection.db!.collection('auditlogs').insertOne({
      userId: null,
      action: 'PUBLISH',
      entityType: 'LegislativeDocument',
      entityId: null,
      description: `Bulk-released ${result.modifiedCount} enacted record(s) to the public portal`,
      changes: {},
      createdAt: new Date(),
    });
    console.log(`Released ${result.modifiedCount} record(s).`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('Failed:', err?.message || err);
  process.exit(1);
});
