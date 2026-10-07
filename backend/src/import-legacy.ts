import * as dotenv from 'dotenv';
import * as mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import * as path from 'path';

dotenv.config();
import { LegislativeDocumentSchema } from './legislation/schemas/legislative-document.schema';
import { UserSchema } from './users/schemas/user.schema';

const DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/legislative_tracking';
const HOME = process.env.USERPROFILE || process.env.HOME || '';
const RESOLUTIONS_FILE = path.join(HOME, 'Downloads', 'Scanned 2026.xls');
const APPRO_FILE = path.join(HOME, 'Downloads', 'Scanned Appropriation Ordinance 2026.xls');
const ORDINANCES_FILE = path.join(HOME, 'Downloads', 'Ordinances July 2025-June 2026.xls');

function parseDate(v: any): Date | null {
  if (v === null || v === undefined || v === '' || v === '-' || v === ' ') return null;
  if (typeof v === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return new Date(Date.UTC(d.y, d.m - 1, d.d));
  }
  const s = String(v).trim();
  if (!s) return null;
  const parsed = new Date(s);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

function str(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === '-') return null;
  return s;
}

function yearFromDateOrFallback(d: Date | null, fallback: number): number {
  return d ? d.getUTCFullYear() : fallback;
}

async function main() {
  await mongoose.connect(DATABASE_URL);
  console.log('Connected to', DATABASE_URL);

  const User = mongoose.model('User', UserSchema);
  const LegislativeDocument = mongoose.model('LegislativeDocument', LegislativeDocumentSchema);

  const admin = await User.findOne({ username: 'admin' });
  if (!admin) {
    throw new Error('Admin user not found — run the seed script first (npm run seed)');
  }
  const createdBy = admin._id;

  const resolutionsWb = XLSX.readFile(RESOLUTIONS_FILE);
  const resSheet = resolutionsWb.Sheets['all'];
  const resRows: any[][] = XLSX.utils.sheet_to_json(resSheet, { header: 1, defval: '' });
  // header row is index 2: Res. No. | Date Adopted/Approved | Classification | Title | Date approved by LCE | Sponsor | Status | Sector
  const resolutionDocs: any[] = [];
  for (let i = 3; i < resRows.length; i++) {
    const row = resRows[i];
    if (!row || row.every((c) => c === '' || c === undefined)) continue;
    const [no, dateAdopted, classification, title, dateApprovedByLCE, sponsor, status, sector] = row;
    if (no === '' || no === undefined) continue; // no document number = scan continuation artifact, not a real record
    const dAdopted = parseDate(dateAdopted);
    resolutionDocs.push({
      documentType: 'RESOLUTION',
      documentNumber: str(no) ?? String(no),
      year: yearFromDateOrFallback(dAdopted, 2026),
      title: str(title),
      classification: str(classification),
      status: str(status),
      remarks: null,
      dateAdopted: dAdopted,
      dateApprovedByLCE: parseDate(dateApprovedByLCE),
      sponsor: str(sponsor),
      sector: str(sector),
      onlineLink: null,
      documents: [],
      createdBy,
      updatedBy: null,
    });
  }

  const approWb = XLSX.readFile(APPRO_FILE);
  const approSheet = approWb.Sheets['Sheet1'];
  const approRows: any[][] = XLSX.utils.sheet_to_json(approSheet, { header: 1, defval: '' });
  // header row is index 4: Appro. Ord. No. | Date Enacted | Title | Date approved by LCE | Author | Date Enacted/Approved by SP | SP Res. No. | Status | Remarks | Online Link
  const approDocs: any[] = [];
  for (let i = 5; i < approRows.length; i++) {
    const row = approRows[i];
    if (!row || row.every((c) => c === '' || c === undefined)) continue;
    const [no, dateEnacted, title, dateApprovedByLCE, author, dateEnactedApprovedBySP, spResNo, status, remarks, onlineLink] = row;
    if (!title || str(title) === null) continue;
    const dEnacted = parseDate(dateEnacted);
    const numStr = str(no) ?? String(no);
    const yearMatch = numStr && numStr.match(/^(\d{4})/);
    approDocs.push({
      documentType: 'APPROPRIATION_ORDINANCE',
      documentNumber: numStr,
      year: yearMatch ? parseInt(yearMatch[1], 10) : yearFromDateOrFallback(dEnacted, 2026),
      title: str(title),
      classification: null,
      status: str(status),
      remarks: str(remarks),
      dateEnacted: dEnacted,
      dateApprovedByLCE: parseDate(dateApprovedByLCE),
      dateEnactedApprovedBySP: parseDate(dateEnactedApprovedBySP),
      author: str(author),
      spResolutionNumber: str(spResNo),
      onlineLink: str(onlineLink),
      documents: [],
      createdBy,
      updatedBy: null,
    });
  }

  const ordWb = XLSX.readFile(ORDINANCES_FILE);
  const ordSheet = ordWb.Sheets['Sheet1'];
  const ordRows: any[][] = XLSX.utils.sheet_to_json(ordSheet, { header: 1, defval: '' });
  // header row is index 4: Mun. Ord. No. | Date Enacted | Classification | Title | Date Approved by Mayor | Author | Date Enacted/Approved by SP | SP Res. No. | Status | Remarks
  const ordDocs: any[] = [];
  for (let i = 5; i < ordRows.length; i++) {
    const row = ordRows[i];
    if (!row || row.every((c) => c === '' || c === undefined)) continue;
    const [no, dateEnacted, classification, title, dateApprovedByLCERaw, author, dateEnactedApprovedBySP, spResNo, statusRaw, remarks] = row;
    if (no === '' || no === undefined) continue;
    const dEnacted = parseDate(dateEnacted);
    const dApprovedByLCE = parseDate(dateApprovedByLCERaw);
    // Some rows put free text (e.g. "Pending Referred to the Cmte. on Education") in the
    // "Date Approved by Mayor" column instead of Status when the ordinance has no approval date yet.
    const status = str(statusRaw) ?? (dApprovedByLCE === null ? str(dateApprovedByLCERaw) : null);
    const numStr = str(no) ?? String(no);
    const yearMatch = numStr && numStr.match(/(\d{4})/);
    ordDocs.push({
      documentType: 'ORDINANCE',
      documentNumber: numStr,
      year: yearMatch ? parseInt(yearMatch[1], 10) : yearFromDateOrFallback(dEnacted, 2026),
      title: str(title),
      classification: str(classification),
      status,
      remarks: str(remarks),
      dateEnacted: dEnacted,
      dateApprovedByLCE: dApprovedByLCE,
      dateEnactedApprovedBySP: parseDate(dateEnactedApprovedBySP),
      author: str(author),
      spResolutionNumber: spResNo !== '' && spResNo !== undefined ? String(spResNo) : null,
      onlineLink: null,
      documents: [],
      createdBy,
      updatedBy: null,
    });
  }

  console.log(`Parsed ${resolutionDocs.length} resolutions, ${approDocs.length} appropriation ordinances, ${ordDocs.length} ordinances.`);

  let inserted = 0;
  let skipped = 0;
  for (const doc of [...resolutionDocs, ...approDocs, ...ordDocs]) {
    const exists = await LegislativeDocument.findOne({
      documentType: doc.documentType,
      documentNumber: doc.documentNumber,
      year: doc.year,
    });
    if (exists) {
      skipped++;
      continue;
    }
    await LegislativeDocument.create(doc);
    inserted++;
  }

  console.log(`Inserted ${inserted} records, skipped ${skipped} duplicates.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
