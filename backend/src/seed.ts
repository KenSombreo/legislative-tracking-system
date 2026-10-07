import * as mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { UserSchema } from './users/schemas/user.schema';

dotenv.config();

async function seed() {
  const uri = process.env.DATABASE_URL || 'mongodb://localhost:27017/legislative_tracking';
  console.log(`Connecting to ${uri} ...`);

  try {
    await mongoose.connect(uri);
  } catch (err: any) {
    console.error('Could not connect to MongoDB:', err?.message || err);
    process.exit(1);
  }

  const UserModel = mongoose.model('User', UserSchema);

  const existingAdminCount = await UserModel.countDocuments({ role: 'ADMIN' }).exec();
  if (existingAdminCount > 0) {
    console.log('An ADMIN user already exists. Skipping seed.');
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash('admin123', 10);
  await UserModel.create({
    fullName: 'System Administrator',
    username: 'admin',
    email: 'admin@example.com',
    passwordHash,
    role: 'ADMIN',
    isActive: true,
  });

  console.log('==============================================');
  console.log('Seeded ADMIN user:');
  console.log('  username: admin');
  console.log('  password: admin123');
  console.log('==============================================');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
