"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import ProtectedShell from "../../components/layout/ProtectedShell";
import { apiClient } from "../../lib/api/client";
import { getUser } from "../../lib/auth";

export default function BackupPage() {
  if (getUser()?.role !== "ADMIN") {
    return (
      <ProtectedShell>
        <p className="text-sm text-red-600">You do not have permission to view this page.</p>
      </ProtectedShell>
    );
  }

  return (
    <ProtectedShell>
      <h1 className="mb-4 text-xl font-bold text-navy-900">Backup</h1>
      <div className="max-w-2xl space-y-4">
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-navy-900">Database backup</h2>
          <p className="mt-1 text-sm text-gray-600">
            Downloads every record, user account, document request and the activity log as one JSON file. Each
            download is recorded in the{" "}
            <Link href="/audit-logs" className="text-navy-700 hover:underline">
              activity log
            </Link>
            . Keep backups somewhere safe: they contain personal information and password hashes.
          </p>
          <a
            href={apiClient.fileUrl("/backup/database")}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900"
          >
            <Download className="h-4 w-4" /> Download database backup
          </a>
        </div>

        <div className="card p-6 text-sm text-gray-600">
          <h2 className="text-sm font-semibold text-navy-900">Restoring and uploaded files</h2>
          <p className="mt-1">
            The backup holds the database only. The uploaded PDFs live in the server&apos;s storage folder
            (<code className="font-mono text-xs">/mnt/legislative-tracking/storage</code>); copy that folder as well.
          </p>
          <p className="mt-2">To restore a backup on the server:</p>
          <pre className="mt-1 overflow-x-auto rounded-md bg-gray-50 p-3 font-mono text-xs text-navy-900">
            docker cp backup.json legislative-tracking-backend:/tmp/backup.json{"\n"}
            docker exec legislative-tracking-backend node dist/db-transfer.js import /tmp/backup.json --replace
          </pre>
        </div>
      </div>
    </ProtectedShell>
  );
}
